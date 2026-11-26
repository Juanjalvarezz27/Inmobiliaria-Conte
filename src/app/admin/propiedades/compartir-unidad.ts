import { TIPO_UNIDAD_LABEL, formatCurrency } from "./constants";
import type { UnidadConPropiedad } from "./types";

const FETCH_TIMEOUT_MS = 6000;

// Construye el mensaje comercial formateado para WhatsApp sin emojis
export function generarMensajeFichaUnidad(
  unidad: UnidadConPropiedad,
  direccionPropiedad?: string | null
): string {
  const tipoLabel = TIPO_UNIDAD_LABEL[unidad.tipo] || unidad.tipo;
  const ubicacion = direccionPropiedad
    ? `${unidad.propiedad.nombre} — ${direccionPropiedad}, ${unidad.propiedad.ciudad}`
    : `${unidad.propiedad.nombre} (${unidad.propiedad.ciudad})`;

  const lineas: string[] = [
    `*${tipoLabel} Disponible: ${unidad.codigo}*`,
    `*Ubicación:* ${ubicacion}`,
  ];

  if (unidad.piso) {
    lineas.push(`*Nivel / Piso:* ${unidad.piso}`);
  }
  if (unidad.areaMt2) {
    lineas.push(`*Área aproximada:* ${unidad.areaMt2} m²`);
  }

  const precio = unidad.precioAlquiler
    ? `${formatCurrency(unidad.precioAlquiler)} / mes`
    : "Consultar";
  lineas.push(`*Canon mensual:* ${precio}`);

  if (unidad.descripcion?.trim()) {
    lineas.push("", unidad.descripcion.trim());
  }

  lineas.push(
    "",
    "*Disponible para entrega inmediata.*",
    "Responde a este mensaje para coordinar una visita o recibir más información."
  );

  return lineas.join("\n");
}

// Descarga una imagen remota directa desde CDN con timeout controlado
export async function descargarBlobFoto(url: string): Promise<Blob | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

// Convierte un Blob de imagen al formato destino usando Canvas
async function renderBlobAFormato(
  blob: Blob,
  mimeType: "image/jpeg" | "image/png",
  quality?: number
): Promise<Blob | null> {
  if (blob.type === mimeType) return blob;

  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;

  try {
    let width = 0;
    let height = 0;
    let fuente: CanvasImageSource;

    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
      fuente = bitmap;
    } else {
      objectUrl = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl!;
      });
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      fuente = img;
    }

    if (width <= 0 || height <= 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: mimeType === "image/png" });
    if (!ctx) return null;

    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(fuente, 0, 0, width, height);

    const salida = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    canvas.width = 0;
    canvas.height = 0;
    return salida;
  } catch {
    return null;
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// Prepara hasta 3 fotos del espacio como File[] JPEG listos para Web Share o descarga
export async function prepararFotosUnidadParaCompartir(
  imagenes: string[],
  codigo: string
): Promise<File[]> {
  if (!imagenes || imagenes.length === 0) return [];
  const codigoLimpio = codigo.replace(/[^a-zA-Z0-9_-]/g, "-");
  const urls = imagenes.slice(0, 3);

  const blobs = await Promise.all(urls.map((url) => descargarBlobFoto(url)));
  const archivos: File[] = [];

  for (let i = 0; i < blobs.length; i++) {
    const rawBlob = blobs[i];
    if (!rawBlob) continue;
    const jpegBlob = (await renderBlobAFormato(rawBlob, "image/jpeg", 0.88)) ?? rawBlob;
    const ext = jpegBlob.type === "image/png" ? "png" : "jpg";
    archivos.push(
      new File([jpegBlob], `${codigoLimpio}-foto-${i + 1}.${ext}`, {
        type: jpegBlob.type || "image/jpeg",
      })
    );
  }

  return archivos;
}

// Indica si el navegador permite copiar imágenes PNG en el portapapeles
export function soportaCopiarImagenPortapapeles(): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.clipboard?.write !== "function" ||
    typeof ClipboardItem === "undefined"
  ) {
    return false;
  }
  if (typeof ClipboardItem.supports === "function") {
    return ClipboardItem.supports("image/png");
  }
  return true;
}

