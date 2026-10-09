import { PDFDocument } from "pdf-lib";

// ============================================================
// MÓDULO CENTRAL DE COMPRESIÓN DE ARCHIVOS (IMÁGENES Y PDFS)
// Inmobiliaria Conté - Servicio Unificado de Optimización
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
  formatoSalida?: "image/jpeg" | "image/webp";
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
// COMPRESIÓN DE IMÁGENES (Canvas API)
// ------------------------------------------------------------

export async function comprimirImagen(
  file: File,
  opciones?: OpcionesCompresionImagen
): Promise<ResultadoCompresion> {
  const {
    maxDimension = 1600,
    calidad = 0.78,
    formatoSalida = "image/jpeg",
    fondoBlanco = true,
  } = opciones || {};

  // Si no es un archivo de imagen, devolver el archivo intacto
  if (!file.type.startsWith("image/")) {
    return {
      file,
      pesoOriginal: file.size,
      pesoFinal: file.size,
      ahorroPct: 0,
    };
  }

  // Verificación de entorno de navegador (Canvas)
  if (typeof window === "undefined" || !window.document) {
    return {
      file,
      pesoOriginal: file.size,
      pesoFinal: file.size,
      ahorroPct: 0,
    };
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve({
          file,
          pesoOriginal: file.size,
          pesoFinal: file.size,
          ahorroPct: 0,
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (fondoBlanco) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              pesoOriginal: file.size,
              pesoFinal: file.size,
              ahorroPct: 0,
            });
            return;
          }

          // Si el archivo comprimido resulta más pesado que el original, mantenemos el original
          const usarComprimido = blob.size < file.size;
          const extension = formatoSalida === "image/webp" ? "webp" : "jpg";
          const nombreBase = file.name.replace(/\.[^.]+$/, "");
          const archivoFinal = usarComprimido
            ? new File([blob], `${nombreBase}.${extension}`, { type: formatoSalida })
            : file;

          const pesoOriginal = file.size;
          const pesoFinal = archivoFinal.size;
          const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / pesoOriginal) * 100));

          resolve({
            file: archivoFinal,
            pesoOriginal,
            pesoFinal,
            ahorroPct,
          });
        },
        formatoSalida,
        calidad
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        file,
        pesoOriginal: file.size,
        pesoFinal: file.size,
        ahorroPct: 0,
      });
    };

    img.src = url;
  });
}

// Procesa una lista de imágenes en paralelo
export async function comprimirImagenes(
  archivos: File[],
  opciones?: OpcionesCompresionImagen
): Promise<ResultadoCompresion[]> {
  return Promise.all(archivos.map((archivo) => comprimirImagen(archivo, opciones)));
}

// ------------------------------------------------------------
// COMPRESIÓN DE DOCUMENTOS Y PDFS
// ------------------------------------------------------------

const PDF_JPEG_QUALITY = 0.72;
const PDF_RENDER_SCALE = 1.5;
const MAX_PAGINAS_RASTERIZAR = 40;
const UMBRAL_DENSIDAD_ESCANEO = 120 * 1024;

async function comprimirImagenCanvasInterno(
  fileOBlob: File | Blob,
  maxDim = 1400,
  quality = 0.72
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fileOBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ blob: fileOBlob, width: img.width, height: img.height });
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ blob: fileOBlob, width: img.width, height: img.height });
            return;
          }
          resolve({ blob, width, height });
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: fileOBlob, width: 0, height: 0 });
    };

    img.src = url;
  });
}

// Optimización estructural nativa de PDF con pdf-lib (ultra rápida)
async function optimizarConPdfLib(archivo: File): Promise<File> {
  const arrayBuffer = await archivo.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const nombreBase = archivo.name.replace(/\.[^.]+$/, "");
  return new File([bytes.buffer as ArrayBuffer], `${nombreBase}-optimizado.pdf`, {
    type: "application/pdf",
  });
}

