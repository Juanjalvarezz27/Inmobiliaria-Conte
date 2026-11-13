import { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";

// ============================================================
// MÓDULO CENTRAL DE COMPRESIÓN DE ARCHIVOS (IMÁGENES Y PDFS)
// Inmobiliaria Conté - Servicio Unificado de Optimización V2
// ============================================================

export interface ResultadoCompresion {
  file: File;
  pesoOriginal: number;
  pesoFinal: number;
  ahorroPct: number;
}

export interface OpcionesCompresionImagen {
  maxDimension?: number;
  calidad?: number;
  pesoMaximoKB?: number;
  formatoSalida?: "image/webp" | "image/jpeg";
  fondoBlanco?: boolean;
}

export interface ProgresoCompresion {
  porcentaje: number;
  etapa: string;
  paginaActual?: number;
  totalPaginas?: number;
}

export type CallbackProgreso = (progreso: ProgresoCompresion) => void;

// Formatea tamaños de archivo de bytes a KB o MB
export function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ------------------------------------------------------------
// MOTOR INTERNO DE CANVAS OPTIMIZADO (Reutilizable y sin fugas)
// ------------------------------------------------------------

async function decodificarImagen(fuente: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(fuente);
    } catch {
      // Fallback a HTMLImageElement si falla createImageBitmap
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fuente);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function obtenerDimensionesFuente(fuente: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  const w = "naturalWidth" in fuente ? fuente.naturalWidth || fuente.width : fuente.width;
  const h = "naturalHeight" in fuente ? fuente.naturalHeight || fuente.height : fuente.height;
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

function calcularDimensiones(width: number, height: number, maxDim: number) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  if (width >= height) {
    return { width: maxDim, height: Math.max(1, Math.round((height * maxDim) / width)) };
  }
  return { width: Math.max(1, Math.round((width * maxDim) / height)), height: maxDim };
}

function canvasABlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback mediante DataURL para compatibilidad universal
            try {
              const dataUrl = canvas.toDataURL(tipo, calidad);
              const parts = dataUrl.split(",");
              const byteString = atob(parts[1]);
              const mimeString = parts[0].split(":")[1].split(";")[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve(new Blob([ab], { type: mimeString }));
            } catch {
              resolve(null);
            }
          }
        },
        tipo,
        calidad
      );
    } catch {
      resolve(null);
    }
  });
}

// ------------------------------------------------------------
// COMPRESIÓN DE IMÁGENES (WebP por defecto + Ajuste por Peso)
// ------------------------------------------------------------

export async function comprimirImagen(
  file: File,
  opciones?: OpcionesCompresionImagen
): Promise<ResultadoCompresion> {
  const {
    maxDimension = 1600,
    calidad = 0.78,
    pesoMaximoKB = 350,
    formatoSalida = "image/webp",
    fondoBlanco = false,
  } = opciones || {};

  if (!file.type.startsWith("image/") || typeof window === "undefined" || !window.document) {
    return { file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 };
  }

  try {
    const fuente = await decodificarImagen(file);
    const { width: origW, height: origH } = obtenerDimensionesFuente(fuente);
    const { width, height } = calcularDimensiones(origW, origH, maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: !fondoBlanco && formatoSalida === "image/webp" });

    if (!ctx) {
      if ("close" in fuente) fuente.close();
      return { file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (fondoBlanco || formatoSalida === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(fuente, 0, 0, width, height);
    if ("close" in fuente) fuente.close();

    // Compresión adaptativa: Si supera pesoMaximoKB, reduce gradualmente la calidad
    let calidadActual = calidad;
    let blob = await canvasABlob(canvas, formatoSalida, calidadActual);

    const limiteBytes = pesoMaximoKB * 1024;
    while (blob && blob.size > limiteBytes && calidadActual > 0.52) {
      calidadActual = Number((calidadActual - 0.1).toFixed(2));
      blob = await canvasABlob(canvas, formatoSalida, calidadActual);
    }

    canvas.width = 0;
    canvas.height = 0;

    if (!blob || blob.size >= file.size) {
      return { file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 };
    }

    const tipoReal = blob.type || formatoSalida;
    const extension = tipoReal.includes("webp") ? "webp" : tipoReal.includes("png") ? "png" : "jpg";
    const nombreBase = file.name.replace(/\.[^.]+$/, "");
    const archivoFinal = new File([blob], `${nombreBase}.${extension}`, { type: tipoReal });

    const pesoOriginal = file.size;
    const pesoFinal = archivoFinal.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / pesoOriginal) * 100));

    return { file: archivoFinal, pesoOriginal, pesoFinal, ahorroPct };
  } catch {
    return { file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 };
  }
}

