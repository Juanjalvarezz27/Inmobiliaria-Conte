import https from "node:https";
import { prisma } from "@/lib/prisma";

export interface TasaBcvResponse {
  tasa: number;
  fechaActualizacion: string;
  fuente: string;
  esFallback: boolean;
  fechaValorTexto?: string;
  fechaValorIso?: string;
}

// Tasa de contingencia fija por si no hay red ni historico previo
export const TASA_FALLBACK_DEFAULT = 904.45;

// Variable en memoria para cache local
let cacheTasa: {
  data: TasaBcvResponse;
  timestamp: number;
} | null = null;

// Duracion del cache en memoria: 5 minutos
const CACHE_TTL_MS = 5 * 60 * 1000;

// Obtener fecha del dia de hoy en zona horaria venezolana (YYYY-MM-DD)
export function obtenerFechaHoyVenezuela(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

// Estructura interna estandar para cualquier proveedor de tasas
interface ProveedorTasaResult {
  tasa: number;
  fuente: string;
  fechaValorTexto?: string;
  fechaValorIso?: string;
}

// Normalizador numerico que procesa tanto comas como puntos decimales
function normalizarMontoMoneda(raw: string): number {
  const limpio = raw.trim();
  if (limpio.includes(",")) {
    return parseFloat(limpio.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(limpio);
}

// Proveedor 1: Conexion directa al portal oficial bcv.org.ve
function consultarBcvOficial(): Promise<ProveedorTasaResult> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "www.bcv.org.ve",
      port: 443,
      path: "/",
      method: "GET",
      rejectUnauthorized: false,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-VE,es-ES,es;q=0.9,en;q=0.8",
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`BCV HTTP ${res.statusCode}`));
      }
      let html = "";
      res.on("data", (chunk) => {
        html += chunk;
      });
      res.on("end", () => {
        try {
          const regexUSD = /id=["']dolar["'][\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i;
          const matchUSD = html.match(regexUSD);
          if (!matchUSD) {
            return reject(new Error("Contenedor de USD no encontrado en bcv.org.ve"));
          }
          const tasa = normalizarMontoMoneda(matchUSD[1]);
          if (isNaN(tasa) || tasa <= 0) {
            return reject(new Error(`Tasa BCV invalida: ${matchUSD[1]}`));
          }

          const regexFechaTexto = /Fecha\s*Valor:[\s\S]*?<span[^>]*class=["'][^"']*date-display-single[^"']*["'][^>]*>([\s\S]*?)<\/span>/i;
          const matchTexto = html.match(regexFechaTexto);
          const fechaValorTexto = matchTexto ? matchTexto[1].replace(/\s+/g, " ").trim() : undefined;

          const regexFechaIso = /Fecha\s*Valor:[\s\S]*?content=["']([^"']+)["']/i;
          const matchIso = html.match(regexFechaIso);
          const fechaValorIso = matchIso ? matchIso[1].split("T")[0] : undefined;

          resolve({
            tasa: Number(tasa.toFixed(4)),
            fuente: `Banco Central de Venezuela (${fechaValorTexto || "Portal Oficial"})`,
            fechaValorTexto,
            fechaValorIso,
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.setTimeout(5000, () => {
      req.destroy(new Error("Timeout al conectar con bcv.org.ve"));
    });
    req.end();
  });
}

// Proveedor 2: CDN Global ExchangeRate-API (alta velocidad y disponibilidad)
async function consultarExchangeRateApi(): Promise<ProveedorTasaResult> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    signal: AbortSignal.timeout(3500),
  });
  if (!res.ok) {
    throw new Error(`ExchangeRate-API HTTP ${res.status}`);
  }
  const data = await res.json();
  const tasa = Number(data?.rates?.VES);
  if (!tasa || isNaN(tasa) || tasa <= 0) {
    throw new Error("Tasa VES no disponible en ExchangeRate-API");
  }

  const fechaValorIso = data?.time_last_update_utc
    ? new Date(data.time_last_update_utc).toISOString().split("T")[0]
    : undefined;

  return {
    tasa: Number(tasa.toFixed(4)),
    fuente: "ExchangeRate-API (CDN Global BCV)",
    fechaValorIso,
  };
}

// Proveedor 3: Scraping directo de mesas de cambio de Banca y Negocios
async function consultarBancaYNegocios(): Promise<ProveedorTasaResult> {
  const res = await fetch("https://www.bancaynegocios.com", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`Banca y Negocios HTTP ${res.status}`);
  }
  const html = await res.text();
  const match = html.match(
    /D(?:&oacute;|ó)lar oficial<\/td>\s*<td>[0-9.,]+<\/td>\s*<td>([0-9.,]+)<\/td>/i
  );
  if (!match) {
    throw new Error("Tabla oficial BCV no hallada en Banca y Negocios");
  }
  const tasa = normalizarMontoMoneda(match[1]);
  if (isNaN(tasa) || tasa <= 0) {
    throw new Error(`Tasa invalida en Banca y Negocios: ${match[1]}`);
  }

  return {
    tasa: Number(tasa.toFixed(4)),
    fuente: "Banca y Negocios (Mesas de Cambio BCV)",
  };
}