// Copia una imagen como image/png al portapapeles manteniendo el gesto de usuario
export async function copiarImagenAlPortapapeles(
  obtenerFuente: () => Promise<Blob | null>
): Promise<boolean> {
  if (!soportaCopiarImagenPortapapeles()) return false;

  try {
    const pngPromise = (async () => {
      const fuente = await obtenerFuente();
      if (!fuente) {
        throw new Error("Sin imagen disponible");
      }
      const pngBlob = await renderBlobAFormato(fuente, "image/png");
      if (!pngBlob) {
        throw new Error("No se pudo convertir a PNG");
      }
      return pngBlob;
    })();

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngPromise }),
    ]);
    return true;
  } catch {
    return false;
  }
}

// Ajusta texto en múltiples líneas dentro de un ancho máximo en Canvas
function envolverTextoCanvas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxWidth: number,
  maxLineas: number
): string[] {
  const palabras = texto.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = "";

  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width <= maxWidth) {
      actual = prueba;
    } else {
      if (actual) lineas.push(actual);
      actual = palabra;
      if (lineas.length === maxLineas - 1) break;
    }
  }

  if (actual && lineas.length < maxLineas) {
    lineas.push(actual);
  }

  if (lineas.length === maxLineas && palabras.join(" ").length > lineas.join(" ").length) {
    lineas[maxLineas - 1] = `${lineas[maxLineas - 1].replace(/[.,;:!?]*$/, "")}...`;
  }

  return lineas;
}

// Dibuja un rectángulo con bordes redondeados
function trazarRectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

