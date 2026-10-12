import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { MetodoPago } from "@prisma/client";
import type { PagoItem } from "./types";

const METODO_LABELS: Record<MetodoPago, string> = {
  EFECTIVO_USD: "Efectivo (USD)",
  TRANSFERENCIA: "Transferencia Bancaria",
  PAGO_MOVIL: "Pago Móvil",
  ZELLE: "Zelle",
  OTRO: "Otro Método",
};

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Caché en memoria para evitar descargas repetidas de fuentes y logotipo
const fuentesCache = new Map<string, Uint8Array>();
let logoCache: Uint8Array | null = null;

// Descarga o recupera de caché un archivo binario de fuente
async function cargarFuente(ruta: string): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;
  if (fuentesCache.has(ruta)) return fuentesCache.get(ruta)!;
  try {
    const res = await fetch(ruta);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    fuentesCache.set(ruta, bytes);
    return bytes;
  } catch {
    return null;
  }
}

// Descarga o recupera de caché el logotipo corporativo
async function obtenerLogo(): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;
  if (logoCache) return logoCache;
  try {
    const res = await fetch("/Logo.png");
    if (!res.ok) return null;
    logoCache = new Uint8Array(await res.arrayBuffer());
    return logoCache;
  } catch {
    return null;
  }
}