// Proveedor 4: API DolarApi oficial
async function consultarDolarApi(): Promise<ProveedorTasaResult> {
  const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`DolarApi HTTP ${res.status}`);
  }
  const json = await res.json();
  const promedio = Number(json?.promedio);
  if (!promedio || isNaN(promedio) || promedio <= 0) {
    throw new Error("Promedio invalido en DolarApi");
  }

  const fechaValorIso = json?.fechaActualizacion
    ? String(json.fechaActualizacion).split("T")[0]
    : undefined;

  return {
    tasa: Number(promedio.toFixed(4)),
    fuente: "Banco Central de Venezuela (DolarApi)",
    fechaValorIso,
  };
}

// Consultar la tasa oficial con cascada de fallbacks y validacion de frescura
export async function getTasaBcvOficial(forceRefresh = false): Promise<TasaBcvResponse> {
  const ahora = Date.now();
  const hoyStr = obtenerFechaHoyVenezuela();

  // 1. Validar si el cache en memoria sigue vigente
  if (!forceRefresh && cacheTasa && ahora - cacheTasa.timestamp < CACHE_TTL_MS) {
    return cacheTasa.data;
  }

  // 2. Obtener la referencia historica minima para descartar fuentes obsoletas
  let tasaMinimaAceptable = 0;
  try {
    const ultimoRegistro = await prisma.historialTasaBcv.findFirst({
      orderBy: { fechaStr: "desc" },
      select: { tasa: true },
    });
    if (ultimoRegistro?.tasa) {
      tasaMinimaAceptable = ultimoRegistro.tasa;
    }
  } catch (dbErr) {
    console.warn("No se pudo consultar referencia historica en BD:", dbErr);
  }

  // 3. Cadena jerarquica de proveedores externos ordenados por fidelidad y velocidad
  const proveedores = [
    { nombre: "BCV Oficial (Portal)", fn: consultarBcvOficial },
    { nombre: "ExchangeRate-API (CDN Global)", fn: consultarExchangeRateApi },
    { nombre: "Banca y Negocios", fn: consultarBancaYNegocios },
    { nombre: "DolarApi", fn: consultarDolarApi },
  ];

  for (const prov of proveedores) {
    try {
      const res = await prov.fn();
      if (res.tasa > 0) {
        // Descartar si el proveedor devuelve una tasa desactualizada frente a la verificada en BD
        if (tasaMinimaAceptable > 0 && res.tasa < tasaMinimaAceptable * 0.99) {
          console.warn(
            `[BCV Fallback] ${prov.nombre} descartado por desactualizado: ${res.tasa} < ${tasaMinimaAceptable}`
          );
          continue;
        }

        const resultado: TasaBcvResponse = {
          tasa: res.tasa,
          fechaActualizacion: res.fechaValorIso || hoyStr,
          fuente: res.fuente,
          esFallback: prov.nombre !== "BCV Oficial (Portal)",
          fechaValorTexto: res.fechaValorTexto,
          fechaValorIso: res.fechaValorIso,
        };

        // Persistir en base de datos para la fecha de hoy
        try {
          await prisma.historialTasaBcv.upsert({
            where: { fechaStr: hoyStr },
            update: {
              tasa: res.tasa,
              fuente: res.fuente,
              fecha: new Date(),
            },
            create: {
              fechaStr: hoyStr,
              tasa: res.tasa,
              fuente: res.fuente,
              fecha: new Date(),
            },
          });

          // Registrar tambien para la fecha valor futura si aplica
          if (res.fechaValorIso && res.fechaValorIso !== hoyStr) {
            await prisma.historialTasaBcv.upsert({
              where: { fechaStr: res.fechaValorIso },
              update: {
                tasa: res.tasa,
                fuente: res.fuente,
                fecha: new Date(),
              },
              create: {
                fechaStr: res.fechaValorIso,
                tasa: res.tasa,
                fuente: res.fuente,
                fecha: new Date(),
              },
            });
          }
        } catch (dbSaveErr) {
          console.warn("No se pudo persistir la tasa en la BD:", dbSaveErr);
        }

        cacheTasa = {
          data: resultado,
          timestamp: ahora,
        };

        return resultado;
      }
    } catch (err) {
      console.warn(`[BCV Fallback] Fallo proveedor ${prov.nombre}:`, err);
    }
  }

  // 4. Contingencia Nivel 1: Tasa previamente registrada hoy en la BD
  try {
    const registroHoy = await prisma.historialTasaBcv.findUnique({
      where: { fechaStr: hoyStr },
    });

    if (registroHoy && registroHoy.tasa > 0) {
      const resultado: TasaBcvResponse = {
        tasa: registroHoy.tasa,
        fechaActualizacion: registroHoy.fechaStr,
        fuente: `Banco Central de Venezuela (Cache local ${registroHoy.fechaStr})`,
        esFallback: true,
      };

      cacheTasa = {
        data: resultado,
        timestamp: ahora,
      };

      return resultado;
    }
  } catch (dbReadErr) {
    console.warn("No se pudo leer la tasa de hoy en BD, intentando historico:", dbReadErr);
  }

  // 5. Contingencia Nivel 2: Ultima tasa historica registrada en la BD
  try {
    const ultimoRegistro = await prisma.historialTasaBcv.findFirst({
      orderBy: { fechaStr: "desc" },
    });

    if (ultimoRegistro?.tasa) {
      const resultado: TasaBcvResponse = {
        tasa: ultimoRegistro.tasa,
        fechaActualizacion: ultimoRegistro.fechaStr,
        fuente: `Historial de Base de Datos (${ultimoRegistro.fechaStr})`,
        esFallback: true,
      };

      cacheTasa = {
        data: resultado,
        timestamp: ahora,
      };

      return resultado;
    }
  } catch (dbHistErr) {
    console.error("Error al consultar ultimo registro en historialTasaBcv:", dbHistErr);
  }

  // 6. Contingencia Nivel 3: Ultima transaccion financiera con tasa registrada
  try {
    const ultimaTransaccionConTasa = await prisma.transaccionFinanciera.findFirst({
      where: {
        tasaBcv: { not: null, gt: 0 },
      },
      orderBy: { fecha: "desc" },
      select: { tasaBcv: true, fecha: true },
    });

    if (ultimaTransaccionConTasa?.tasaBcv) {
      const resultado: TasaBcvResponse = {
        tasa: ultimaTransaccionConTasa.tasaBcv,
        fechaActualizacion: ultimaTransaccionConTasa.fecha.toISOString().split("T")[0],
        fuente: "Ultima Tasa Registrada en Movimiento",
        esFallback: true,
      };

      cacheTasa = {
        data: resultado,
        timestamp: ahora,
      };

      return resultado;
    }
  } catch (dbTxErr) {
    console.error("Error al buscar tasa previa en transacciones:", dbTxErr);
  }

  // 7. Contingencia Nivel 4: Tasa fija por defecto
  return {
    tasa: TASA_FALLBACK_DEFAULT,
    fechaActualizacion: new Date().toISOString(),
    fuente: "Tasa Estandar de Contingencia",
    esFallback: true,
  };
}

