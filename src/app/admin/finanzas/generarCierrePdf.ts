import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Tipos de datos para el reporte de cierre
export interface CierrePdfData {
  mes: number;
  ano: number;
  totalIngresos: number;
  totalEgresos: number;
  balanceNeto: number;
  desglosePropiedades: {
    nombre: string;
    ciudad: string;
    ingresos: number;
    egresos: number;
    balance: number;
  }[];
}

// Caché en memoria para evitar descargas repetidas de recursos
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

// Formatear montos a USD con 2 decimales
function fmtUSD(monto: number): string {
  return monto.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Genera el documento PDF oficial del Cierre de Mes Contable
export async function construirCierrePdf(
  data: CierrePdfData,
  mesNombre: string,
  ano: number
): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Formato Carta estándar (612 x 792 pt)
  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();

  // Carga de fuentes Poppins con fallback nativo a Helvetica
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

  // Paleta corporativa institucional
  const verdeConte = rgb(23 / 255, 94 / 255, 56 / 255);       // #175E38
  const azulOscuro = rgb(28 / 255, 37 / 255, 57 / 255);      // #1C2539
  const textoDark = rgb(15 / 255, 23 / 255, 42 / 255);       // #0F172A
  const textoGris = rgb(100 / 255, 116 / 255, 139 / 255);     // #64748B
  const textoClaro = rgb(148 / 255, 163 / 255, 184 / 255);   // #94A3B8
  const lineaFina = rgb(226 / 255, 232 / 255, 240 / 255);    // #E2E8F0
  const fondoTabla = rgb(248 / 255, 250 / 255, 252 / 255);   // #F8FAFC
  const rojoAlerta = rgb(204 / 255, 26 / 255, 34 / 255);     // #CC1A22
  const blancoPuro = rgb(1, 1, 1);

  // Metadatos del documento
  const nombreDoc = `Cierre Contable - ${mesNombre} ${ano} - Inmobiliaria Conté`;
  doc.setTitle(nombreDoc);
  doc.setAuthor("Inmobiliaria Conté C.A.");
  doc.setSubject(`Reporte de Cierre Contable correspondiente a ${mesNombre} ${ano}`);

  const esUtilidad = data.balanceNeto >= 0;
  const margen =
    data.totalIngresos > 0
      ? ((data.balanceNeto / data.totalIngresos) * 100).toFixed(1)
      : "0";

  const fechaEmisionStr = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const margenX = 48;
  const margenDer = width - margenX;
  const anchoContenido = margenDer - margenX; // 516 pt
  let y = height - 50;

  // 1. CABECERA INSTITUCIONAL
  const logoBytes = await obtenerLogo();
  if (logoBytes) {
    try {
      let logoImg;
      try {
        logoImg = await doc.embedPng(logoBytes);
      } catch {
        logoImg = await doc.embedJpg(logoBytes);
      }
      if (logoImg) {
        page.drawImage(logoImg, {
          x: margenX,
          y: y - 44,
          width: 44,
          height: 44,
        });
      }
    } catch {
      // Continuar si la imagen no se puede renderizar
    }
  }

  // Identidad corporativa a la izquierda
  page.drawText("INMOBILIARIA CONTÉ C.A.", {
    x: margenX + 54,
    y: y - 8,
    size: 12.5,
    font: fontBold,
    color: azulOscuro,
  });
  page.drawText("RIF: J-30510225-2   ·   Telf: 0272-236.62.16", {
    x: margenX + 54,
    y: y - 22,
    size: 8,
    font: fontRegular,
    color: textoGris,
  });
  page.drawText("Av. 19 de Abril, Edif. San Marcos, Piso 1. Trujillo, Edo. Trujillo.", {
    x: margenX + 54,
    y: y - 35,
    size: 7.5,
    font: fontRegular,
    color: textoClaro,
  });

  // Título y Período a la derecha
  const tituloCierre = "CIERRE CONTABLE MENSUAL";
  page.drawText(tituloCierre, {
    x: margenDer - fontBold.widthOfTextAtSize(tituloCierre, 12),
    y: y - 8,
    size: 12,
    font: fontBold,
    color: verdeConte,
  });

  const periodoStr = `${mesNombre.toUpperCase()} ${ano}`;
  page.drawText(periodoStr, {
    x: margenDer - fontSemiBold.widthOfTextAtSize(periodoStr, 9.5),
    y: y - 22,
    size: 9.5,
    font: fontSemiBold,
    color: azulOscuro,
  });

  const emisionStr = `Generado: ${fechaEmisionStr}`;
  page.drawText(emisionStr, {
    x: margenDer - fontRegular.widthOfTextAtSize(emisionStr, 7.5),
    y: y - 35,
    size: 7.5,
    font: fontRegular,
    color: textoClaro,
  });

  // Línea divisoria de cabecera con acento verde
  y -= 54;
  page.drawLine({
    start: { x: margenX, y },
    end: { x: margenDer, y },
    thickness: 1.5,
    color: verdeConte,
  });

  // 2. HERO CARD - RESUMEN EJECUTIVO CONSOLIDADO
  y -= 14;
  const altoCard = 80;
  const cardY = y - altoCard;

  // Fondo del Hero Card
  page.drawRectangle({
    x: margenX,
    y: cardY,
    width: anchoContenido,
    height: altoCard,
    color: esUtilidad ? rgb(240 / 255, 253 / 255, 244 / 255) : rgb(255 / 255, 241 / 255, 242 / 255),
    borderColor: esUtilidad ? rgb(187 / 255, 247 / 255, 208 / 255) : rgb(254 / 255, 205 / 255, 211 / 255),
    borderWidth: 1,
  });

  // Columna Izquierda: Utilidad / Balance Neto
  const balanceLabel = esUtilidad ? "UTILIDAD NETA OPERATIVA" : "DÉFICIT OPERATIVO";
  page.drawText(balanceLabel, {
    x: margenX + 16,
    y: y - 18,
    size: 8,
    font: fontBold,
    color: esUtilidad ? verdeConte : rojoAlerta,
  });

  const balanceMonto = `${esUtilidad ? "+" : ""}$${fmtUSD(data.balanceNeto)} USD`;
  page.drawText(balanceMonto, {
    x: margenX + 16,
    y: y - 42,
    size: 19,
    font: fontBold,
    color: esUtilidad ? azulOscuro : rojoAlerta,
  });

  const margenDesc = `Margen de rentabilidad sobre ingresos: ${margen}%`;
  page.drawText(margenDesc, {
    x: margenX + 16,
    y: y - 62,
    size: 7.5,
    font: fontRegular,
    color: textoGris,
  });

  // Separador vertical interno
  page.drawLine({
    start: { x: margenX + 270, y: y - 12 },
    end: { x: margenX + 270, y: y - 68 },
    thickness: 0.8,
    color: lineaFina,
  });

  // Columna Derecha: Cajas de Ingresos y Egresos Totales
  const colDerX = margenX + 290;

  // Ingresos
  page.drawText("INGRESOS TOTALES", {
    x: colDerX,
    y: y - 22,
    size: 7.5,
    font: fontBold,
    color: verdeConte,
  });
  const ingTxt = `+$${fmtUSD(data.totalIngresos)} USD`;
  page.drawText(ingTxt, {
    x: colDerX,
    y: y - 36,
    size: 11,
    font: fontBold,
    color: verdeConte,
  });

  // Egresos
  page.drawText("EGRESOS TOTALES", {
    x: colDerX + 115,
    y: y - 22,
    size: 7.5,
    font: fontBold,
    color: rojoAlerta,
  });
  const egrTxt = `-$${fmtUSD(data.totalEgresos)} USD`;
  page.drawText(egrTxt, {
    x: colDerX + 115,
    y: y - 36,
    size: 11,
    font: fontBold,
    color: rojoAlerta,
  });

  page.drawText("Movimientos conciliados en el periodo", {
    x: colDerX,
    y: y - 62,
    size: 7.5,
    font: fontRegular,
    color: textoClaro,
  });

  // 3. SECCIÓN: TABLA DE RENTABILIDAD POR INMUEBLE
  y = cardY - 22;
  page.drawText("DESGLOSE DE RENTABILIDAD POR INMUEBLE", {
    x: margenX,
    y,
    size: 9,
    font: fontBold,
    color: azulOscuro,
  });

  const cantInmuebles = `${data.desglosePropiedades.length} inmueble(s) con actividad`;
  page.drawText(cantInmuebles, {
    x: margenDer - fontRegular.widthOfTextAtSize(cantInmuebles, 7.5),
    y,
    size: 7.5,
    font: fontRegular,
    color: textoGris,
  });

  // Cabecera de la tabla
  y -= 10;
  const altoFilaHeader = 18;
  page.drawRectangle({
    x: margenX,
    y: y - altoFilaHeader,
    width: anchoContenido,
    height: altoFilaHeader,
    color: rgb(241 / 255, 245 / 255, 249 / 255), // #F1F5F9
    borderColor: lineaFina,
    borderWidth: 0.8,
  });

  const colPropX = margenX + 10;
  const colIngX = margenX + 240;
  const colEgrX = margenX + 335;
  const colBalX = margenDer - 10;

  const headerY = y - 12;
  page.drawText("INMUEBLE / CIUDAD", { x: colPropX, y: headerY, size: 7.5, font: fontBold, color: textoGris });
  page.drawText("INGRESOS", { x: colIngX + 45 - fontBold.widthOfTextAtSize("INGRESOS", 7.5), y: headerY, size: 7.5, font: fontBold, color: textoGris });
  page.drawText("EGRESOS", { x: colEgrX + 45 - fontBold.widthOfTextAtSize("EGRESOS", 7.5), y: headerY, size: 7.5, font: fontBold, color: textoGris });
  page.drawText("BALANCE NETO", { x: colBalX - fontBold.widthOfTextAtSize("BALANCE NETO", 7.5), y: headerY, size: 7.5, font: fontBold, color: textoGris });

  y -= altoFilaHeader;

  // Filas de Inmuebles
  const altoFila = 24;
  data.desglosePropiedades.forEach((p, index) => {
    const filaY = y - altoFila;
    const esPar = index % 2 === 0;

    // Fondo alternado suave
    page.drawRectangle({
      x: margenX,
      y: filaY,
      width: anchoContenido,
      height: altoFila,
      color: esPar ? blancoPuro : fondoTabla,
      borderColor: lineaFina,
      borderWidth: 0.5,
    });

    // Inmueble y Ciudad
    page.drawText(p.nombre, {
      x: colPropX,
      y: filaY + 13,
      size: 8,
      font: fontBold,
      color: textoDark,
    });
    page.drawText(p.ciudad || "Trujillo", {
      x: colPropX,
      y: filaY + 4,
      size: 6.5,
      font: fontRegular,
      color: textoClaro,
    });

    // Ingresos
    const pIng = `+$${fmtUSD(p.ingresos)}`;
    page.drawText(pIng, {
      x: colIngX + 45 - fontSemiBold.widthOfTextAtSize(pIng, 8),
      y: filaY + 8,
      size: 8,
      font: fontSemiBold,
      color: verdeConte,
    });

    // Egresos
    const pEgr = `-$${fmtUSD(p.egresos)}`;
    page.drawText(pEgr, {
      x: colEgrX + 45 - fontSemiBold.widthOfTextAtSize(pEgr, 8),
      y: filaY + 8,
      size: 8,
      font: fontSemiBold,
      color: rojoAlerta,
    });

    // Balance Neto
    const esPos = p.balance >= 0;
    const pBal = `${esPos ? "+" : ""}$${fmtUSD(p.balance)}`;
    page.drawText(pBal, {
      x: colBalX - fontBold.widthOfTextAtSize(pBal, 8),
      y: filaY + 8,
      size: 8,
      font: fontBold,
      color: esPos ? textoDark : rojoAlerta,
    });

    y -= altoFila;
  });

  // Fila de Totales Generales
  const altoTotal = 20;
  const totalY = y - altoTotal;
  page.drawRectangle({
    x: margenX,
    y: totalY,
    width: anchoContenido,
    height: altoTotal,
    color: rgb(241 / 255, 245 / 255, 249 / 255),
    borderColor: lineaFina,
    borderWidth: 0.8,
  });

  page.drawText("TOTAL CONSOLIDADO", {
    x: colPropX,
    y: totalY + 6,
    size: 8,
    font: fontBold,
    color: azulOscuro,
  });

  const totIngStr = `+$${fmtUSD(data.totalIngresos)}`;
  page.drawText(totIngStr, {
    x: colIngX + 45 - fontBold.widthOfTextAtSize(totIngStr, 8),
    y: totalY + 6,
    size: 8,
    font: fontBold,
    color: verdeConte,
  });

  const totEgrStr = `-$${fmtUSD(data.totalEgresos)}`;
  page.drawText(totEgrStr, {
    x: colEgrX + 45 - fontBold.widthOfTextAtSize(totEgrStr, 8),
    y: totalY + 6,
    size: 8,
    font: fontBold,
    color: rojoAlerta,
  });

  const totBalStr = `${esUtilidad ? "+" : ""}$${fmtUSD(data.balanceNeto)}`;
  page.drawText(totBalStr, {
    x: colBalX - fontBold.widthOfTextAtSize(totBalStr, 8.5),
    y: totalY + 6,
    size: 8.5,
    font: fontBold,
    color: esUtilidad ? verdeConte : rojoAlerta,
  });

  y = totalY - 30;

  // 4. CERTIFICACIÓN Y SECCIÓN DE FIRMAS
  const firmasY = 110;
  const anchoFirma = 170;

  // Firma Administrador
  page.drawLine({
    start: { x: margenX + 20, y: firmasY },
    end: { x: margenX + 20 + anchoFirma, y: firmasY },
    thickness: 0.8,
    color: lineaFina,
  });
  page.drawText("Administración Contable", {
    x: margenX + 20 + (anchoFirma - fontBold.widthOfTextAtSize("Administración Contable", 7.5)) / 2,
    y: firmasY - 12,
    size: 7.5,
    font: fontBold,
    color: textoDark,
  });
  page.drawText("Inmobiliaria Conté C.A.", {
    x: margenX + 20 + (anchoFirma - fontRegular.widthOfTextAtSize("Inmobiliaria Conté C.A.", 6.5)) / 2,
    y: firmasY - 22,
    size: 6.5,
    font: fontRegular,
    color: textoClaro,
  });

  // Firma Gerencia
  const firmaDerX = margenDer - 20 - anchoFirma;
  page.drawLine({
    start: { x: firmaDerX, y: firmasY },
    end: { x: firmaDerX + anchoFirma, y: firmasY },
    thickness: 0.8,
    color: lineaFina,
  });
  page.drawText("Gerencia General", {
    x: firmaDerX + (anchoFirma - fontBold.widthOfTextAtSize("Gerencia General", 7.5)) / 2,
    y: firmasY - 12,
    size: 7.5,
    font: fontBold,
    color: textoDark,
  });
  page.drawText("Inmobiliaria Conté C.A.", {
    x: firmaDerX + (anchoFirma - fontRegular.widthOfTextAtSize("Inmobiliaria Conté C.A.", 6.5)) / 2,
    y: firmasY - 22,
    size: 6.5,
    font: fontRegular,
    color: textoClaro,
  });

  // 5. PIE DE PÁGINA INSTITUCIONAL
  const pieY = 40;
  page.drawLine({
    start: { x: margenX, y: pieY + 12 },
    end: { x: margenDer, y: pieY + 12 },
    thickness: 0.6,
    color: lineaFina,
  });

  const pieTexto = "Inmobiliaria Conté C.A. · Documento financiero oficial generado electrónicamente";
  page.drawText(pieTexto, {
    x: (width - fontRegular.widthOfTextAtSize(pieTexto, 7)) / 2,
    y: pieY,
    size: 7,
    font: fontRegular,
    color: textoClaro,
  });

  // Guardar documento con compresión GZIP/Flate de streams (reduce peso drásticamente)
  const pdfBytes = await doc.save({ useObjectStreams: true });
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