// Genera una tarjeta visual PNG (1080x1350) en el navegador sin carga para el servidor
export async function generarFlyerUnidadPng(
  unidad: UnidadConPropiedad,
  direccionPropiedad?: string | null,
  fotoPrevia?: File | Blob | null
): Promise<File | null> {
  try {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fondo general claro
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, W, H);

    // Cabecera institucional
    ctx.fillStyle = "#1C2539";
    ctx.fillRect(0, 0, W, 170);
    ctx.fillStyle = "#175E38";
    ctx.fillRect(0, 160, W, 10);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
    ctx.fillText("INMOBILIARIA CONTÉ C.A.", 60, 82);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "500 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${unidad.propiedad.nombre} · ${unidad.propiedad.ciudad}`, 60, 122);

    // Badge DISPONIBLE en cabecera
    ctx.fillStyle = "#175E38";
    trazarRectRedondeado(ctx, W - 270, 54, 210, 56, 28);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DISPONIBLE", W - 165, 90);
    ctx.textAlign = "left";

    // Marco de fotografía principal
    const imgX = 60;
    const imgY = 210;
    const imgW = W - 120;
    const imgH = 540;

    ctx.save();
    trazarRectRedondeado(ctx, imgX, imgY, imgW, imgH, 28);
    ctx.clip();

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(imgX, imgY, imgW, imgH);

    let fotoBlob: Blob | null = fotoPrevia ?? null;
    if (!fotoBlob && unidad.imagenes?.[0]) {
      fotoBlob = await descargarBlobFoto(unidad.imagenes[0]);
    }

    if (fotoBlob) {
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(fotoBlob);
        const scale = Math.max(imgW / bitmap.width, imgH / bitmap.height);
        const drawW = bitmap.width * scale;
        const drawH = bitmap.height * scale;
        const dx = imgX + (imgW - drawW) / 2;
        const dy = imgY + (imgH - drawH) / 2;
        ctx.drawImage(bitmap, dx, dy, drawW, drawH);
      } finally {
        bitmap?.close();
      }
    } else {
      ctx.fillStyle = "#E2E8F0";
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Espacio Disponible para Alquiler", W / 2, imgY + imgH / 2);
      ctx.textAlign = "left";
    }
    ctx.restore();

    // Borde sutil de foto
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    trazarRectRedondeado(ctx, imgX, imgY, imgW, imgH, 28);
    ctx.stroke();

    // Título del espacio y ubicación
    const tipoLabel = TIPO_UNIDAD_LABEL[unidad.tipo] || unidad.tipo;
    ctx.fillStyle = "#175E38";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(tipoLabel.toUpperCase(), 60, 810);

    ctx.fillStyle = "#0F172A";
    ctx.font = "800 54px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Espacio ${unidad.codigo}`, 60, 872);

    const lineaUbicacion = direccionPropiedad
      ? `${unidad.propiedad.nombre} — ${direccionPropiedad}, ${unidad.propiedad.ciudad}`
      : `${unidad.propiedad.nombre}, ${unidad.propiedad.ciudad}`;
    ctx.fillStyle = "#475569";
    ctx.font = "500 24px system-ui, -apple-system, sans-serif";
    const lineasUbi = envolverTextoCanvas(ctx, lineaUbicacion, W - 120, 1);
    ctx.fillText(lineasUbi[0] || "", 60, 916);

    // 3 Tarjetas de métricas clave
    const cardsY = 958;
    const cardGap = 24;
    const cardW = (W - 120 - cardGap * 2) / 3;
    const cardH = 148;

    const metricas = [
      {
        label: "ÁREA APROX.",
        value: unidad.areaMt2 ? `${unidad.areaMt2} m²` : "Por definir",
        highlight: false,
      },
      {
        label: "NIVEL / PISO",
        value: unidad.piso || "Planta única",
        highlight: false,
      },
      {
        label: "CANON MENSUAL",
        value: unidad.precioAlquiler ? formatCurrency(unidad.precioAlquiler) : "Consultar",
        highlight: true,
      },
    ];

    metricas.forEach((m, idx) => {
      const cx = 60 + idx * (cardW + cardGap);
      ctx.fillStyle = m.highlight ? "#ECFDF5" : "#FFFFFF";
      trazarRectRedondeado(ctx, cx, cardsY, cardW, cardH, 22);
      ctx.fill();

      ctx.strokeStyle = m.highlight ? "#86EFAC" : "#E2E8F0";
      ctx.lineWidth = 2;
      trazarRectRedondeado(ctx, cx, cardsY, cardW, cardH, 22);
      ctx.stroke();

      ctx.fillStyle = m.highlight ? "#15803D" : "#64748B";
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillText(m.label, cx + 24, cardsY + 46);

      ctx.fillStyle = m.highlight ? "#175E38" : "#0F172A";
      ctx.font = "800 32px system-ui, -apple-system, sans-serif";
      const valLines = envolverTextoCanvas(ctx, m.value, cardW - 48, 1);
      ctx.fillText(valLines[0] || m.value, cx + 24, cardsY + 104);
    });

    // Descripción opcional
    if (unidad.descripcion?.trim()) {
      ctx.fillStyle = "#334155";
      ctx.font = "500 24px system-ui, -apple-system, sans-serif";
      const descLines = envolverTextoCanvas(ctx, unidad.descripcion, W - 120, 3);
      descLines.forEach((line, i) => {
        ctx.fillText(line, 60, 1158 + i * 34);
      });
    } else {
      ctx.fillStyle = "#475569";
      ctx.font = "500 24px system-ui, -apple-system, sans-serif";
      ctx.fillText("Espacio comercial listo para entrega inmediata. Contáctanos para agendar visita.", 60, 1175);
    }

    // Pie institucional
    ctx.fillStyle = "#1C2539";
    ctx.fillRect(0, H - 72, W, 72);
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "600 20px system-ui, -apple-system, sans-serif";
    ctx.fillText("Inmobiliaria Conté C.A. · Ficha Comercial Oficial", 60, H - 28);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    canvas.width = 0;
    canvas.height = 0;
    if (!pngBlob) return null;

    const codigoLimpio = unidad.codigo.replace(/[^a-zA-Z0-9_-]/g, "-");
    return new File([pngBlob], `Ficha-${codigoLimpio}.png`, { type: "image/png" });
  } catch {
    return null;
  }
}

// Dispara descarga local de un Blob/File sin dejar nodos en el DOM
export function descargarBlobArchivo(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Verifica si el navegador soporta compartir archivos por Web Share API
export function soportaCompartirArchivos(files: File[]): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }
  if (files.length === 0) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}