// Consultar la tasa historica para una fecha especifica (YYYY-MM-DD)
export async function getTasaBcvPorFecha(fechaStr: string): Promise<TasaBcvResponse> {
  const hoyStr = obtenerFechaHoyVenezuela();
  if (fechaStr >= hoyStr) {
    return getTasaBcvOficial();
  }

  try {
    // 1. Buscar la tasa exacta registrada en esa fecha
    const registroExacto = await prisma.historialTasaBcv.findUnique({
      where: { fechaStr },
    });

    if (registroExacto && registroExacto.tasa > 0) {
      return {
        tasa: registroExacto.tasa,
        fechaActualizacion: registroExacto.fechaStr,
        fuente: `Historial Oficial del ${registroExacto.fechaStr}`,
        esFallback: false,
      };
    }

    // 2. Si no hay registro en esa fecha, buscar el dia habil previo mas cercano
    const registroPrevio = await prisma.historialTasaBcv.findFirst({
      where: { fechaStr: { lte: fechaStr } },
      orderBy: { fechaStr: "desc" },
    });

    if (registroPrevio && registroPrevio.tasa > 0) {
      return {
        tasa: registroPrevio.tasa,
        fechaActualizacion: registroPrevio.fechaStr,
        fuente: `Historial Oficial (Dia habil: ${registroPrevio.fechaStr})`,
        esFallback: false,
      };
    }

    // 3. Buscar en transacciones financieras registradas en o antes de esa fecha
    const txConTasa = await prisma.transaccionFinanciera.findFirst({
      where: {
        tasaBcv: { not: null, gt: 0 },
        fecha: { lte: new Date(`${fechaStr}T23:59:59Z`) },
      },
      orderBy: { fecha: "desc" },
      select: { tasaBcv: true, fecha: true },
    });

    if (txConTasa?.tasaBcv) {
      return {
        tasa: txConTasa.tasaBcv,
        fechaActualizacion: txConTasa.fecha.toISOString().split("T")[0],
        fuente: `Tasa Registrada en Movimiento (${txConTasa.fecha.toISOString().split("T")[0]})`,
        esFallback: true,
      };
    }
  } catch (err) {
    console.error("Error al buscar tasa por fecha historica:", err);
  }

  return getTasaBcvOficial();
}