export async function comprimirImagenes(
  archivos: File[],
  opciones?: OpcionesCompresionImagen
): Promise<ResultadoCompresion[]> {
  return Promise.all(archivos.map((archivo) => comprimirImagen(archivo, opciones)));
}

// ------------------------------------------------------------
// COMPRESIÓN DE DOCUMENTOS Y PDFS
// ------------------------------------------------------------

const PDF_JPEG_QUALITY = 0.62;
const PDF_RENDER_SCALE = 1.35;
const MAX_PAGINAS_RASTERIZAR = 50;
const UMBRAL_DENSIDAD_ESCANEO = 95 * 1024;

async function comprimirImagenParaPdf(
  fileOBlob: File | Blob,
  maxDim = 1350,
  quality = PDF_JPEG_QUALITY
): Promise<{ blob: Blob; width: number; height: number }> {
  const fuente = await decodificarImagen(fileOBlob);
  const { width: origW, height: origH } = obtenerDimensionesFuente(fuente);
  const { width, height } = calcularDimensiones(origW, origH, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    if ("close" in fuente) fuente.close();
    return { blob: fileOBlob, width: origW, height: origH };
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Mejora de contraste para textos escaneados con tolerancia ante navegadores sin soporte de filtro
  try {
    ctx.filter = "contrast(1.08) saturate(0.15)";
    ctx.drawImage(fuente, 0, 0, width, height);
    ctx.filter = "none";
  } catch {
    ctx.drawImage(fuente, 0, 0, width, height);
  }

  if ("close" in fuente) fuente.close();

  const blob = await canvasABlob(canvas, "image/jpeg", quality);
  canvas.width = 0;
  canvas.height = 0;

  return { blob: blob || fileOBlob, width, height };
}

// Optimización estructural nativa de PDF con pdf-lib
async function optimizarConPdfLib(archivo: File): Promise<File> {
  const arrayBuffer = await archivo.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const nombreBase = archivo.name.replace(/\.[^.]+$/, "");
  return new File([bytes as unknown as BlobPart], `${nombreBase}-optimizado.pdf`, {
    type: "application/pdf",
  });
}

// Render-to-compress por Canvas reciclando un único lienzo en RAM
async function renderPdfAJpegsYReensamblar(
  archivo: File,
  numPaginas: number,
  pdfDocument: PDFDocumentProxy,
  onProgreso?: CallbackProgreso,
  signal?: AbortSignal
): Promise<File> {
  const pdfSalida = await PDFDocument.create();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });

  if (!ctx) throw new Error("No se pudo inicializar el contexto gráfico 2D.");

  try {
    for (let numPagina = 1; numPagina <= numPaginas; numPagina++) {
      if (signal?.aborted) {
        throw new Error("Compresión cancelada por el usuario.");
      }

      const progresoBase = Math.round(10 + ((numPagina - 1) / numPaginas) * 80);
      onProgreso?.({
        porcentaje: progresoBase,
        etapa: `Optimizando página ${numPagina} de ${numPaginas}...`,
        paginaActual: numPagina,
        totalPaginas: numPaginas,
      });

      const page = await pdfDocument.getPage(numPagina);
      const viewportOriginal = page.getViewport({ scale: 1.0 });
      const viewportRender = page.getViewport({ scale: PDF_RENDER_SCALE });

      canvas.width = Math.floor(viewportRender.width);
      canvas.height = Math.floor(viewportRender.height);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: viewportRender,
        canvas,
      }).promise;

      // Liberar memoria interna de PDF.js para esta página
      try {
        page.cleanup();
      } catch {
        // Ignorar fallos no críticos de limpieza
      }

      const jpegBlob = await canvasABlob(canvas, "image/jpeg", PDF_JPEG_QUALITY);
      if (!jpegBlob) continue;

      const jpegBuffer = await jpegBlob.arrayBuffer();
      const embeddedJpeg = await pdfSalida.embedJpg(jpegBuffer);

      // Conservamos el tamaño físico real usando viewportOriginal
      const pagina = pdfSalida.addPage([viewportOriginal.width, viewportOriginal.height]);
      pagina.drawImage(embeddedJpeg, {
        x: 0,
        y: 0,
        width: viewportOriginal.width,
        height: viewportOriginal.height,
      });
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }

  if (pdfSalida.getPageCount() === 0) {
    throw new Error("No se pudo procesar ninguna página del documento.");
  }

  onProgreso?.({
    porcentaje: 95,
    etapa: "Reensamblando archivo final optimizado...",
    paginaActual: numPaginas,
    totalPaginas: numPaginas,
  });

  const bytes = await pdfSalida.save({ useObjectStreams: true });
  const nombreBase = archivo.name.replace(/\.[^.]+$/, "");

  onProgreso?.({
    porcentaje: 100,
    etapa: "¡Compresión completada con éxito!",
    paginaActual: numPaginas,
    totalPaginas: numPaginas,
  });

  return new File([bytes as unknown as BlobPart], `${nombreBase}-comprimido.pdf`, {
    type: "application/pdf",
  });
}