// Genera una Nota de Entrega simple, elegante, sobria y formal
export async function construirReciboPdf(pago: PagoItem): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Formato Carta estándar (612 x 792 pt)
  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();

  // Fuentes Poppins con fallback a Helvetica
  const [bR, bS, bB] = await Promise.all([
    cargarFuente("/fonts/Poppins-Regular.ttf"),
    cargarFuente("/fonts/Poppins-SemiBold.ttf"),
    cargarFuente("/fonts/Poppins-Bold.ttf"),
  ]);

  let fontRegular, fontSemiBold, fontBold;
  try {
    if (!bR || !bS || !bB) throw new Error();
    [fontRegular, fontSemiBold, fontBold] = await Promise.all([
      doc.embedFont(bR),
      doc.embedFont(bS),
      doc.embedFont(bB),
    ]);
  } catch {
    fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    fontSemiBold = await doc.embedFont(StandardFonts.HelveticaBold);
    fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  // Paleta corporativa sobria (fondo blanco puro, sin franjas pesadas)
  const verdeConte = rgb(23 / 255, 94 / 255, 56 / 255);       // #175E38
  const azulOscuro = rgb(28 / 255, 37 / 255, 57 / 255);      // #1C2539
  const textoDark = rgb(15 / 255, 23 / 255, 42 / 255);       // #0F172A
  const textoGris = rgb(100 / 255, 116 / 255, 139 / 255);     // #64748B
  const textoClaro = rgb(148 / 255, 163 / 255, 184 / 255);   // #94A3B8
  const lineaFina = rgb(226 / 255, 232 / 255, 240 / 255);    // #E2E8F0
  const rojoAlerta = rgb(204 / 255, 26 / 255, 34 / 255);     // #CC1A22

  const contrato = pago.contrato;
  const inquilino = contrato.inquilino;
  const unidad = contrato.unidad;
  const propiedad = unidad.propiedad;

  const nombreMes = NOMBRES_MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
  const periodoTexto = `${nombreMes} ${pago.periodoAno}`;

  const fechaEmisionStr = pago.fechaPago
    ? new Date(pago.fechaPago).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const fechaVenceStr = pago.fechaVencimiento
    ? new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "N/A";

  const inquilinoNombre = (
    inquilino.apellido
      ? `${inquilino.nombre} ${inquilino.apellido}`
      : inquilino.nombre
  ).toUpperCase();

  // Metadatos oficiales del documento PDF
  const nombreLimpioCliente = (
    inquilino.apellido
      ? `${inquilino.nombre} ${inquilino.apellido}`
      : inquilino.nombre
  )
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim();

  const nombreLimpiaPropiedad = propiedad.nombre
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim();

  const nombreDoc = `${nombreLimpioCliente} - ${nombreLimpiaPropiedad}`;
  doc.setTitle(nombreDoc);
  doc.setAuthor("Inmobiliaria Conté C.A.");
  doc.setSubject(`Nota de Entrega - ${propiedad.nombre}`);

  const documentoInquilino = inquilino.documentoIdentidad || "No registrado";
  const numeroRecibo = `REC-${pago.periodoAno}${String(pago.periodoMes).padStart(2, "0")}-${contrato.codigo}`;
  const esSolvente = pago.montoPagado >= pago.montoEsperado;
  const saldoRestante = Math.max(0, pago.montoEsperado - pago.montoPagado);
  const metodoTxt = pago.metodoPago ? METODO_LABELS[pago.metodoPago] : "Efectivo";

  const margenX = 52;
  const margenDer = width - margenX;
  let y = height - 56;

  // 1. CABECERA LIMPIA (Logo + Datos de Empresa a la izquierda | NOTA DE ENTREGA a la derecha)
  const logoBytes = await obtenerLogo();
  if (logoBytes) {
    try {
      let logoImg;
      try {
        logoImg = await doc.embedJpg(logoBytes);
      } catch {
        logoImg = await doc.embedPng(logoBytes);
      }
      if (logoImg) {
        page.drawImage(logoImg, {
          x: margenX,
          y: y - 48,
          width: 48,
          height: 48,
        });
      }
    } catch {
      // Continuar si la imagen no se puede renderizar
    }
  }

  // Textos Empresa
  page.drawText("INMOBILIARIA CONTÉ C.A.", {
    x: margenX + 60,
    y: y - 10,
    size: 13,
    font: fontBold,
    color: azulOscuro,
  });
  page.drawText("RIF: J-30510225-2   ·   Telf: 0272-236.62.16", {
    x: margenX + 60,
    y: y - 24,
    size: 8.5,
    font: fontRegular,
    color: textoGris,
  });
  page.drawText("Av. 19 de Abril, Edif. San Marcos, Piso 1. Trujillo, Edo. Trujillo.", {
    x: margenX + 60,
    y: y - 37,
    size: 8,
    font: fontRegular,
    color: textoClaro,
  });

  // Lado Derecho: NOTA DE ENTREGA, Número y Estado
  const tituloNota = "NOTA DE ENTREGA";
  page.drawText(tituloNota, {
    x: margenDer - fontBold.widthOfTextAtSize(tituloNota, 14),
    y: y - 10,
    size: 14,
    font: fontBold,
    color: azulOscuro,
  });

  const textoNumero = `# ${numeroRecibo}`;
  page.drawText(textoNumero, {
    x: margenDer - fontSemiBold.widthOfTextAtSize(textoNumero, 9),
    y: y - 25,
    size: 9,
    font: fontSemiBold,
    color: textoDark,
  });

  const estadoTxt = esSolvente ? "CONTADO · SOLVENTE" : "ABONO PARCIAL";
  page.drawText(estadoTxt, {
    x: margenDer - fontBold.widthOfTextAtSize(estadoTxt, 7.5),
    y: y - 38,
    size: 7.5,
    font: fontBold,
    color: esSolvente ? verdeConte : azulOscuro,
  });

  // Línea sutil divisoria bajo la cabecera
  y -= 62;
  page.drawLine({
    start: { x: margenX, y },
    end: { x: margenDer, y },
    thickness: 1,
    color: lineaFina,
  });

  // 2. DATOS DEL CLIENTE Y FECHAS (Layout a 2 columnas sobrias)
  y -= 26;
  const colDerX = margenX + 310;

  // Fila 1: Encabezados de bloque
  page.drawText("CLIENTE / ARRENDATARIO", { x: margenX, y, size: 7.5, font: fontBold, color: textoClaro });
  page.drawText("DATOS DE EMISIÓN", { x: colDerX, y, size: 7.5, font: fontBold, color: textoClaro });

  y -= 14;
  page.drawText(inquilinoNombre, { x: margenX, y, size: 10, font: fontBold, color: textoDark });
  page.drawText("Fecha de Emisión:", { x: colDerX, y, size: 8.5, font: fontRegular, color: textoGris });
  page.drawText(fechaEmisionStr, { x: colDerX + 90, y, size: 8.5, font: fontSemiBold, color: textoDark });

  y -= 14;
  page.drawText(`C.I. / RIF: ${documentoInquilino}   ·   Telf: ${inquilino.telefono || "No registrado"}`, {
    x: margenX,
    y,
    size: 8.5,
    font: fontRegular,
    color: textoGris,
  });
  page.drawText("Fecha Vencimiento:", { x: colDerX, y, size: 8.5, font: fontRegular, color: textoGris });
  page.drawText(fechaVenceStr, { x: colDerX + 90, y, size: 8.5, font: fontRegular, color: textoDark });

  y -= 14;
  page.drawText(`Inmueble: ${propiedad.nombre}, ${propiedad.ciudad || "Trujillo"}   ·   Espacio: ${unidad.codigo}`, {
    x: margenX,
    y,
    size: 8.5,
    font: fontRegular,
    color: textoGris,
  });
  page.drawText("Período Mensual:", { x: colDerX, y, size: 8.5, font: fontRegular, color: textoGris });
  page.drawText(periodoTexto, { x: colDerX + 90, y, size: 8.5, font: fontBold, color: verdeConte });

  // 3. TABLA DE CONCEPTOS (Simple y limpia, sin cajones)
  y -= 30;
  page.drawLine({
    start: { x: margenX, y: y + 8 },
    end: { x: margenDer, y: y + 8 },
    thickness: 1,
    color: azulOscuro,
  });

  // Encabezados de tabla
  page.drawText("DESCRIPCIÓN DEL CONCEPTO", { x: margenX, y: y - 4, size: 8, font: fontBold, color: azulOscuro });
  page.drawText("ESPACIO", { x: margenX + 260, y: y - 4, size: 8, font: fontBold, color: azulOscuro });
  page.drawText("MES", { x: margenX + 340, y: y - 4, size: 8, font: fontBold, color: azulOscuro });
  page.drawText("PRECIO", { x: margenDer - 100, y: y - 4, size: 8, font: fontBold, color: azulOscuro });
  page.drawText("TOTAL", { x: margenDer - 35, y: y - 4, size: 8, font: fontBold, color: azulOscuro });

  y -= 14;
  page.drawLine({
    start: { x: margenX, y },
    end: { x: margenDer, y },
    thickness: 0.8,
    color: lineaFina,
  });

  // Fila del concepto de arrendamiento
  y -= 18;
  page.drawText(`Alquiler del Espacio ${unidad.codigo} (${propiedad.nombre})`, {
    x: margenX,
    y,
    size: 8.5,
    font: fontRegular,
    color: textoDark,
  });
  page.drawText(unidad.codigo, { x: margenX + 260, y, size: 8.5, font: fontSemiBold, color: textoDark });
  page.drawText(periodoTexto, { x: margenX + 340, y, size: 8.5, font: fontRegular, color: textoGris });
  page.drawText(`$${pago.montoEsperado.toFixed(2)}`, { x: margenDer - 100, y, size: 8.5, font: fontRegular, color: textoDark });
  page.drawText(`$${pago.montoEsperado.toFixed(2)}`, { x: margenDer - 35, y, size: 8.5, font: fontBold, color: textoDark });

  y -= 12;
  page.drawLine({
    start: { x: margenX, y },
    end: { x: margenDer, y },
    thickness: 0.8,
    color: lineaFina,
  });

  // 4. DETALLE DEL PAGO Y TOTALES
  y -= 26;
  const seccionPagoY = y;

  // Lado Izquierdo: Liquidación del pago
  page.drawText("DETALLE DEL PAGO", { x: margenX, y: seccionPagoY, size: 7.5, font: fontBold, color: textoClaro });
  page.drawText("Método de Pago:", { x: margenX, y: seccionPagoY - 14, size: 8.5, font: fontRegular, color: textoGris });
  page.drawText(metodoTxt, { x: margenX + 85, y: seccionPagoY - 14, size: 8.5, font: fontSemiBold, color: textoDark });

  if (pago.referencia) {
    page.drawText("Nº Referencia:", { x: margenX, y: seccionPagoY - 27, size: 8.5, font: fontRegular, color: textoGris });
    page.drawText(`#${pago.referencia}`, { x: margenX + 85, y: seccionPagoY - 27, size: 8.5, font: fontSemiBold, color: textoDark });
  }

  // Lado Derecho: Totales
  const bloqueTotalesX = margenDer - 170;
  page.drawText("Subtotal / Canon:", { x: bloqueTotalesX, y: seccionPagoY - 5, size: 8.5, font: fontRegular, color: textoGris });
  const subtotalTxt = `$${pago.montoEsperado.toFixed(2)}`;
  page.drawText(subtotalTxt, {
    x: margenDer - fontSemiBold.widthOfTextAtSize(subtotalTxt, 8.5),
    y: seccionPagoY - 5,
    size: 8.5,
    font: fontSemiBold,
    color: textoDark,
  });

  page.drawLine({
    start: { x: bloqueTotalesX, y: seccionPagoY - 15 },
    end: { x: margenDer, y: seccionPagoY - 15 },
    thickness: 0.8,
    color: lineaFina,
  });

  page.drawText("MONTO CANCELADO", { x: bloqueTotalesX, y: seccionPagoY - 30, size: 8.5, font: fontBold, color: verdeConte });
  const totalTxt = `$${pago.montoPagado.toFixed(2)} USD`;
  page.drawText(totalTxt, {
    x: margenDer - fontBold.widthOfTextAtSize(totalTxt, 11),
    y: seccionPagoY - 30,
    size: 11,
    font: fontBold,
    color: verdeConte,
  });

  if (saldoRestante > 0) {
    page.drawText(`Saldo pendiente: $${saldoRestante.toFixed(2)} USD`, {
      x: bloqueTotalesX,
      y: seccionPagoY - 44,
      size: 8,
      font: fontBold,
      color: rojoAlerta,
    });
  }

  // 5. PIE DE PÁGINA INSTITUCIONAL DISCRETO
  const pieY = 44;
  page.drawLine({
    start: { x: margenX, y: pieY + 12 },
    end: { x: margenDer, y: pieY + 12 },
    thickness: 0.6,
    color: lineaFina,
  });
  const pieTexto = "Inmobiliaria Conté C.A. · Comprobante digital de cobranza generado electrónicamente";
  page.drawText(pieTexto, {
    x: (width - fontRegular.widthOfTextAtSize(pieTexto, 7)) / 2,
    y: pieY,
    size: 7,
    font: fontRegular,
    color: textoClaro,
  });

  const pdfBytes = await doc.save({ useObjectStreams: true });
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
