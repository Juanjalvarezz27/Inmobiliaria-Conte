import { prisma } from "@/lib/prisma";

export interface TasaBcvResponse {
  tasa: number;
  fechaActualizacion: string;
  fuente: string;
  esFallback: boolean;
}

// Tasa de contingencia fija por si no hay red ni histórico previo
export const TASA_FALLBACK_DEFAULT = 904.45;

// Variable en memoria para caché local
let cacheTasa: {
  data: TasaBcvResponse;
  timestamp: number;
} | null = null;

// Duración del caché en memoria: 10 minutos (balance óptimo entre frescura y no saturar la API)
const CACHE_TTL_MS = 10 * 60 * 1000;

// Obtener fecha del día de hoy en zona horaria venezolana (YYYY-MM-DD)
export function obtenerFechaHoyVenezuela(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

// Consultar y guardar automáticamente la tasa oficial BCV del día en la BD
export async function getTasaBcvOficial(forceRefresh = false): Promise<TasaBcvResponse> {
  const ahora = Date.now();
  const hoyStr = obtenerFechaHoyVenezuela();

  // 1. Verificar si el caché en memoria sigue vigente (si no se fuerza la recarga)
  if (
    !forceRefresh &&
    cacheTasa &&
    ahora - cacheTasa.timestamp < CACHE_TTL_MS
  ) {
    return cacheTasa.data;
  }

  // 2. Consultar SIEMPRE primero la API oficial de DolarApi en tiempo real
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const promedio = Number(json?.promedio);

      if (!isNaN(promedio) && promedio > 0) {
        const tasaOficial = Number(promedio.toFixed(4));
        const resultado: TasaBcvResponse = {
          tasa: tasaOficial,
          fechaActualizacion: json?.fechaActualizacion || new Date().toISOString(),
          fuente: "Banco Central de Venezuela (DolarApi)",
          esFallback: false,
        };

        // Guardar o actualizar la tasa en la base de datos para hoy
        try {
          await prisma.historialTasaBcv.upsert({
            where: { fechaStr: hoyStr },
            update: {
              tasa: tasaOficial,
              fuente: "Banco Central de Venezuela (DolarApi)",
              fecha: new Date(),
            },
            create: {
              fechaStr: hoyStr,
              tasa: tasaOficial,
              fuente: "Banco Central de Venezuela (DolarApi)",
              fecha: new Date(),
            },
          });
        } catch (dbSaveErr) {
          console.warn("No se pudo persistir la tasa del día en la BD:", dbSaveErr);
        }

        cacheTasa = {
          data: resultado,
          timestamp: ahora,
        };

        return resultado;
      }
    }
  } catch (error) {
    console.warn("No se pudo consultar DolarApi en tiempo real, buscando en histórico de BD:", error);
  }

  // 3. Contingencia Nivel 1: Tasa previamente registrada hoy en la BD (solo si la API externa falló)
  try {
    const registroHoy = await prisma.historialTasaBcv.findUnique({
      where: { fechaStr: hoyStr },
    });

    if (registroHoy && registroHoy.tasa > 0) {
      const resultado: TasaBcvResponse = {
        tasa: registroHoy.tasa,
        fechaActualizacion: registroHoy.fechaStr,
        fuente: `Banco Central de Venezuela (Caché local ${registroHoy.fechaStr})`,
        esFallback: false,
      };

      cacheTasa = {
        data: resultado,
        timestamp: ahora,
      };

      return resultado;
    }
  } catch (dbReadErr) {
    console.warn("No se pudo leer la tasa de hoy en BD, intentando histórico:", dbReadErr);
  }

  // 4. Contingencia Nivel 1: Última tasa histórica registrada en la BD
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
    console.error("Error al consultar último registro en historialTasaBcv:", dbHistErr);
  }

  // 5. Contingencia Nivel 2: Última transacción financiera con tasa registrada
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
        fuente: "Última Tasa Registrada en Movimiento",
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

  // 6. Contingencia Nivel 3: Tasa fija por defecto
  return {
    tasa: TASA_FALLBACK_DEFAULT,
    fechaActualizacion: new Date().toISOString(),
    fuente: "Tasa Estándar de Contingencia",
    esFallback: true,
  };
}

// Consultar la tasa histórica para una fecha específica (YYYY-MM-DD)
export async function getTasaBcvPorFecha(fechaStr: string): Promise<TasaBcvResponse> {
  const hoyStr = obtenerFechaHoyVenezuela();
  if (fechaStr === hoyStr) {
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

    // 2. Si no hay registro en esa fecha (ej: fin de semana o feriado), buscar el día hábil previo más cercano
    const registroPrevio = await prisma.historialTasaBcv.findFirst({
      where: { fechaStr: { lte: fechaStr } },
      orderBy: { fechaStr: "desc" },
    });

    if (registroPrevio && registroPrevio.tasa > 0) {
      return {
        tasa: registroPrevio.tasa,
        fechaActualizacion: registroPrevio.fechaStr,
        fuente: `Historial Oficial (Día hábil: ${registroPrevio.fechaStr})`,
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
    console.error("Error al buscar tasa por fecha histórica:", err);
  }

  return getTasaBcvOficial();
}

// Consultar la tasa oficial de cierre de un mes específico para Cierre Contable y PDF
export async function getTasaBcvCierreMes(mes: number, ano: number): Promise<number> {
  const mesStr = mes.toString().padStart(2, "0");
  const prefijoMes = `${ano}-${mesStr}`;
  const hoyStr = obtenerFechaHoyVenezuela();

  try {
    // 1. Buscar la última tasa histórica registrada en ese mes específico
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

    // 2. Si es el mes en curso y aún no hay registros, consultar y registrar hoy
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

    // 4. Buscar el último registro histórico antes de que terminara ese mes
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

  // Fallback seguro a la tasa del día
  try {
    const fallback = await getTasaBcvOficial();
    return fallback.tasa;
  } catch {
    return TASA_FALLBACK_DEFAULT;
  }
}
