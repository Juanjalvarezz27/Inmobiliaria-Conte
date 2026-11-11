import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Tipos de datos para el reporte de cierre
export interface MovimientoPdfItem {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string;
  propiedad: string;
  monedaOriginal: string;
  montoOriginal?: number | null;
  montoBs?: number | null;
  tasaBcv?: number | null;
  montoUsd: number;
}

export interface CierrePdfData {
  mes: number;
  ano: number;
  totalIngresos: number;
  totalIngresosUsd?: number;
  totalIngresosVes?: number;
  totalEgresos: number;
  totalEgresosUsd?: number;
  totalEgresosVes?: number;
  balanceNeto: number;
  tasaBcvReferencial?: number;
  desglosePropiedades: {
    propiedadId?: string;
    nombre: string;
    ciudad: string;
    ingresos: number;
    ingresosUsd?: number;
    ingresosVes?: number;
    egresos: number;
    egresosUsd?: number;
    egresosVes?: number;
    balance: number;
    movimientos?: MovimientoPdfItem[];
  }[];
  movimientos?: MovimientoPdfItem[];
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

interface RoundedCorners {
  tl?: boolean;
  tr?: boolean;
  br?: boolean;
  bl?: boolean;
}

// Genera el path SVG para un rectángulo con esquinas redondeadas
function getRoundedRectPath(
  w: number,
  h: number,
  r: number,
  corners: RoundedCorners = { tl: true, tr: true, br: true, bl: true }
): string {
  const tl = corners.tl ?? true;
  const tr = corners.tr ?? true;
  const br = corners.br ?? true;
  const bl = corners.bl ?? true;

  const maxR = Math.min(w / 2, h / 2);
  const rad = Math.min(r, maxR);

  let p = `M 0 ${tl ? rad : 0}`;
  if (tl) p += ` A ${rad} ${rad} 0 0 1 ${rad} 0`;
  p += ` L ${w - (tr ? rad : 0)} 0`;
  if (tr) p += ` A ${rad} ${rad} 0 0 1 ${w} ${rad}`;
  p += ` L ${w} ${h - (br ? rad : 0)}`;
  if (br) p += ` A ${rad} ${rad} 0 0 1 ${w - rad} ${h}`;
  p += ` L ${bl ? rad : 0} ${h}`;
  if (bl) p += ` A ${rad} ${rad} 0 0 1 0 ${h - rad}`;
  p += " Z";
  return p;
}

// Dibuja una caja con bordes redondeados configurable en pdf-lib
function drawRoundedBox(
  page: any,
  x: number,
  topY: number,
  w: number,
  h: number,
  r: number,
  options: {
    color?: any;
    borderColor?: any;
    borderWidth?: number;
    corners?: RoundedCorners;
  }
) {
  const path = getRoundedRectPath(w, h, r, options.corners);
  page.drawSvgPath(path, {
    x,
    y: topY,
    color: options.color,
    borderColor: options.borderColor,
    borderWidth: options.borderWidth ?? 0,
  });
}

// Dibuja una píldora (badge) de estado con esquinas 100% redondeadas
function drawPillBadge(
  page: any,
  x: number,
  bottomY: number,
  w: number,
  h: number,
  bgColor: any,
  borderColor: any,
  texto: string,
  font: any,
  fontSize: number,
  textColor: any
) {
  const topY = bottomY + h;
  drawRoundedBox(page, x, topY, w, h, h / 2, {
    color: bgColor,
    borderColor,
    borderWidth: 0.6,
  });
  const tWidth = font.widthOfTextAtSize(texto, fontSize);
  page.drawText(texto, {
    x: x + (w - tWidth) / 2,
    y: bottomY + 3.8,
    size: fontSize,
    font,
    color: textColor,
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

  // 2. HERO CARD - RESUMEN EJECUTIVO CONSOLIDADO (CON BORDES REDONDEADOS)
  y -= 14;
  const altoCard = 64;
  const cardTopY = y;
  const cardY = y - altoCard;

  // Fondo del Hero Card con bordes redondeados limpios
  drawRoundedBox(page, margenX, cardTopY, anchoContenido, altoCard, 12, {
    color: esUtilidad ? rgb(240 / 255, 253 / 255, 244 / 255) : rgb(255 / 255, 241 / 255, 242 / 255),
    borderColor: esUtilidad ? rgb(187 / 255, 247 / 255, 208 / 255) : rgb(254 / 255, 205 / 255, 211 / 255),
    borderWidth: 1,
  });

  // Columna Izquierda: Utilidad / Balance Neto
  const balanceLabel = esUtilidad ? "UTILIDAD NETA OPERATIVA" : "DÉFICIT OPERATIVO";
  page.drawText(balanceLabel, {
    x: margenX + 18,
    y: cardTopY - 16,
    size: 7.5,
    font: fontBold,
    color: esUtilidad ? verdeConte : rojoAlerta,
  });

  const balanceMonto = `${esUtilidad ? "+" : ""}$${fmtUSD(data.balanceNeto)} USD`;
  page.drawText(balanceMonto, {
    x: margenX + 18,
    y: cardTopY - 38,
    size: 19,
    font: fontBold,
    color: esUtilidad ? azulOscuro : rojoAlerta,
  });

  const margenDesc = `Margen de rentabilidad sobre ingresos: ${margen}%`;
  page.drawText(margenDesc, {
    x: margenX + 18,
    y: cardTopY - 52,
    size: 7,
    font: fontRegular,
    color: textoGris,
  });

  // Separador vertical interno
  page.drawLine({
    start: { x: margenX + 270, y: cardTopY - 10 },
    end: { x: margenX + 270, y: cardTopY - 54 },
    thickness: 0.8,
    color: lineaFina,
  });

  // Columna Derecha: Cajas de Ingresos y Egresos Totales
  const colDerX = margenX + 290;

  // Ingresos
  page.drawText("INGRESOS TOTALES", {
    x: colDerX,
    y: cardTopY - 16,
    size: 7,
    font: fontBold,
    color: verdeConte,
  });
  const ingTxt = `+$${fmtUSD(data.totalIngresos)} USD`;
  page.drawText(ingTxt, {
    x: colDerX,
    y: cardTopY - 30,
    size: 11,
    font: fontBold,
    color: verdeConte,
  });
  if (data.totalIngresosVes && data.totalIngresosVes > 0) {
    const ingSub = `Divisas: $${fmtUSD(data.totalIngresosUsd || 0)} · Bs: ${Math.round(data.totalIngresosVes).toLocaleString("es-VE")}`;
    page.drawText(ingSub, {
      x: colDerX,
      y: cardTopY - 42,
      size: 6.5,
      font: fontRegular,
      color: textoGris,
    });
  }

  // Egresos
  page.drawText("EGRESOS TOTALES", {
    x: colDerX + 115,
    y: cardTopY - 16,
    size: 7,
    font: fontBold,
    color: rojoAlerta,
  });
  const egrTxt = `-$${fmtUSD(data.totalEgresos)} USD`;
  page.drawText(egrTxt, {
    x: colDerX + 115,
    y: cardTopY - 30,
    size: 11,
    font: fontBold,
    color: rojoAlerta,
  });
  if (data.totalEgresosVes && data.totalEgresosVes > 0) {
    const egrSub = `Divisas: $${fmtUSD(data.totalEgresosUsd || 0)} · Bs: ${Math.round(data.totalEgresosVes).toLocaleString("es-VE")}`;
    page.drawText(egrSub, {
      x: colDerX + 115,
      y: cardTopY - 42,
      size: 6.5,
      font: fontRegular,
      color: textoGris,
    });
  }

  // 3. SECCIÓN: TABLA JERÁRQUICA UNIFICADA (RENTABILIDAD Y MOVIMIENTOS POR INMUEBLE)
  y = cardY - 20;
  let currentPage = page;

  currentPage.drawText("DESGLOSE DE RENTABILIDAD Y MOVIMIENTOS POR INMUEBLE", {
    x: margenX,
    y,
    size: 9,
    font: fontBold,
    color: azulOscuro,
  });

  const cantInmuebles = `${data.desglosePropiedades.length} inmueble(s) con actividad · ${data.movimientos?.length || 0} movimientos`;
  currentPage.drawText(cantInmuebles, {
    x: margenDer - fontRegular.widthOfTextAtSize(cantInmuebles, 7.5),
    y,
    size: 7.5,
    font: fontRegular,
    color: textoGris,
  });

  y -= 12;

  // Renderizar cada inmueble con el diseño visual idéntico a las cards del sistema
  for (let pIdx = 0; pIdx < data.desglosePropiedades.length; pIdx++) {
    const p = data.desglosePropiedades[pIdx];
    const movs = p.movimientos || [];
    const pTieneBs = Boolean((p.ingresosVes && p.ingresosVes > 0) || (p.egresosVes && p.egresosVes > 0));
    const altoMetricas = pTieneBs ? 34 : 26;
    const altoHeaderSeccion = 34 + altoMetricas + 10;
    const altoSubHeader = 14;
    const minEspacioRequerido = altoHeaderSeccion + altoSubHeader + Math.min(movs.length, 1) * 18 + 20;

    if (y < minEspacioRequerido) {
      currentPage = doc.addPage([612, 792]);
      y = 730;
      currentPage.drawText(`INMOBILIARIA CONTÉ C.A. · CIERRE CONTABLE MENSUAL (${mesNombre.toUpperCase()} ${ano})`, {
        x: margenX,
        y,
        size: 9,
        font: fontBold,
        color: azulOscuro,
      });
      currentPage.drawLine({
        start: { x: margenX, y: y - 8 },
        end: { x: margenDer, y: y - 8 },
        thickness: 0.6,
        color: lineaFina,
      });
      y -= 25;
    }

    const cardTopY = y;
    const headerBottomY = cardTopY - altoHeaderSeccion;

    // 1. Cabecera del Card con esquinas superiores redondeadas (Soft Slate Gradient)
    drawRoundedBox(currentPage, margenX, cardTopY, anchoContenido, altoHeaderSeccion, 10, {
      color: rgb(248 / 255, 250 / 255, 252 / 255),
      corners: { tl: true, tr: true, br: false, bl: false },
    });

    // 2. Icono corporativo en caja oscura redondeada (Building2 idéntico al modal)
    const iconBoxX = margenX + 12;
    const iconBoxSize = 20;
    const iconBoxTopY = cardTopY - 10;
    const iconBoxBottomY = iconBoxTopY - iconBoxSize;

    drawRoundedBox(currentPage, iconBoxX, iconBoxTopY, iconBoxSize, iconBoxSize, 5, {
      color: azulOscuro,
    });

    // Silueta vectorial del edificio
    currentPage.drawRectangle({
      x: iconBoxX + 4.5,
      y: iconBoxBottomY + 3.5,
      width: 11,
      height: 13,
      color: blancoPuro,
    });
    // Ventanas
    currentPage.drawRectangle({ x: iconBoxX + 6, y: iconBoxBottomY + 11.5, width: 2, height: 2, color: azulOscuro });
    currentPage.drawRectangle({ x: iconBoxX + 10, y: iconBoxBottomY + 11.5, width: 2, height: 2, color: azulOscuro });
    currentPage.drawRectangle({ x: iconBoxX + 6, y: iconBoxBottomY + 7.5, width: 2, height: 2, color: azulOscuro });
    currentPage.drawRectangle({ x: iconBoxX + 10, y: iconBoxBottomY + 7.5, width: 2, height: 2, color: azulOscuro });
    // Puerta
    currentPage.drawRectangle({ x: iconBoxX + 8, y: iconBoxBottomY + 3.5, width: 3, height: 3.5, color: azulOscuro });

    // Nombre del Inmueble (tipografía principal destacada en slate-900)
    const nombreProp = p.nombre.length > 34 ? p.nombre.substring(0, 32) + "..." : p.nombre;
    currentPage.drawText(nombreProp, {
      x: margenX + 38,
      y: cardTopY - 18,
      size: 9.5,
      font: fontBold,
      color: azulOscuro,
    });

    // Ciudad y conteo de movimientos (subtítulo gris fino)
    const cantMovsTxt = `${p.ciudad || "Trujillo"}`;
    currentPage.drawText(cantMovsTxt, {
      x: margenX + 38,
      y: cardTopY - 28,
      size: 7,
      font: fontRegular,
      color: textoGris,
    });

    // Badge pill con conteo de movimientos a la derecha de la cabecera
    const badgeMovsTxt = `${movs.length} ${movs.length === 1 ? "movimiento" : "movimientos"}`;
    const wBadge = fontRegular.widthOfTextAtSize(badgeMovsTxt, 6.5) + 14;
    drawPillBadge(
      currentPage,
      margenDer - 12 - wBadge,
      cardTopY - 26,
      wBadge,
      14,
      rgb(241 / 255, 245 / 255, 249 / 255),
      lineaFina,
      badgeMovsTxt,
      fontRegular,
      6.5,
      textoGris
    );

    // 3. Fila de 3 Cajas Métricas con bordes redondeados y padding interno
    const paddingCard = 12;
    const gapMetricas = 6;
    const wMetrica = (anchoContenido - 2 * paddingCard - 2 * gapMetricas) / 3;
    const metricasTopY = cardTopY - 36;

    // Caja 1: Ingresos (Fondo Menta suave + borde verde esmeralda + esquinas redondeadas)
    const box1X = margenX + paddingCard;
    drawRoundedBox(currentPage, box1X, metricasTopY, wMetrica, altoMetricas, 7, {
      color: rgb(240 / 255, 253 / 255, 244 / 255),
      borderColor: rgb(187 / 255, 247 / 255, 208 / 255),
      borderWidth: 0.8,
    });
    currentPage.drawText("INGRESOS", {
      x: box1X + 8,
      y: metricasTopY - 10,
      size: 5.5,
      font: fontBold,
      color: verdeConte,
    });
    currentPage.drawText(`+$${fmtUSD(p.ingresos)} USD`, {
      x: box1X + 8,
      y: metricasTopY - 20,
      size: 8.5,
      font: fontBold,
      color: verdeConte,
    });
    if (p.ingresosVes && p.ingresosVes > 0) {
      const bsTxt = `+Bs. ${Math.round(p.ingresosVes).toLocaleString("es-VE")}`;
      currentPage.drawText(bsTxt, {
        x: box1X + 8,
        y: metricasTopY - 28.5,
        size: 5.5,
        font: fontSemiBold,
        color: verdeConte,
      });
    }

    // Caja 2: Egresos (Fondo Rosa suave + borde carmesí + esquinas redondeadas)
    const box2X = box1X + wMetrica + gapMetricas;
    drawRoundedBox(currentPage, box2X, metricasTopY, wMetrica, altoMetricas, 7, {
      color: rgb(255 / 255, 241 / 255, 242 / 255),
      borderColor: rgb(254 / 255, 205 / 255, 211 / 255),
      borderWidth: 0.8,
    });
    currentPage.drawText("EGRESOS", {
      x: box2X + 8,
      y: metricasTopY - 10,
      size: 5.5,
      font: fontBold,
      color: rojoAlerta,
    });
    currentPage.drawText(`-$${fmtUSD(p.egresos)} USD`, {
      x: box2X + 8,
      y: metricasTopY - 20,
      size: 8.5,
      font: fontBold,
      color: rojoAlerta,
    });
    if (p.egresosVes && p.egresosVes > 0) {
      const bsTxt = `-Bs. ${Math.round(p.egresosVes).toLocaleString("es-VE")}`;
      currentPage.drawText(bsTxt, {
        x: box2X + 8,
        y: metricasTopY - 28.5,
        size: 5.5,
        font: fontSemiBold,
        color: rojoAlerta,
      });
    }

    // Caja 3: Balance Neto (Fondo Pizarra o Rosa + esquinas redondeadas)
    const box3X = box2X + wMetrica + gapMetricas;
    const esBalPos = p.balance >= 0;
    drawRoundedBox(currentPage, box3X, metricasTopY, wMetrica, altoMetricas, 7, {
      color: esBalPos ? rgb(248 / 255, 250 / 255, 252 / 255) : rgb(255 / 255, 241 / 255, 242 / 255),
      borderColor: esBalPos ? lineaFina : rgb(254 / 255, 205 / 255, 211 / 255),
      borderWidth: 0.8,
    });
    currentPage.drawText("BALANCE NETO", {
      x: box3X + 8,
      y: metricasTopY - 10,
      size: 5.5,
      font: fontBold,
      color: textoGris,
    });
    currentPage.drawText(`${esBalPos ? "+" : ""}$${fmtUSD(p.balance)} USD`, {
      x: box3X + 8,
      y: metricasTopY - 20,
      size: 8.5,
      font: fontBold,
      color: esBalPos ? azulOscuro : rojoAlerta,
    });
    if (pTieneBs) {
      currentPage.drawText("Balance del inmueble", {
        x: box3X + 8,
        y: metricasTopY - 28.5,
        size: 5.5,
        font: fontRegular,
        color: textoClaro,
      });
    }

    // Línea divisoria que separa la cabecera de la tabla de movimientos
    currentPage.drawLine({
      start: { x: margenX, y: headerBottomY },
      end: { x: margenDer, y: headerBottomY },
      thickness: 0.8,
      color: lineaFina,
    });

    y = headerBottomY;

    // 4. Subheader de Columnas de Movimientos
    const subHeaderY = y - altoSubHeader;
    currentPage.drawRectangle({
      x: margenX,
      y: subHeaderY,
      width: anchoContenido,
      height: altoSubHeader,
      color: rgb(248 / 255, 250 / 255, 252 / 255),
    });
    currentPage.drawLine({
      start: { x: margenX, y: subHeaderY },
      end: { x: margenDer, y: subHeaderY },
      thickness: 0.5,
      color: lineaFina,
    });

    const colFechaX = margenX + 12;
    const colConcX = margenX + 56;
    const colTipoX = margenX + 225;
    const colOrigX = margenX + 345;
    const colTasaX = margenX + 435;
    const colTotalX = margenDer - 12;

    currentPage.drawText("FECHA", { x: colFechaX, y: subHeaderY + 3.5, size: 6.5, font: fontBold, color: textoGris });
    currentPage.drawText("CONCEPTO / DESCRIPCIÓN", { x: colConcX, y: subHeaderY + 3.5, size: 6.5, font: fontBold, color: textoGris });
    currentPage.drawText("TIPO", { x: colTipoX, y: subHeaderY + 3.5, size: 6.5, font: fontBold, color: textoGris });
    currentPage.drawText("MONEDA ORIGEN", { x: colOrigX - fontBold.widthOfTextAtSize("MONEDA ORIGEN", 6.5), y: subHeaderY + 3.5, size: 6.5, font: fontBold, color: textoGris });
    currentPage.drawText("TASA BCV", { x: colTasaX - fontBold.widthOfTextAtSize("TASA BCV", 6.5), y: subHeaderY + 3.5, size: 6.5, font: fontBold, color: textoGris });
    currentPage.drawText("TOTAL USD", { x: colTotalX - fontBold.widthOfTextAtSize("TOTAL USD", 6.5), y: subHeaderY + 3.5, size: 6.5, font: fontBold, color: textoGris });

    y = subHeaderY;

    // 5. Filas de movimientos
    if (movs.length > 0) {
      for (let mIdx = 0; mIdx < movs.length; mIdx++) {
        const m = movs[mIdx];
        const altoFilaM = 18;

        if (y - altoFilaM < 60) {
          // Cerrar el borde redondeado del card en la página anterior
          const cardPartH = cardTopY - y;
          drawRoundedBox(currentPage, margenX, cardTopY, anchoContenido, cardPartH, 10, {
            borderColor: lineaFina,
            borderWidth: 0.8,
          });

          currentPage = doc.addPage([612, 792]);
          y = 730;
          currentPage.drawText(`INMOBILIARIA CONTÉ C.A. · ${nombreProp.toUpperCase()} (CONTINUACIÓN)`, {
            x: margenX,
            y,
            size: 9,
            font: fontBold,
            color: azulOscuro,
          });
          currentPage.drawLine({
            start: { x: margenX, y: y - 8 },
            end: { x: margenDer, y: y - 8 },
            thickness: 0.6,
            color: lineaFina,
          });
          y -= 25;

          // Subheader repetido en nueva página
          currentPage.drawRectangle({
            x: margenX,
            y: y - altoSubHeader,
            width: anchoContenido,
            height: altoSubHeader,
            color: rgb(248 / 255, 250 / 255, 252 / 255),
          });
          currentPage.drawLine({
            start: { x: margenX, y: y - altoSubHeader },
            end: { x: margenDer, y: y - altoSubHeader },
            thickness: 0.5,
            color: lineaFina,
          });
          currentPage.drawText("FECHA", { x: colFechaX, y: y - altoSubHeader + 3.5, size: 6.5, font: fontBold, color: textoGris });
          currentPage.drawText("CONCEPTO / DESCRIPCIÓN", { x: colConcX, y: y - altoSubHeader + 3.5, size: 6.5, font: fontBold, color: textoGris });
          currentPage.drawText("TIPO", { x: colTipoX, y: y - altoSubHeader + 3.5, size: 6.5, font: fontBold, color: textoGris });
          currentPage.drawText("MONEDA ORIGEN", { x: colOrigX - fontBold.widthOfTextAtSize("MONEDA ORIGEN", 6.5), y: y - altoSubHeader + 3.5, size: 6.5, font: fontBold, color: textoGris });
          currentPage.drawText("TASA BCV", { x: colTasaX - fontBold.widthOfTextAtSize("TASA BCV", 6.5), y: y - altoSubHeader + 3.5, size: 6.5, font: fontBold, color: textoGris });
          currentPage.drawText("TOTAL USD", { x: colTotalX - fontBold.widthOfTextAtSize("TOTAL USD", 6.5), y: y - altoSubHeader + 3.5, size: 6.5, font: fontBold, color: textoGris });
          y -= altoSubHeader;
        }

        const filaMY = y - altoFilaM;
        if (mIdx % 2 === 1) {
          currentPage.drawRectangle({
            x: margenX,
            y: filaMY,
            width: anchoContenido,
            height: altoFilaM,
            color: rgb(250 / 255, 252 / 255, 254 / 255),
          });
        }

        // Línea divisoria solo entre filas intermedias, no en la última
        if (mIdx < movs.length - 1) {
          currentPage.drawLine({
            start: { x: margenX + 10, y: filaMY },
            end: { x: margenDer - 10, y: filaMY },
            thickness: 0.4,
            color: lineaFina,
          });
        }

        // Fecha DD/MM
        const fechaPartes = m.fecha.split("-");
        const fechaFormateada = fechaPartes.length === 3 ? `${fechaPartes[2]}/${fechaPartes[1]}` : m.fecha;
        currentPage.drawText(fechaFormateada, {
          x: colFechaX,
          y: filaMY + 5.5,
          size: 7,
          font: fontRegular,
          color: textoDark,
        });

        // Concepto
        const conceptoTxt = m.concepto.length > 34 ? m.concepto.substring(0, 32) + "..." : m.concepto;
        currentPage.drawText(conceptoTxt, {
          x: colConcX,
          y: filaMY + 5.5,
          size: 7,
          font: fontSemiBold,
          color: textoDark,
        });

        // Badge de Tipo con esquinas 100% redondeadas (Pill)
        const esIng = m.tipo === "INGRESO";
        drawPillBadge(
          currentPage,
          colTipoX,
          filaMY + 3.5,
          44,
          11,
          esIng ? rgb(220 / 255, 252 / 255, 231 / 255) : rgb(255 / 255, 228 / 255, 230 / 255),
          esIng ? rgb(187 / 255, 247 / 255, 208 / 255) : rgb(254 / 255, 205 / 255, 211 / 255),
          esIng ? "INGRESO" : "EGRESO",
          fontBold,
          5.5,
          esIng ? verdeConte : rojoAlerta
        );

        // Moneda Origen
        const esVes = m.monedaOriginal === "VES";
        const montoOrigenTxt = esVes
          ? `Bs. ${(m.montoBs || (m.montoUsd * (m.tasaBcv || 1))).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `$${fmtUSD(m.montoUsd)} USD`;
        currentPage.drawText(montoOrigenTxt, {
          x: colOrigX - fontRegular.widthOfTextAtSize(montoOrigenTxt, 7),
          y: filaMY + 5.5,
          size: 7,
          font: fontRegular,
          color: esVes ? verdeConte : textoDark,
        });

        // Tasa BCV
        const tasaTxt = m.tasaBcv
          ? `${m.tasaBcv.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$`
          : "-";
        currentPage.drawText(tasaTxt, {
          x: colTasaX - fontSemiBold.widthOfTextAtSize(tasaTxt, 6.5),
          y: filaMY + 5.5,
          size: 6.5,
          font: fontSemiBold,
          color: m.tasaBcv ? azulOscuro : textoClaro,
        });

        // Total USD
        const usdTxt = `${esIng ? "+" : "-"}$${fmtUSD(m.montoUsd)}`;
        currentPage.drawText(usdTxt, {
          x: colTotalX - fontBold.widthOfTextAtSize(usdTxt, 7.5),
          y: filaMY + 5.5,
          size: 7.5,
          font: fontBold,
          color: esIng ? verdeConte : rojoAlerta,
        });

        y -= altoFilaM;
      }
    } else {
      const altoVacio = 20;
      const vacioY = y - altoVacio;
      currentPage.drawText("Sin movimientos registrados en este inmueble.", {
        x: colConcX,
        y: vacioY + 6.5,
        size: 7,
        font: fontRegular,
        color: textoClaro,
      });
      y = vacioY;
    }

    // 6. Marco Perimetral Completo del Card con BORDES REDONDEADOS limpios
    y -= 4; // Padding inferior suave para que la última fila no colisione con la curva del card
    const cardBottomY = y;
    const altoCardReal = cardTopY - cardBottomY;

    drawRoundedBox(currentPage, margenX, cardTopY, anchoContenido, altoCardReal, 10, {
      borderColor: lineaFina,
      borderWidth: 0.8,
    });

    // Espacio limpio entre cards
    y -= 16;
  }

  // 4. SECCIÓN: TOTAL CONSOLIDADO DEL PERÍODO (CARD ESTILO SISTEMA CON ESQUINAS REDONDEADAS)
  const altoBannerConsolidado = 28;
  const altoCuerpoConsolidado = 44;
  const altoTotalConsolidado = altoBannerConsolidado + altoCuerpoConsolidado;

  if (y < altoTotalConsolidado + 40) {
    currentPage = doc.addPage([612, 792]);
    y = 730;
  }

  const cardConsTopY = y;
  const bannerConsY = cardConsTopY - altoBannerConsolidado;
  const cuerpoConsY = bannerConsY - altoCuerpoConsolidado;

  // Fondo blanco base con esquinas redondeadas completas
  drawRoundedBox(currentPage, margenX, cardConsTopY, anchoContenido, altoTotalConsolidado, 12, {
    color: blancoPuro,
    borderColor: esUtilidad ? rgb(187 / 255, 247 / 255, 208 / 255) : rgb(254 / 255, 205 / 255, 211 / 255),
    borderWidth: 1.2,
  });

  // Banner superior con color temático institucional y esquinas superiores redondeadas
  drawRoundedBox(currentPage, margenX, cardConsTopY, anchoContenido, altoBannerConsolidado, 12, {
    color: esUtilidad ? verdeConte : rojoAlerta,
    corners: { tl: true, tr: true, br: false, bl: false },
  });

  // Título e info a la izquierda
  currentPage.drawText("RESUMEN DEL PERÍODO", {
    x: margenX + 14,
    y: bannerConsY + 16,
    size: 5.5,
    font: fontBold,
    color: rgb(220 / 255, 252 / 255, 231 / 255),
  });
  currentPage.drawText("Total Consolidado", {
    x: margenX + 14,
    y: bannerConsY + 6,
    size: 9.5,
    font: fontBold,
    color: blancoPuro,
  });

  // Utilidad Neta a la derecha
  const netLabel = esUtilidad ? "UTILIDAD NETA" : "DÉFICIT OPERATIVO";
  currentPage.drawText(netLabel, {
    x: margenDer - 14 - fontBold.widthOfTextAtSize(netLabel, 5.5),
    y: bannerConsY + 16,
    size: 5.5,
    font: fontBold,
    color: rgb(220 / 255, 252 / 255, 231 / 255),
  });
  const netValTxt = `${esUtilidad ? "+" : ""}$${fmtUSD(data.balanceNeto)} USD`;
  currentPage.drawText(netValTxt, {
    x: margenDer - 14 - fontBold.widthOfTextAtSize(netValTxt, 11),
    y: bannerConsY + 5,
    size: 11,
    font: fontBold,
    color: blancoPuro,
  });

  const totIngVesVal = data.totalIngresosVes || 0;
  const totEgrVesVal = data.totalEgresosVes || 0;
  const totIngUsdVal = data.totalIngresosUsd ?? data.totalIngresos;
  const totEgrUsdVal = data.totalEgresosUsd ?? data.totalEgresos;

  const wSubCard = (anchoContenido - 28 - 10) / 2;
  const altoSubCard = 30;
  const subCardTopY = bannerConsY - 7;

  // Sub-tarjeta 1: Ingresos Totales (Bordes redondeados)
  const subCard1X = margenX + 14;
  drawRoundedBox(currentPage, subCard1X, subCardTopY, wSubCard, altoSubCard, 8, {
    color: rgb(240 / 255, 253 / 255, 244 / 255),
    borderColor: rgb(187 / 255, 247 / 255, 208 / 255),
    borderWidth: 0.8,
  });
  currentPage.drawText("TOTAL INGRESOS", {
    x: subCard1X + 10,
    y: subCardTopY - 10,
    size: 5.5,
    font: fontBold,
    color: verdeConte,
  });
  currentPage.drawText(`+$${fmtUSD(data.totalIngresos)} USD`, {
    x: subCard1X + 10,
    y: subCardTopY - 21,
    size: 9,
    font: fontBold,
    color: verdeConte,
  });
  if (totIngVesVal > 0) {
    const subIngBs = `Divisas: $${fmtUSD(totIngUsdVal)} · Bs: ${Math.round(totIngVesVal).toLocaleString("es-VE")}`;
    currentPage.drawText(subIngBs, {
      x: subCard1X + wSubCard - 10 - fontRegular.widthOfTextAtSize(subIngBs, 6),
      y: subCardTopY - 18,
      size: 6,
      font: fontRegular,
      color: verdeConte,
    });
  }

  // Sub-tarjeta 2: Egresos Totales (Bordes redondeados)
  const subCard2X = subCard1X + wSubCard + 10;
  drawRoundedBox(currentPage, subCard2X, subCardTopY, wSubCard, altoSubCard, 8, {
    color: rgb(255 / 255, 241 / 255, 242 / 255),
    borderColor: rgb(254 / 255, 205 / 255, 211 / 255),
    borderWidth: 0.8,
  });
  currentPage.drawText("TOTAL EGRESOS", {
    x: subCard2X + 10,
    y: subCardTopY - 10,
    size: 5.5,
    font: fontBold,
    color: rojoAlerta,
  });
  currentPage.drawText(`-$${fmtUSD(data.totalEgresos)} USD`, {
    x: subCard2X + 10,
    y: subCardTopY - 21,
    size: 9,
    font: fontBold,
    color: rojoAlerta,
  });
  if (totEgrVesVal > 0) {
    const subEgrBs = `Divisas: $${fmtUSD(totEgrUsdVal)} · Bs: ${Math.round(totEgrVesVal).toLocaleString("es-VE")}`;
    currentPage.drawText(subEgrBs, {
      x: subCard2X + wSubCard - 10 - fontRegular.widthOfTextAtSize(subEgrBs, 6),
      y: subCardTopY - 18,
      size: 6,
      font: fontRegular,
      color: rojoAlerta,
    });
  }

  y = cuerpoConsY - 20;

  // 5. CERTIFICACIÓN Y SECCIÓN DE FIRMAS
  let firmasPage = currentPage;
  let firmasY = 110;
  const anchoFirma = 170;

  // Si el contenido se extiende por debajo de 150 pt, enviar firmas a página nueva
  if (y < 150) {
    firmasPage = doc.addPage([612, 792]);
    firmasY = 650;
  }

  // Firma Administrador
  firmasPage.drawLine({
    start: { x: margenX + 20, y: firmasY },
    end: { x: margenX + 20 + anchoFirma, y: firmasY },
    thickness: 0.8,
    color: lineaFina,
  });
  firmasPage.drawText("Administración Contable", {
    x: margenX + 20 + (anchoFirma - fontBold.widthOfTextAtSize("Administración Contable", 7.5)) / 2,
    y: firmasY - 12,
    size: 7.5,
    font: fontBold,
    color: textoDark,
  });
  firmasPage.drawText("Inmobiliaria Conté C.A.", {
    x: margenX + 20 + (anchoFirma - fontRegular.widthOfTextAtSize("Inmobiliaria Conté C.A.", 6.5)) / 2,
    y: firmasY - 22,
    size: 6.5,
    font: fontRegular,
    color: textoClaro,
  });

  // Firma Gerencia
  const firmaDerX = margenDer - 20 - anchoFirma;
  firmasPage.drawLine({
    start: { x: firmaDerX, y: firmasY },
    end: { x: firmaDerX + anchoFirma, y: firmasY },
    thickness: 0.8,
    color: lineaFina,
  });
  firmasPage.drawText("Gerencia General", {
    x: firmaDerX + (anchoFirma - fontBold.widthOfTextAtSize("Gerencia General", 7.5)) / 2,
    y: firmasY - 12,
    size: 7.5,
    font: fontBold,
    color: textoDark,
  });
  firmasPage.drawText("Inmobiliaria Conté C.A.", {
    x: firmaDerX + (anchoFirma - fontRegular.widthOfTextAtSize("Inmobiliaria Conté C.A.", 6.5)) / 2,
    y: firmasY - 22,
    size: 6.5,
    font: fontRegular,
    color: textoClaro,
  });

  // 5. PIE DE PÁGINA INSTITUCIONAL MULTIPÁGINA
  const paginas = doc.getPages();
  const totalPags = paginas.length;
  for (let i = 0; i < totalPags; i++) {
    const p = paginas[i];
    const pieY = 32;
    p.drawLine({
      start: { x: margenX, y: pieY + 10 },
      end: { x: margenDer, y: pieY + 10 },
      thickness: 0.6,
      color: lineaFina,
    });
    const pieTexto = `Inmobiliaria Conté C.A. · Documento oficial de cierre contable · Página ${i + 1} de ${totalPags}`;
    p.drawText(pieTexto, {
      x: (width - fontRegular.widthOfTextAtSize(pieTexto, 6.5)) / 2,
      y: pieY,
      size: 6.5,
      font: fontRegular,
      color: textoClaro,
    });
  }

  // Guardar documento con compresión GZIP/Flate de streams (reduce peso drásticamente)
  const pdfBytes = await doc.save({ useObjectStreams: true });
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
