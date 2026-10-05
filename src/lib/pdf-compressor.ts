import { PDFDocument } from "pdf-lib";

// ============================================================
// MÓDULO DE COMPRESIÓN INTELIGENTE Y ADAPTATIVA DE CONTRATOS
//
// Heurística de selección:
// 1. Escáneres/Fotos pesadas (<= 40 págs, > 120 KB/pág):
//    Rasterizado a JPEG por Canvas (ahorro 80% - 95%).
// 2. Documentos extensos o texto vectorial (> 40 págs o < 120 KB/pág):
//    Optimización estructural con pdf-lib (ultra rápida, ~1s,
//    evita inflar el archivo convirtiendo texto a imágenes).
// 3. Documentos fuera de rango contractual (> 100 págs):
//    Alerta preventiva al usuario.
// ============================================================

export interface ResultadoCompresion {
  file: File;
  pesoOriginal: number;
  pesoFinal: number;
  ahorroPct: number;
}

export interface ProgresoCompresion {
  porcentaje: number;
  etapa: string;
  paginaActual?: number;
  totalPaginas?: number;
}

export type CallbackProgreso = (progreso: ProgresoCompresion) => void;

// Calidad base de compresión JPEG para páginas renderizadas
const JPEG_QUALITY = 0.72;
// Escala de renderizado (1.5 = 108 DPI, buen balance nitidez/peso)
const RENDER_SCALE = 1.5;
// Límite de páginas para aplicar render-to-compress sin saturar la memoria
const MAX_PAGINAS_RASTERIZAR = 40;
// Umbral de densidad (bytes por página) para detectar si son imágenes escaneadas
const UMBRAL_DENSIDAD_ESCANEO = 120 * 1024; // 120 KB por página

// Comprime una imagen individual (JPG/PNG) usando Canvas API
async function comprimirImagenCanvas(
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

// Optimización estructural nativa de PDF con pdf-lib (ultra rápida, ideal para texto y muchas páginas)
async function optimizarConPdfLib(archivo: File): Promise<File> {
  const arrayBuffer = await archivo.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const nombreBase = archivo.name.replace(/\.[^.]+$/, "");
  return new File([bytes.buffer as ArrayBuffer], `${nombreBase}-optimizado.pdf`, {
    type: "application/pdf",
  });
}

// Render-to-compress por Canvas (para contratos escaneados de longitud normal)
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
    const viewport = page.getViewport({ scale: RENDER_SCALE });

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
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
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

// Convierte fotos de páginas (JPG/PNG) en un único PDF comprimido
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

    const { blob, width, height } = await comprimirImagenCanvas(archivo, 1400, JPEG_QUALITY);
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

// ---------------------------------------------------------------
// Punto de entrada principal: Compresión Adaptativa
// ---------------------------------------------------------------
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

  // Inspeccionar el documento con pdf.js
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
    // Si falla la inspección con pdf.js, usar fallback estructural inmediato
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

  // Validación de seguridad para contratos inmobiliarios
  if (numPaginas > 100) {
    throw new Error(
      `El documento seleccionado tiene ${numPaginas} páginas. Los contratos de arrendamiento no deben superar las 100 páginas. Por favor sube únicamente el contrato de este espacio.`
    );
  }

  const bytesPorPagina = primerArchivo.size / numPaginas;

  // DECISIÓN ADAPTATIVA:
  // Si tiene muchas páginas (> 40) o su densidad es baja (< 120 KB/pág), es texto vectorial.
  // Rasterizarlo a JPEG lo inflaría drásticamente. Debe optimizarse estructuralmente en 1 segundo.
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

  // Si tiene <= 40 páginas y alta densidad (escaneos pesados): raster-to-compress por Canvas
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
    console.warn("[pdf-compressor] Fallback a optimización estructural:", err);
    const pdfFallback = await optimizarConPdfLib(primerArchivo);
    const pesoFinal = pdfFallback.size;
    const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / primerArchivo.size) * 100));
    return { file: pdfFallback, pesoOriginal: primerArchivo.size, pesoFinal, ahorroPct };
  }
}