// Consultar la tasa oficial de cierre de un mes especifico para Cierre Contable y PDF
export async function getTasaBcvCierreMes(mes: number, ano: number): Promise<number> {
  const mesStr = mes.toString().padStart(2, "0");
  const prefijoMes = `${ano}-${mesStr}`;
  const hoyStr = obtenerFechaHoyVenezuela();

  try {
    // 1. Buscar la ultima tasa historica registrada en ese mes especifico
    const ultimoRegistroMes = await prisma.historialTasaBcv.findFirst({
      where: {
        fechaStr: {
          startsWith: prefijoMes,
        },
      },
      orderBy: { fechaStr: "desc" },
    });

    if (ultimoRegistroMes?.tasa) {
      return ultimoRegistroMes.tasa;
    }

    // 2. Si es el mes en curso y aun no hay registros, consultar y registrar hoy
    if (hoyStr.startsWith(prefijoMes)) {
      const hoyData = await getTasaBcvOficial();
      return hoyData.tasa;
    }

    // 3. Buscar si hubo transacciones con tasa en ese mes
    const txConTasa = await prisma.transaccionFinanciera.findFirst({
      where: {
        periodoMes: mes,
        periodoAno: ano,
        tasaBcv: { not: null, gt: 0 },
      },
      orderBy: { fecha: "desc" },
      select: { tasaBcv: true },
    });

    if (txConTasa?.tasaBcv) {
      return txConTasa.tasaBcv;
    }

    // 4. Buscar el ultimo registro historico antes de que terminara ese mes
    const ultimoAntesDeMes = await prisma.historialTasaBcv.findFirst({
      where: { fechaStr: { lte: `${ano}-${mesStr}-31` } },
      orderBy: { fechaStr: "desc" },
    });

    if (ultimoAntesDeMes?.tasa) {
      return ultimoAntesDeMes.tasa;
    }
  } catch (err) {
    console.error("Error al buscar tasa de cierre de mes:", err);
  }

  // Fallback seguro a la tasa del dia
  try {
    const fallback = await getTasaBcvOficial();
    return fallback.tasa;
  } catch {
    return TASA_FALLBACK_DEFAULT;
  }
}