// Render-to-compress por Canvas para PDFs escaneados pesados
async function renderPdfAJpegsYReensamblar(
  archivo: File,
  numPaginas: number,
  pdfDocument: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  onProgreso?: CallbackProgreso,
  signal?: AbortSignal
): Promise<File> {
  const pdfSalida = await PDFDocument.create();

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
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    }).promise;

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", PDF_JPEG_QUALITY);
    });

    if (!jpegBlob) continue;

    const jpegBuffer = await jpegBlob.arrayBuffer();
    const embeddedJpeg = await pdfSalida.embedJpg(jpegBuffer);

    const pagina = pdfSalida.addPage([viewport.width, viewport.height]);
    pagina.drawImage(embeddedJpeg, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
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

  return new File([bytes.buffer as ArrayBuffer], `${nombreBase}-comprimido.pdf`, {
    type: "application/pdf",
  });
}

// Convierte fotos de páginas en un único PDF comprimido
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

    const { blob, width, height } = await comprimirImagenCanvasInterno(archivo, 1400, PDF_JPEG_QUALITY);
    const buffer = await blob.arrayBuffer();
    const embeddedImg = await pdfDoc.embedJpg(buffer);

    const LETTER_W = 612;
    const LETTER_H = 792;
    const scale = Math.min(LETTER_W / width, LETTER_H / height);

    const pagina = pdfDoc.addPage([LETTER_W, LETTER_H]);
    pagina.drawImage(embeddedImg, {
      x: (LETTER_W - width * scale) / 2,
      y: (LETTER_H - height * scale) / 2,
      width: width * scale,
      height: height * scale,
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

  return new File([pdfBytes.buffer as ArrayBuffer], "contrato-firmado-comprimido.pdf", {
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

  if (sonImagenes) {
    const pdfComprimido = await convertirImagenesAPdfComprimido(archivos, onProgreso, signal);
    const pesoFinal = pdfComprimido.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / pesoOriginalTotal) * 100));
    return { file: pdfComprimido, pesoOriginal: pesoOriginalTotal, pesoFinal, ahorroPct };
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDocument: any = null;

  try {
    pdfDocument = await Promise.race([loadingTask.promise, timeoutPromise]);
    numPaginas = pdfDocument.numPages;
  } catch {
    const pdfFallback = await optimizarConPdfLib(primerArchivo);
    return {
      file: pdfFallback,
      pesoOriginal: primerArchivo.size,
      pesoFinal: pdfFallback.size,
      ahorroPct: Math.max(0, Math.round((1 - pdfFallback.size / primerArchivo.size) * 100)),
    };
  }

  if (signal?.aborted) {
    throw new Error("Compresión cancelada por el usuario.");
  }

  if (numPaginas > 100) {
    throw new Error(
      `El documento seleccionado tiene ${numPaginas} páginas. Los contratos de arrendamiento no deben superar las 100 páginas. Por favor sube únicamente el contrato de este espacio.`
    );
  }

  const bytesPorPagina = primerArchivo.size / numPaginas;
  const debeRasterizar =
    numPaginas <= MAX_PAGINAS_RASTERIZAR && bytesPorPagina >= UMBRAL_DENSIDAD_ESCANEO;

  if (!debeRasterizar) {
    onProgreso?.({
      porcentaje: 45,
      etapa: `Documento vectorial (${numPaginas} págs). Aplicando optimización estructural rápida...`,
      paginaActual: numPaginas,
      totalPaginas: numPaginas,
    });

    const pdfOptimizado = await optimizarConPdfLib(primerArchivo);

    onProgreso?.({
      porcentaje: 100,
      etapa: "Documento optimizado exitosamente.",
      paginaActual: numPaginas,
      totalPaginas: numPaginas,
    });

    const pesoFinal = Math.min(pdfOptimizado.size, primerArchivo.size);
    const archivoFinal = pesoFinal < primerArchivo.size ? pdfOptimizado : primerArchivo;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));

    return {
      file: archivoFinal,
      pesoOriginal: primerArchivo.size,
      pesoFinal,
      ahorroPct,
    };
  }

  try {
    const pdfComprimido = await renderPdfAJpegsYReensamblar(
      primerArchivo,
      numPaginas,
      pdfDocument,
      onProgreso,
      signal
    );
    const pesoFinal = pdfComprimido.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));
    return { file: pdfComprimido, pesoOriginal: primerArchivo.size, pesoFinal, ahorroPct };
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn("[file-compressor] Fallback a optimización estructural:", err);
    const pdfFallback = await optimizarConPdfLib(primerArchivo);
    const pesoFinal = pdfFallback.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));
    return { file: pdfFallback, pesoOriginal: primerArchivo.size, pesoFinal, ahorroPct };
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