// Convierte fotos de páginas en un único PDF comprimido con orientación adaptativa
async function convertirImagenesAPdfComprimido(
  archivos: File[],
  onProgreso?: CallbackProgreso,
  signal?: AbortSignal
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const total = archivos.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new Error("Compresión cancelada por el usuario.");
    }

    const archivo = archivos[i];
    const pct = Math.round(10 + (i / total) * 80);
    onProgreso?.({
      porcentaje: pct,
      etapa: `Optimizando imagen ${i + 1} de ${total}...`,
      paginaActual: i + 1,
      totalPaginas: total,
    });

    const { blob, width, height } = await comprimirImagenParaPdf(archivo, 1350, PDF_JPEG_QUALITY);
    const buffer = await blob.arrayBuffer();
    const embeddedImg = await pdfDoc.embedJpg(buffer);

    // Orientación inteligente (Carta vertical 612x792 o apaisada 792x612 según la foto)
    const esHorizontal = width > height;
    const pageW = esHorizontal ? 792 : 612;
    const pageH = esHorizontal ? 612 : 792;
    const scale = Math.min(pageW / width, pageH / height);
    const drawW = width * scale;
    const drawH = height * scale;

    const pagina = pdfDoc.addPage([pageW, pageH]);
    pagina.drawImage(embeddedImg, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  onProgreso?.({
    porcentaje: 95,
    etapa: "Generando documento PDF consolidado...",
    paginaActual: total,
    totalPaginas: total,
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  onProgreso?.({
    porcentaje: 100,
    etapa: "¡Documento listo!",
    paginaActual: total,
    totalPaginas: total,
  });

  const baseNombre = archivos[0]?.name ? archivos[0].name.replace(/\.[^.]+$/, "") : "contrato-firmado";

  return new File([pdfBytes as unknown as BlobPart], `${baseNombre}-comprimido.pdf`, {
    type: "application/pdf",
  });
}

// Compresión adaptativa e inteligente de contratos y documentos PDF
export async function comprimirDocumentoContrato(
  archivosInput: FileList | File[],
  onProgreso?: CallbackProgreso,
  signal?: AbortSignal
): Promise<ResultadoCompresion> {
  const archivos = Array.from(archivosInput);
  if (archivos.length === 0) {
    throw new Error("No se seleccionó ningún archivo para procesar.");
  }

  const pesoOriginalTotal = archivos.reduce((acc, f) => acc + f.size, 0);
  const sonImagenes = archivos.every((f) => f.type.startsWith("image/"));
  const sonPdf = archivos.every(
    (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
  );

  // Validación de tipo mixto o formato no admitido
  if (!sonImagenes && !sonPdf) {
    throw new Error(
      "No se permite combinar archivos PDF e imágenes en la misma carga. Selecciona únicamente un PDF o únicamente imágenes."
    );
  }

  if (sonImagenes) {
    const pdfComprimido = await convertirImagenesAPdfComprimido(archivos, onProgreso, signal);
    const pesoFinal = pdfComprimido.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / pesoOriginalTotal) * 100));
    return { file: pdfComprimido, pesoOriginal: pesoOriginalTotal, pesoFinal, ahorroPct };
  }

  if (archivos.length > 1) {
    throw new Error(
      "Solo puedes subir un único archivo PDF para el contrato. Si deseas anexar varias hojas por separado, cárgalas como fotografías."
    );
  }

  const primerArchivo = archivos[0];

  onProgreso?.({
    porcentaje: 5,
    etapa: "Analizando estructura del documento...",
    paginaActual: 0,
    totalPaginas: 0,
  });

  const pdfjsLib = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await primerArchivo.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Tiempo de espera agotado al inicializar el PDF")), 10000);
  });

  let numPaginas = 1;
  let pdfDocument: PDFDocumentProxy | null = null;

  try {
    pdfDocument = await Promise.race([loadingTask.promise, timeoutPromise]);
    numPaginas = Math.max(1, pdfDocument.numPages || 1);
  } catch {
    try {
      const pdfFallback = await optimizarConPdfLib(primerArchivo);
      const archivoFinal = pdfFallback.size < primerArchivo.size ? pdfFallback : primerArchivo;
      return {
        file: archivoFinal,
        pesoOriginal: primerArchivo.size,
        pesoFinal: archivoFinal.size,
        ahorroPct: Math.max(0, Math.round((1 - archivoFinal.size / primerArchivo.size) * 100)),
      };
    } catch {
      return { file: primerArchivo, pesoOriginal: primerArchivo.size, pesoFinal: primerArchivo.size, ahorroPct: 0 };
    }
  }

  if (signal?.aborted) {
    try {
      await pdfDocument.cleanup();
    } catch {
      // Ignorar fallo al destruir tras abort
    }
    throw new Error("Compresión cancelada por el usuario.");
  }

  if (numPaginas > 100) {
    try {
      await pdfDocument.cleanup();
    } catch {
      // Ignorar fallo al destruir
    }
    throw new Error(
      `El documento seleccionado tiene ${numPaginas} páginas. Los contratos de arrendamiento o trabajo no deben superar las 100 páginas. Por favor sube únicamente el contrato de este espacio.`
    );
  }

  const bytesPorPagina = primerArchivo.size / numPaginas;
  const debeRasterizar =
    numPaginas <= MAX_PAGINAS_RASTERIZAR && bytesPorPagina >= UMBRAL_DENSIDAD_ESCANEO;

  if (!debeRasterizar) {
    try {
      await pdfDocument.cleanup();
    } catch {
      // Ignorar fallo de cierre
    }
    onProgreso?.({
      porcentaje: 45,
      etapa: `Documento ligero (${numPaginas} págs). Aplicando optimización estructural...`,
      paginaActual: numPaginas,
      totalPaginas: numPaginas,
    });

    try {
      const pdfOptimizado = await optimizarConPdfLib(primerArchivo);

      onProgreso?.({
        porcentaje: 100,
        etapa: "Documento optimizado exitosamente.",
        paginaActual: numPaginas,
        totalPaginas: numPaginas,
      });

      const archivoFinal = pdfOptimizado.size < primerArchivo.size ? pdfOptimizado : primerArchivo;
      const pesoFinal = archivoFinal.size;
      const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));

      return {
        file: archivoFinal,
        pesoOriginal: primerArchivo.size,
        pesoFinal,
        ahorroPct,
      };
    } catch {
      return { file: primerArchivo, pesoOriginal: primerArchivo.size, pesoFinal: primerArchivo.size, ahorroPct: 0 };
    }
  }

  try {
    const pdfComprimido = await renderPdfAJpegsYReensamblar(
      primerArchivo,
      numPaginas,
      pdfDocument,
      onProgreso,
      signal
    );
    try {
      await pdfDocument.cleanup();
    } catch {
      // Ignorar fallo
    }

    // Salvaguarda: Nunca devolver un PDF más pesado que el original
    const archivoFinal = pdfComprimido.size < primerArchivo.size ? pdfComprimido : primerArchivo;
    const pesoFinal = archivoFinal.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));

    return { file: archivoFinal, pesoOriginal: primerArchivo.size, pesoFinal, ahorroPct };
  } catch (err) {
    try {
      await pdfDocument.cleanup();
    } catch {
      // Ignorar fallo
    }
    if (signal?.aborted) throw err;
    console.warn("[file-compressor] Fallback a optimización estructural:", err);
    try {
      const pdfFallback = await optimizarConPdfLib(primerArchivo);
      const archivoFinal = pdfFallback.size < primerArchivo.size ? pdfFallback : primerArchivo;
      const pesoFinal = archivoFinal.size;
      const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));
      return { file: archivoFinal, pesoOriginal: primerArchivo.size, pesoFinal, ahorroPct };
    } catch {
      return { file: primerArchivo, pesoOriginal: primerArchivo.size, pesoFinal: primerArchivo.size, ahorroPct: 0 };
    }
  }
}

// ------------------------------------------------------------
// FUNCIÓN POLIMÓRFICA UNIVERSAL: Detecta automáticamente el tipo
// ------------------------------------------------------------

export async function comprimirArchivo(
  archivo: File,
  onProgreso?: CallbackProgreso,
  signal?: AbortSignal
): Promise<ResultadoCompresion> {
  if (archivo.type === "application/pdf") {
    return comprimirDocumentoContrato([archivo], onProgreso, signal);
  }
  if (archivo.type.startsWith("image/")) {
    return comprimirImagen(archivo);
  }
  return {
    file: archivo,
    pesoOriginal: archivo.size,
    pesoFinal: archivo.size,
    ahorroPct: 0,
  };
}
