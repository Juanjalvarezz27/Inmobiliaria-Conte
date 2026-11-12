"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { EstadoContrato, EstadoPago, MetodoPago, MonedaTransaccion, Prisma, TransaccionPago } from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";
import { getPropiedadesOpciones } from "./propiedades";
import type { PagoItem, EstadisticasCobranza } from "@/app/admin/cobranza/types";
import { enviarNotificacionPagoConfirmadoInquilino } from "@/lib/email-templates/notificacion-pago-confirmado";
import { enviarNotificacionPagoRechazadoInquilino } from "@/lib/email-templates/notificacion-pago-rechazado";

/**
 * Ejecuta tareas asíncronas no críticas (como envío de correos SMTP) en segundo plano
 * garantizando que la Server Action responda al cliente en milisegundos sin bloqueos.
 */
function ejecutarEnSegundoPlano(tarea: () => Promise<unknown>) {
  try {
    after(async () => {
      try {
        await tarea();
      } catch (err) {
        console.error("Error en tarea de segundo plano:", err);
      }
    });
  } catch {
    tarea().catch((err) => {
      console.error("Error en tarea de segundo plano (fallback):", err);
    });
  }
}

const PAGE_SIZE = 20;

// Esquema de validación para asentar un pago
const registrarPagoSchema = z.object({
  pagoId: z.string().min(1, "El identificador del cobro es requerido"),
  montoPagado: z.coerce.number().positive("El monto pagado debe ser mayor a 0"),
  fechaPago: z.string().min(1, "La fecha de pago es requerida"),
  metodoPago: z.nativeEnum(MetodoPago),
  monedaOriginal: z.nativeEnum(MonedaTransaccion).optional().nullable(),
  montoOriginal: z.coerce.number().positive().optional().nullable(),
  montoBs: z.coerce.number().positive().optional().nullable(),
  tasaBcv: z.coerce.number().positive().optional().nullable(),
  referencia: z.string().optional().nullable(),
  comprobanteUrl: z.string().optional().nullable().or(z.literal("")),
  notas: z.string().optional().nullable(),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

// Proyección completa solo para el modal de ficha detallada
const PAGO_SELECT = {
  id: true,
  contratoId: true,
  periodoMes: true,
  periodoAno: true,
  montoEsperado: true,
  montoPagado: true,
  monedaOriginal: true,
  montoOriginal: true,
  montoBs: true,
  tasaBcv: true,
  fechaVencimiento: true,
  fechaPago: true,
  metodoPago: true,
  referencia: true,
  comprobanteUrl: true,
  estado: true,
  notas: true,
  // Control de Servicios Públicos (Fase 27)
  luzSolvente: true,
  luzNumeroFactura: true,
  luzComprobanteUrl: true,
  aguaSolvente: true,
  aguaNumeroFactura: true,
  aguaComprobanteUrl: true,
  serviciosObservaciones: true,
  fechaRevisionServicios: true,
  createdAt: true,
  updatedAt: true,
  transacciones: {
    select: {
      id: true,
      pagoId: true,
      monto: true,
      monedaOriginal: true,
      montoOriginal: true,
      montoBs: true,
      tasaBcv: true,
      fechaPago: true,
      metodoPago: true,
      referencia: true,
      comprobanteUrl: true,
      notas: true,
      createdAt: true,
    },
    orderBy: {
      fechaPago: "asc" as const,
    },
  },
  contrato: {
    select: {
      id: true,
      codigo: true,
      diaCobro: true,
      moneda: true,
      fechaInicio: true,
      fechaFin: true,
      montoAlquiler: true,
      depositoGarantia: true,
      estado: true,
      documentoUrl: true,
      notas: true,
      unidad: {
        select: {
          id: true,
          codigo: true,
          tipo: true,
          piso: true,
          areaMt2: true,
          precioAlquiler: true,
          descripcion: true,
          imagenes: true,
          propiedad: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              direccion: true,
              ciudad: true,
              propietario: true,
              telefonoContacto: true,
            },
          },
        },
      },
      inquilino: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          tipoPersona: true,
          documentoIdentidad: true,
          telefono: true,
          telefonoSecundario: true,
          email: true,
          direccion: true,
          usuario: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  },
};

// Proyección ligera para el listado de tarjetas — solo lo que se muestra en pantalla
const PAGO_LIST_SELECT = {
  id: true,
  contratoId: true,
  periodoMes: true,
  periodoAno: true,
  montoEsperado: true,
  montoPagado: true,
  monedaOriginal: true,
  montoOriginal: true,
  montoBs: true,
  tasaBcv: true,
  fechaVencimiento: true,
  fechaPago: true,
  metodoPago: true,
  referencia: true,
  comprobanteUrl: true,
  estado: true,
  notas: true,
  // Control de Servicios Públicos (Fase 27)
  luzSolvente: true,
  luzNumeroFactura: true,
  luzComprobanteUrl: true,
  aguaSolvente: true,
  aguaNumeroFactura: true,
  aguaComprobanteUrl: true,
  serviciosObservaciones: true,
  fechaRevisionServicios: true,
  createdAt: true,
  updatedAt: true,
  transacciones: {
    select: {
      id: true,
      pagoId: true,
      monto: true,
      monedaOriginal: true,
      montoOriginal: true,
      montoBs: true,
      tasaBcv: true,
      fechaPago: true,
      metodoPago: true,
      referencia: true,
      comprobanteUrl: true,
      notas: true,
      createdAt: true,
    },
    orderBy: {
      fechaPago: "asc" as const,
    },
  },
  contrato: {
    select: {
      id: true,
      codigo: true,
      diaCobro: true,
      moneda: true,
      montoAlquiler: true,
      unidad: {
        select: {
          id: true,
          codigo: true,
          tipo: true,
          propiedad: {
            select: {
              id: true,
              nombre: true,
              ciudad: true,
            },
          },
        },
      },
      inquilino: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          tipoPersona: true,
          documentoIdentidad: true,
          telefono: true,
        },
      },
    },
  },
} satisfies Prisma.PagoSelect;

// Helper para serializar fechas ISO para Client Components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePagoItem(p: any): PagoItem {
  return {
    id: p.id,
    contratoId: p.contratoId,
    periodoMes: p.periodoMes,
    periodoAno: p.periodoAno,
    montoEsperado: p.montoEsperado,
    montoPagado: p.montoPagado,
    monedaOriginal: p.monedaOriginal,
    montoOriginal: p.montoOriginal,
    montoBs: p.montoBs,
    tasaBcv: p.tasaBcv,
    fechaVencimiento: p.fechaVencimiento.toISOString(),
    fechaPago: p.fechaPago ? p.fechaPago.toISOString() : null,
    metodoPago: p.metodoPago,
    referencia: p.referencia,
    comprobanteUrl: p.comprobanteUrl,
    estado: p.estado,
    notas: p.notas,
    // Control de Servicios Públicos (Fase 27)
    luzSolvente: Boolean(p.luzSolvente),
    luzNumeroFactura: p.luzNumeroFactura || null,
    luzComprobanteUrl: p.luzComprobanteUrl || null,
    aguaSolvente: Boolean(p.aguaSolvente),
    aguaNumeroFactura: p.aguaNumeroFactura || null,
    aguaComprobanteUrl: p.aguaComprobanteUrl || null,
    serviciosObservaciones: p.serviciosObservaciones || null,
    fechaRevisionServicios: p.fechaRevisionServicios ? p.fechaRevisionServicios.toISOString() : null,
    anteriorImpago: p.anteriorImpago || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    transacciones: p.transacciones
      ? p.transacciones.map((t: any) => ({
          id: t.id,
          pagoId: t.pagoId,
          monto: t.monto,
          monedaOriginal: t.monedaOriginal,
          montoOriginal: t.montoOriginal,
          montoBs: t.montoBs,
          tasaBcv: t.tasaBcv,
          fechaPago: t.fechaPago.toISOString(),
          metodoPago: t.metodoPago,
          referencia: t.referencia,
          comprobanteUrl: t.comprobanteUrl,
          notas: t.notas,
          createdAt: t.createdAt.toISOString(),
        }))
      : [],
    contrato: {
      ...p.contrato,
      fechaInicio: p.contrato.fechaInicio ? p.contrato.fechaInicio.toISOString() : undefined,
      fechaFin: p.contrato.fechaFin ? p.contrato.fechaFin.toISOString() : undefined,
    },
  };
}

/**
 * Sincroniza bajo demanda las cuotas del mes y actualiza estados vencidos
 */
export async function sincronizarCuotasMes(mes: number, ano: number) {
  try {
    const ahora = new Date();
    const mesActual = ahora.getUTCMonth() + 1;
    const anoActual = ahora.getUTCFullYear();

    let maxMes = mesActual + 1;
    let maxAno = anoActual;
    while (maxMes > 12) {
      maxMes -= 12;
      maxAno += 1;
    }

    // Regla de Negocio (Fase 24): Tope máximo absoluto del calendario: mesActual + 1
    // Ningún contrato puede tener cuotas más allá de 1 mes por encima del mes calendario actual
    const esFuturoLejano = ano > maxAno || (ano === maxAno && mes > maxMes);
    if (esFuturoLejano) {
      return { success: true, generados: 0, actualizados: 0 };
    }

    const esPeriodoFuturo = ano > anoActual || (ano === anoActual && mes > mesActual);

    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
    const finMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const ultimoDiaMes = finMes.getUTCDate();

    // Contratos que estuvieron vigentes en este mes calendario
    // Únicamente contratos activos o por vencer generan cuotas mensuales
    const contratosVigentes = await prisma.contrato.findMany({
      where: {
        fechaInicio: { lte: finMes },
        fechaFin: { gte: inicioMes },
        estado: {
          in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER],
        },
      },
      select: {
        id: true,
        diaCobro: true,
        montoAlquiler: true,
        fechaInicio: true,
      },
    });

    if (contratosVigentes.length === 0) {
      return { success: true, generados: 0, actualizados: 0 };
    }

    const contratoIds = contratosVigentes.map((c) => c.id);

    // Obtener pagos existentes para este mes y año con montoEsperado y montoPagado
    const pagosExistentes = await prisma.pago.findMany({
      where: {
        contratoId: { in: contratoIds },
        periodoMes: mes,
        periodoAno: ano,
      },
      select: {
        id: true,
        contratoId: true,
        estado: true,
        fechaVencimiento: true,
        montoEsperado: true,
        montoPagado: true,
        comprobanteUrl: true,
      },
    });

    const mapaPagosExistentes = new Map(pagosExistentes.map((p) => [p.contratoId, p]));

    // Regla de Negocio (Fase 24: Correlatividad Estricta y Adelanto de Cuotas):
    // Si el período es futuro, un contrato SOLO puede tener cuota en (mes, ano) si:
    // 1. No tiene NINGUNA cuota anterior impaga.
    // 2. Y si el contrato ya estaba activo en el mes previo (mes - 1), dicho mes DEBE estar PAGADO.
    const contratosNoElegiblesFuturo = new Set<string>();

    if (esPeriodoFuturo) {
      const prevMes = mes === 1 ? 12 : mes - 1;
      const prevAno = mes === 1 ? ano - 1 : ano;

      // 1. Contratos con cualquier cuota anterior no pagada
      const anterioresImpagos = await prisma.pago.findMany({
        where: {
          contratoId: { in: contratoIds },
          estado: { not: EstadoPago.PAGADO },
          OR: [
            { periodoAno: { lt: ano } },
            { periodoAno: ano, periodoMes: { lt: mes } },
          ],
        },
        select: { contratoId: true },
      });
      anterioresImpagos.forEach((p) => contratosNoElegiblesFuturo.add(p.contratoId));

      // 2. Contratos cuyo mes inmediato anterior NO fue pagado
      const pagosMesAnterior = await prisma.pago.findMany({
        where: {
          contratoId: { in: contratoIds },
          periodoMes: prevMes,
          periodoAno: prevAno,
          estado: EstadoPago.PAGADO,
        },
        select: { contratoId: true },
      });
      const contratosConMesAnteriorPagado = new Set(pagosMesAnterior.map((p) => p.contratoId));

      for (const c of contratosVigentes) {
        const finMesPrev = new Date(Date.UTC(prevAno, prevMes, 0, 23, 59, 59, 999));
        if (c.fechaInicio <= finMesPrev && !contratosConMesAnteriorPagado.has(c.id)) {
          contratosNoElegiblesFuturo.add(c.id);
        }
      }
    }

    const nuevosPagos = [];
    const pagosParaVencer: string[] = [];
    const pagosParaActualizar: Array<{
      id: string;
      montoEsperado: number;
      fechaVencimiento: Date;
      estado: EstadoPago;
    }> = [];
    const pagosParaEliminar: string[] = [];

    for (const contrato of contratosVigentes) {
      const diaEfectivo = Math.min(contrato.diaCobro, ultimoDiaMes);
      const fechaVencimiento = new Date(Date.UTC(ano, mes - 1, diaEfectivo, 23, 59, 59, 999));
      const pagoActual = mapaPagosExistentes.get(contrato.id);

      // Si es período futuro y el contrato no es elegible:
      if (esPeriodoFuturo && contratosNoElegiblesFuturo.has(contrato.id)) {
        // Si existe una cuota prematura vacía (sin abonos ni comprobante), eliminarla para sanear la DB
        if (
          pagoActual &&
          pagoActual.montoPagado === 0 &&
          !pagoActual.comprobanteUrl &&
          pagoActual.estado !== EstadoPago.PAGADO
        ) {
          pagosParaEliminar.push(pagoActual.id);
        }
        continue;
      }

      if (!pagoActual) {
        const esVencido = ahora > fechaVencimiento;
        nuevosPagos.push({
          contratoId: contrato.id,
          periodoMes: mes,
          periodoAno: ano,
          montoEsperado: contrato.montoAlquiler,
          montoPagado: 0,
          fechaVencimiento,
          estado: esVencido ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE,
        });
      } else if (pagoActual.montoPagado === 0 && pagoActual.estado !== EstadoPago.PAGADO) {
        // Cuota existente no pagada: mantener sincronizada si la mensualidad o día de cobro cambió
        const esVencido = ahora > fechaVencimiento;
        const requiereActualizacion =
          pagoActual.montoEsperado !== contrato.montoAlquiler ||
          pagoActual.fechaVencimiento.getTime() !== fechaVencimiento.getTime() ||
          (pagoActual.estado === EstadoPago.PENDIENTE && esVencido);

        if (requiereActualizacion) {
          pagosParaActualizar.push({
            id: pagoActual.id,
            montoEsperado: contrato.montoAlquiler,
            fechaVencimiento,
            estado: esVencido ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE,
          });
        }
      } else if (pagoActual.estado === EstadoPago.PENDIENTE && ahora > pagoActual.fechaVencimiento) {
        pagosParaVencer.push(pagoActual.id);
      }
    }

    // Sanear cuotas futuras prematuras si existen
    if (pagosParaEliminar.length > 0) {
      await prisma.pago.deleteMany({
        where: { id: { in: pagosParaEliminar } },
      });
    }

    // Creación en lote de cuotas faltantes elegibles
    let generados = 0;
    if (nuevosPagos.length > 0) {
      const resCreate = await prisma.pago.createMany({
        data: nuevosPagos,
        skipDuplicates: true,
      });
      generados = resCreate.count;
    }

    // Actualización de cuotas pendientes cuya mensualidad o día cambió
    let actualizados = 0;
    if (pagosParaActualizar.length > 0) {
      await prisma.$transaction(
        pagosParaActualizar.map((item) =>
          prisma.pago.update({
            where: { id: item.id },
            data: {
              montoEsperado: item.montoEsperado,
              fechaVencimiento: item.fechaVencimiento,
              estado: item.estado,
            },
          })
        )
      );
      actualizados = pagosParaActualizar.length;
    }

    // Actualización a vencido de cuotas que pasaron la fecha de corte
    if (pagosParaVencer.length > 0) {
      await prisma.pago.updateMany({
        where: { id: { in: pagosParaVencer } },
        data: { estado: EstadoPago.VENCIDO },
      });
    }

    return {
      success: true,
      generados: nuevosPagos.length,
      actualizados: pagosParaVencer.length + pagosParaActualizar.length,
    };
  } catch (error) {
    console.error("Error al sincronizar cuotas del mes:", error);
    return { success: false, error: "No se pudieron sincronizar las cuotas del mes" };
  }
}

// Conteo de pagos por inmueble delegado a PostgreSQL para evitar transferir objetos por red
async function obtenerConteoPagosPorPropiedad(mes: number, ano: number): Promise<Record<string, number>> {
  try {
    const rows = await prisma.$queryRaw<Array<{ propiedadId: string; count: number }>>`
      SELECT u."propiedadId", COUNT(p.id)::int as count
      FROM pagos p
      JOIN contratos c ON p."contratoId" = c.id
      JOIN unidades u ON c."unidadId" = u.id
      WHERE p."periodoMes" = ${mes} AND p."periodoAno" = ${ano}
      GROUP BY u."propiedadId"
    `;
    const conteo: Record<string, number> = {};
    for (const r of rows) {
      if (r.propiedadId) {
        conteo[r.propiedadId] = Number(r.count);
      }
    }
    return conteo;
  } catch (err) {
    console.error("Aviso al consultar agregadosPorPropiedad en SQL:", err);
    return {};
  }
}

/**
 * Consulta de cobranzas con filtros, orden y estadísticas
 */
export async function getPagosCobranza({
  mes,
  ano,
  propiedadId,
  estado,
  busqueda,
  pagina = 1,
  forzarSincronizacion = false,
  modoMorososHistoricos = false,
}: {
  mes: number;
  ano: number;
  propiedadId?: string;
  estado?: EstadoPago | "TODOS" | "POR_CONFIRMAR" | "MOROSOS_HISTORICOS";
  busqueda?: string;
  pagina?: number;
  forzarSincronizacion?: boolean;
  modoMorososHistoricos?: boolean;
}) {
  try {
    const ahora = new Date();
    const mesActualCal = ahora.getUTCMonth() + 1;
    const anoActualCal = ahora.getUTCFullYear();

    // Sincronización bajo demanda forzada explícitamente
    if (forzarSincronizacion && !modoMorososHistoricos) {
      await sincronizarCuotasMes(mes, ano);
    }

    // Condición de morosidad histórica respecto al mes actual calendario
    const condicionPeriodoPasado: Prisma.PagoWhereInput = {
      OR: [
        { periodoAno: { lt: anoActualCal } },
        { periodoAno: anoActualCal, periodoMes: { lt: mesActualCal } },
      ],
    };

    // Filtro base: o bien modo morosos históricos global, o bien periodo mes/ano regular
    const whereAnd: Prisma.PagoWhereInput[] = [];

    if (modoMorososHistoricos || estado === "MOROSOS_HISTORICOS") {
      whereAnd.push({
        estado: { not: EstadoPago.PAGADO },
        ...condicionPeriodoPasado,
      });
    } else {
      whereAnd.push({ periodoMes: mes }, { periodoAno: ano });

      // Filtro por estado en modo mensual normal
      if (estado === "POR_CONFIRMAR") {
        whereAnd.push({
          estado: { not: EstadoPago.PAGADO },
          comprobanteUrl: { not: null },
        });
      } else if (estado && estado !== "TODOS") {
        whereAnd.push({
          estado: estado as EstadoPago,
        });
      }
    }

    // Filtro por propiedad
    if (propiedadId && propiedadId !== "TODAS") {
      whereAnd.push({
        contrato: {
          unidad: {
            propiedadId: propiedadId,
          },
        },
      });
    }

    // Búsqueda textual
    if (busqueda && busqueda.trim().length > 0) {
      const q = busqueda.trim();
      whereAnd.push({
        OR: [
          { contrato: { inquilino: { nombre: { contains: q, mode: "insensitive" } } } },
          { contrato: { inquilino: { apellido: { contains: q, mode: "insensitive" } } } },
          { contrato: { inquilino: { documentoIdentidad: { contains: q, mode: "insensitive" } } } },
          { contrato: { unidad: { codigo: { contains: q, mode: "insensitive" } } } },
          { contrato: { codigo: { contains: q, mode: "insensitive" } } },
          { referencia: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.PagoWhereInput = { AND: whereAnd };

    // Consulta de todos los pagos del mes para conteos de selectores y estadísticas financieras
    const whereMesGlobal: Prisma.PagoWhereInput = {
      periodoMes: mes,
      periodoAno: ano,
    };

    const skip = (Math.max(1, pagina) - 1) * PAGE_SIZE;

    // Ejecución concurrente a Neon Cloud: listado ligero + agregados SQL nativos (sin traer todas las filas)
    let [
      totalRegistros,
      registros,
      agregadosPorEstado,
      agregadosPorPropiedad,
      cantidadPorConfirmarMes,
      cantidadPorConfirmarGlobal,
      morososHistoricosData,
    ] = await Promise.all([
      prisma.pago.count({ where }),
      prisma.pago.findMany({
        where,
        select: PAGO_LIST_SELECT,
        orderBy: (modoMorososHistoricos || estado === "MOROSOS_HISTORICOS")
          ? [
              { periodoAno: "asc" },
              { periodoMes: "asc" },
              { estado: "asc" },
            ]
          : [
              { estado: "asc" },
              { fechaVencimiento: "asc" },
            ],
        skip,
        take: PAGE_SIZE,
      }),
      // Agregados de montos y conteos por estado para el mes — GROUP BY en la DB
      prisma.pago.groupBy({
        by: ["estado"],
        where: whereMesGlobal,
        _sum: { montoEsperado: true, montoPagado: true },
        _count: { id: true },
      }),
      // Conteo por propiedad para selector de filtro directamente en SQL (sin transferir filas completas por red)
      obtenerConteoPagosPorPropiedad(mes, ano),
      // Pagos reportados con comprobante pendientes de confirmación en el mes
      prisma.pago.count({
        where: {
          periodoMes: mes,
          periodoAno: ano,
          estado: { not: EstadoPago.PAGADO },
          comprobanteUrl: { not: null },
        },
      }),
      // Pagos reportados con comprobante pendientes de confirmación en cualquier periodo
      prisma.pago.count({
        where: {
          estado: { not: EstadoPago.PAGADO },
          comprobanteUrl: { not: null },
        },
      }),
      // Fase 25: Auditoría agregada de Morosidad Histórica en una sola tupla SQL nativa (Cero sobrecarga de red)
      prisma.$queryRaw<Array<{ total_mora: number; total_cuotas: number; total_inquilinos: number }>>`
        SELECT 
          COALESCE(SUM("montoEsperado" - "montoPagado"), 0)::float as total_mora,
          COUNT(id)::int as total_cuotas,
          COUNT(DISTINCT "contratoId")::int as total_inquilinos
        FROM pagos
        WHERE estado != 'PAGADO'
          AND (
            "periodoAno" < ${anoActualCal}
            OR ("periodoAno" = ${anoActualCal} AND "periodoMes" < ${mesActualCal})
          )
      `,
    ]);

    // Fallback reactivo: si no se forzó sincronización y el mes no tenía cuotas generadas, sincronizar al vuelo
    if (!forzarSincronizacion && agregadosPorEstado.length === 0) {
      const sync = await sincronizarCuotasMes(mes, ano);
      if (sync.success && sync.generados && sync.generados > 0) {
        [
          totalRegistros,
          registros,
          agregadosPorEstado,
          agregadosPorPropiedad,
          cantidadPorConfirmarMes,
          cantidadPorConfirmarGlobal,
        ] = await Promise.all([
          prisma.pago.count({ where }),
          prisma.pago.findMany({
            where,
            select: PAGO_LIST_SELECT,
            orderBy: [
              { estado: "asc" },
              { fechaVencimiento: "asc" },
            ],
            skip,
            take: PAGE_SIZE,
          }),
          prisma.pago.groupBy({
            by: ["estado"],
            where: whereMesGlobal,
            _sum: { montoEsperado: true, montoPagado: true },
            _count: { id: true },
          }),
          obtenerConteoPagosPorPropiedad(mes, ano),
          prisma.pago.count({
            where: {
              periodoMes: mes,
              periodoAno: ano,
              estado: { not: EstadoPago.PAGADO },
              comprobanteUrl: { not: null },
            },
          }),
          prisma.pago.count({
            where: {
              estado: { not: EstadoPago.PAGADO },
              comprobanteUrl: { not: null },
            },
          }),
        ]);
      }
    }

    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE));
    const paginaActual = Math.max(1, Math.min(pagina, totalPaginas));

    // Calcular estadísticas a partir de los agregados de la DB (sin iterar en Node.js)
    let totalFacturado = 0;
    let totalRecaudado = 0;
    let totalPorCobrar = 0;
    let totalEnMora = 0;
    let cantidadPagados = 0;
    let cantidadPendientes = 0;
    let cantidadVencidos = 0;
    let cantidadParciales = 0;
    let cantidadTotalFiltrada = 0;

    for (const grupo of agregadosPorEstado) {
      const count = grupo._count.id || 0;
      const sumEsperado = grupo._sum.montoEsperado || 0;
      const sumPagado = grupo._sum.montoPagado || 0;
      cantidadTotalFiltrada += count;
      totalFacturado += sumEsperado;
      totalRecaudado += sumPagado;

      if (grupo.estado === EstadoPago.PAGADO) {
        cantidadPagados += count;
      } else if (grupo.estado === EstadoPago.VENCIDO) {
        cantidadVencidos += count;
        totalEnMora += Math.max(0, sumEsperado - sumPagado);
      } else if (grupo.estado === EstadoPago.PENDIENTE) {
        cantidadPendientes += count;
        totalPorCobrar += Math.max(0, sumEsperado - sumPagado);
      } else if (grupo.estado === EstadoPago.PARCIAL) {
        cantidadParciales += count;
        totalPorCobrar += Math.max(0, sumEsperado - sumPagado);
      }
    }

    const porcentajeRecaudado =
      totalFacturado > 0 ? Number(((totalRecaudado / totalFacturado) * 100).toFixed(1)) : 0;

    // Métricas de morosidad histórica agregadas directamente desde el motor PostgreSQL
    const morosidadStats = morososHistoricosData?.[0] || { total_mora: 0, total_cuotas: 0, total_inquilinos: 0 };

    const estadisticas: EstadisticasCobranza = {
      totalFacturado: Number(totalFacturado.toFixed(2)),
      totalRecaudado: Number(totalRecaudado.toFixed(2)),
      totalPorCobrar: Number(totalPorCobrar.toFixed(2)),
      totalEnMora: Number(totalEnMora.toFixed(2)),
      cantidadTotal: cantidadTotalFiltrada,
      cantidadTotalGlobal: cantidadTotalFiltrada,
      cantidadPagados,
      cantidadPendientes,
      cantidadVencidos,
      cantidadParciales,
      cantidadPorConfirmar: cantidadPorConfirmarMes,
      cantidadPorConfirmarGlobal,
      porcentajeRecaudado,
      conteoPorPropiedad: agregadosPorPropiedad,
      morosidadHistoricaTotal: Number((morosidadStats.total_mora || 0).toFixed(2)),
      morosidadHistoricaCuotas: morosidadStats.total_cuotas || 0,
      morosidadHistoricaInquilinos: morosidadStats.total_inquilinos || 0,
    };

    // Detección de cuotas anteriores impagas para los contratos de la página (Fase 24: Imputación Secuencial)
    const contratoIds = Array.from(new Set(registros.map((r) => r.contratoId)));
    const cuotasAnterioresImpagas =
      contratoIds.length > 0
        ? await prisma.pago.findMany({
            where: {
              contratoId: { in: contratoIds },
              estado: { not: EstadoPago.PAGADO },
              OR: [
                { periodoAno: { lt: ano } },
                { periodoAno: ano, periodoMes: { lt: mes } },
              ],
            },
            select: {
              contratoId: true,
              periodoMes: true,
              periodoAno: true,
              montoEsperado: true,
              montoPagado: true,
            },
            orderBy: [
              { periodoAno: "asc" },
              { periodoMes: "asc" },
            ],
          })
        : [];

    const mapaAnterioresImpagas = new Map<string, { mes: number; ano: number; saldo: number }>();
    for (const c of cuotasAnterioresImpagas) {
      if (!mapaAnterioresImpagas.has(c.contratoId)) {
        mapaAnterioresImpagas.set(c.contratoId, {
          mes: c.periodoMes,
          ano: c.periodoAno,
          saldo: Number((c.montoEsperado - c.montoPagado).toFixed(2)),
        });
      }
    }

    // Serializar fechas ISO para Client Components e inyectar anteriorImpago
    const pagos: PagoItem[] = registros.map((r) => {
      const serialized = serializePagoItem(r);
      serialized.anteriorImpago = mapaAnterioresImpagas.get(r.contratoId) || null;
      return serialized;
    });

    return {
      success: true,
      pagos,
      totalRegistros,
      totalPaginas,
      paginaActual,
      estadisticas,
    };
  } catch (error) {
    console.error("Error al obtener pagos de cobranza:", error);
    return {
      success: false,
      error: "Error al cargar la información de cobranza",
      pagos: [],
      totalRegistros: 0,
      totalPaginas: 1,
      paginaActual: 1,
      estadisticas: {
        totalFacturado: 0,
        totalRecaudado: 0,
        totalPorCobrar: 0,
        totalEnMora: 0,
        cantidadTotal: 0,
        cantidadPagados: 0,
        cantidadPendientes: 0,
        cantidadVencidos: 0,
        cantidadParciales: 0,
        cantidadPorConfirmar: 0,
        cantidadPorConfirmarGlobal: 0,
        porcentajeRecaudado: 0,
      },
    };
  }
}

/**
 * Obtiene el detalle actualizado de una cuota mensual con su libro mayor completo
 */
export async function getDetallePago(id: string) {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id },
      select: PAGO_SELECT,
    });

    if (!pago) {
      return { success: false, error: "Registro de cobro no encontrado." };
    }

    return { success: true, pago: serializePagoItem(pago) };
  } catch (error) {
    console.error("Error al obtener detalle de cobro:", error);
    return { success: false, error: "No se pudo cargar el detalle del cobro." };
  }
}

/**
 * Registra un abono o pago en el Libro Mayor de Transacciones (1:N)
 */
export async function registrarPago(input: RegistrarPagoInput) {
  try {
    const validado = registrarPagoSchema.safeParse(input);
    if (!validado.success) {
      return {
        success: false,
        error: validado.error.issues?.[0]?.message || "Datos del pago inválidos",
      };
    }

    const {
      pagoId,
      montoPagado,
      fechaPago,
      metodoPago,
      referencia,
      comprobanteUrl,
      notas,
      monedaOriginal,
      montoOriginal,
      montoBs,
      tasaBcv,
    } = validado.data;

    const fechaPagoDate = new Date(fechaPago);
    const esMonedaNacional = metodoPago === MetodoPago.PAGO_MOVIL || metodoPago === MetodoPago.TRANSFERENCIA;
    const monedaEfectiva = monedaOriginal || (esMonedaNacional ? MonedaTransaccion.VES : MonedaTransaccion.USD);
    const montoBsEfectivo = montoBs || (esMonedaNacional && tasaBcv ? Number((montoPagado * tasaBcv).toFixed(2)) : null);
    const montoOriginalEfectivo = montoOriginal || (esMonedaNacional && montoBsEfectivo ? montoBsEfectivo : montoPagado);

    const pagoActualizado = await prisma.$transaction(async (tx) => {
      const pagoActual = await tx.pago.findUnique({
        where: { id: pagoId },
        include: { contrato: true },
      });

      if (!pagoActual) {
        throw new Error("El registro de cobro no existe");
      }

      // 0a. Regla de Imputación Secuencial (Fase 24): Bloquear pago si hay cuotas anteriores pendientes
      const cuotaAnteriorImpaga = await tx.pago.findFirst({
        where: {
          contratoId: pagoActual.contratoId,
          OR: [
            { periodoAno: { lt: pagoActual.periodoAno } },
            { periodoAno: pagoActual.periodoAno, periodoMes: { lt: pagoActual.periodoMes } },
          ],
          estado: { not: EstadoPago.PAGADO },
        },
        orderBy: [
          { periodoAno: "asc" },
          { periodoMes: "asc" },
        ],
        select: {
          periodoMes: true,
          periodoAno: true,
          montoEsperado: true,
          montoPagado: true,
        },
      });

      if (cuotaAnteriorImpaga) {
        const saldoImpago = Math.max(0, cuotaAnteriorImpaga.montoEsperado - cuotaAnteriorImpaga.montoPagado).toFixed(2);
        throw new Error(
          `Imputación contable bloqueada: el contrato tiene una cuota anterior pendiente (Período: ${cuotaAnteriorImpaga.periodoMes}/${cuotaAnteriorImpaga.periodoAno}, Resta: $${saldoImpago} USD). Por principio contable estricto, debes liquidar primero el período más antiguo.`
        );
      }

      // 0b. Regla de Tope de Calendario (Fase 24): Solo permitir liquidar hasta mesActual + 1 del calendario
      const ahoraUTC = new Date();
      const mesActualUtc = ahoraUTC.getUTCMonth() + 1;
      const anoActualUtc = ahoraUTC.getUTCFullYear();
      let maxMesAdelanto = mesActualUtc + 1;
      let maxAnoAdelanto = anoActualUtc;
      while (maxMesAdelanto > 12) {
        maxMesAdelanto -= 12;
        maxAnoAdelanto += 1;
      }

      const excedeTopeCalendario =
        pagoActual.periodoAno > maxAnoAdelanto ||
        (pagoActual.periodoAno === maxAnoAdelanto && pagoActual.periodoMes > maxMesAdelanto);

      if (excedeTopeCalendario) {
        throw new Error(
          `Solo se permite liquidar hasta 1 mes por encima del mes calendario actual (Tope permitido: ${maxMesAdelanto}/${maxAnoAdelanto}). Este período se habilitará automáticamente cuando el calendario avance.`
        );
      }

      // 1. Asentar la transacción individual en el Libro Mayor
      await tx.transaccionPago.create({
        data: {
          pagoId,
          monto: montoPagado,
          monedaOriginal: monedaEfectiva,
          montoOriginal: montoOriginalEfectivo,
          montoBs: montoBsEfectivo,
          tasaBcv: tasaBcv || null,
          fechaPago: fechaPagoDate,
          metodoPago,
          referencia: referencia ? referencia.trim() : null,
          comprobanteUrl: comprobanteUrl && comprobanteUrl.trim() !== "" ? comprobanteUrl.trim() : null,
          notas: notas ? notas.trim() : null,
        },
      });

      // 2. Sumar todos los abonos registrados para esta cuota mensual
      const sumaAbonos = await tx.transaccionPago.aggregate({
        where: { pagoId },
        _sum: { monto: true },
      });

      const totalAbonado = Number((sumaAbonos._sum.monto || 0).toFixed(2));

      // 3. Evaluar estado de la mensualidad según el acumulado de abonos
      let nuevoEstado: EstadoPago = EstadoPago.PENDIENTE;
      if (totalAbonado >= pagoActual.montoEsperado) {
        nuevoEstado = EstadoPago.PAGADO;
      } else if (totalAbonado > 0) {
        nuevoEstado = EstadoPago.PARCIAL;
      } else {
        const ahora = new Date();
        nuevoEstado = ahora > pagoActual.fechaVencimiento ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE;
      }

      // 4. Actualizar el encabezado de la mensualidad con los datos consolidados
      const pagoActualizadoTx = await tx.pago.update({
        where: { id: pagoId },
        data: {
          montoPagado: totalAbonado,
          monedaOriginal: monedaEfectiva,
          montoOriginal: montoOriginalEfectivo,
          montoBs: montoBsEfectivo,
          tasaBcv: tasaBcv || null,
          fechaPago: fechaPagoDate,
          metodoPago,
          referencia: referencia ? referencia.trim() : null,
          comprobanteUrl: comprobanteUrl && comprobanteUrl.trim() !== "" ? comprobanteUrl.trim() : null,
          notas: notas ? notas.trim() : null,
          estado: nuevoEstado,
        },
        select: PAGO_SELECT,
      });

      // 5. Si la cuota quedó liquidada (PAGADO), habilitar automáticamente la siguiente mensualidad correlativa si no excede el tope de 1 mes arriba del mes actual
      if (nuevoEstado === EstadoPago.PAGADO) {
        const sigMes = pagoActual.periodoMes === 12 ? 1 : pagoActual.periodoMes + 1;
        const sigAno = pagoActual.periodoMes === 12 ? pagoActual.periodoAno + 1 : pagoActual.periodoAno;
        const noExcedeTope =
          sigAno < maxAnoAdelanto || (sigAno === maxAnoAdelanto && sigMes <= maxMesAdelanto);

        if (noExcedeTope) {
          const finMesSig = new Date(Date.UTC(sigAno, sigMes, 0, 23, 59, 59, 999));

          if (pagoActual.contrato.fechaFin >= finMesSig) {
            const yaExisteSig = await tx.pago.findFirst({
              where: {
                contratoId: pagoActual.contratoId,
                periodoMes: sigMes,
                periodoAno: sigAno,
              },
              select: { id: true },
            });

            if (!yaExisteSig) {
              const ultimoDiaSig = finMesSig.getUTCDate();
              const diaEfectivoSig = Math.min(pagoActual.contrato.diaCobro, ultimoDiaSig);
              const fechaVenceSig = new Date(Date.UTC(sigAno, sigMes - 1, diaEfectivoSig, 23, 59, 59, 999));

              await tx.pago.create({
                data: {
                  contratoId: pagoActual.contratoId,
                  periodoMes: sigMes,
                  periodoAno: sigAno,
                  montoEsperado: pagoActual.contrato.montoAlquiler,
                  montoPagado: 0,
                  fechaVencimiento: fechaVenceSig,
                  estado: EstadoPago.PENDIENTE,
                },
              });
            }
          }
        }
      }

      return pagoActualizadoTx;
    });

    // Enviar notificación por correo al inquilino en segundo plano (respuesta instantánea < 150ms)
    const inquilino = pagoActualizado.contrato.inquilino;
    const emailDestino = inquilino.email || inquilino.usuario?.email;
    if (emailDestino && emailDestino.includes("@")) {
      const saldoRestante = Math.max(0, pagoActualizado.montoEsperado - pagoActualizado.montoPagado);
      ejecutarEnSegundoPlano(async () => {
        await enviarNotificacionPagoConfirmadoInquilino({
          inquilinoNombre: `${inquilino.nombre} ${inquilino.apellido || ""}`.trim(),
          inquilinoEmail: emailDestino,
          unidadCodigo: pagoActualizado.contrato.unidad.codigo,
          propiedadNombre: pagoActualizado.contrato.unidad.propiedad.nombre,
          periodoMes: pagoActualizado.periodoMes,
          periodoAno: pagoActualizado.periodoAno,
          montoAbonado: montoPagado,
          montoTotalEsperado: pagoActualizado.montoEsperado,
          montoTotalPagado: pagoActualizado.montoPagado,
          saldoRestante,
          estadoPago: pagoActualizado.estado,
          metodoPago,
          referencia: referencia ? referencia.trim() : null,
          fechaPago: fechaPagoDate,
        });
      });
    }

    revalidatePath("/admin/cobranza");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/contratos");
    revalidatePath("/inquilino/pagos");
    revalidatePath("/inquilino/dashboard");

    return {
      success: true,
      pago: serializePagoItem(pagoActualizado),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar el pago.";
    console.error("Error al registrar pago:", error);
    return { success: false, error: message };
  }
}

/**
 * Elimina un abono específico del Libro Mayor y recalcula el acumulado de la mensualidad
 */
export async function eliminarTransaccionPago(transaccionId: string) {
  try {
    const transaccion = await prisma.transaccionPago.findUnique({
      where: { id: transaccionId },
      select: { id: true, pagoId: true, comprobanteUrl: true },
    });

    if (!transaccion) {
      return { success: false, error: "El abono no existe." };
    }

    if (transaccion.comprobanteUrl) {
      await eliminarArchivosUploadThing([transaccion.comprobanteUrl]).catch(() => null);
    }

    const pagoActualizado = await prisma.$transaction(async (tx) => {
      // 1. Eliminar la transacción del Libro Mayor
      await tx.transaccionPago.delete({
        where: { id: transaccionId },
      });

      // 2. Recalcular suma total de abonos restantes
      const suma = await tx.transaccionPago.aggregate({
        where: { pagoId: transaccion.pagoId },
        _sum: { monto: true },
      });

      const nuevoMontoPagado = Number((suma._sum.monto || 0).toFixed(2));
      const pagoActual = await tx.pago.findUnique({
        where: { id: transaccion.pagoId },
      });

      if (!pagoActual) throw new Error("Pago no encontrado");

      const ahora = new Date();
      let nuevoEstado: EstadoPago;
      if (nuevoMontoPagado >= pagoActual.montoEsperado) {
        nuevoEstado = EstadoPago.PAGADO;
      } else if (nuevoMontoPagado > 0) {
        nuevoEstado = EstadoPago.PARCIAL;
      } else {
        nuevoEstado = ahora > pagoActual.fechaVencimiento ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE;
      }

      // 3. Obtener la última transacción restante para metadatos representativos
      const ultimaTransaccion = await tx.transaccionPago.findFirst({
        where: { pagoId: transaccion.pagoId },
        orderBy: { fechaPago: "desc" },
      });

      return await tx.pago.update({
        where: { id: transaccion.pagoId },
        data: {
          montoPagado: nuevoMontoPagado,
          estado: nuevoEstado,
          fechaPago: ultimaTransaccion ? ultimaTransaccion.fechaPago : null,
          metodoPago: ultimaTransaccion ? ultimaTransaccion.metodoPago : null,
          referencia: ultimaTransaccion ? ultimaTransaccion.referencia : null,
          comprobanteUrl: ultimaTransaccion ? ultimaTransaccion.comprobanteUrl : null,
        },
        select: PAGO_SELECT,
      });
    });

    revalidatePath("/admin/cobranza");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/contratos");
    revalidatePath("/inquilino/pagos");
    revalidatePath("/inquilino/dashboard");

    return {
      success: true,
      pago: serializePagoItem(pagoActualizado),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar el abono.";
    console.error("Error al eliminar transacción:", error);
    return { success: false, error: message };
  }
}

/**
 * Revierte o anula todos los abonos de una mensualidad registrada previamente
 */
export async function anularPago(pagoId: string) {
  try {
    const pagoActual = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: { transacciones: true },
    });

    if (!pagoActual) {
      return { success: false, error: "El registro de cobro no existe" };
    }

    // Si tiene comprobantes almacenados en transacciones o en la cuota, eliminarlos de UploadThing
    const urlsAEliminar: string[] = [];
    if (pagoActual.comprobanteUrl) urlsAEliminar.push(pagoActual.comprobanteUrl);
    pagoActual.transacciones.forEach((t) => {
      if (t.comprobanteUrl && !urlsAEliminar.includes(t.comprobanteUrl)) {
        urlsAEliminar.push(t.comprobanteUrl);
      }
    });

    if (urlsAEliminar.length > 0) {
      await eliminarArchivosUploadThing(urlsAEliminar).catch(() => null);
    }

    // Determinar si regresa a VENCIDO o PENDIENTE según la fecha actual
    const ahora = new Date();
    const nuevoEstado =
      ahora > pagoActual.fechaVencimiento ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE;

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar todas las transacciones asociadas en el Libro Mayor
      await tx.transaccionPago.deleteMany({
        where: { pagoId },
      });

      // 2. Restablecer el pago mensual a cero
      return await tx.pago.update({
        where: { id: pagoId },
        data: {
          montoPagado: 0,
          fechaPago: null,
          metodoPago: null,
          referencia: null,
          comprobanteUrl: null,
          notas: null,
          estado: nuevoEstado,
        },
        select: PAGO_SELECT,
      });
    });

    revalidatePath("/admin/cobranza");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/contratos");
    revalidatePath("/inquilino/pagos");
    revalidatePath("/inquilino/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error al anular pago:", error);
    return { success: false, error: "No se pudo anular el pago. Intente nuevamente." };
  }
}

/**
 * Obtiene lista reducida de propiedades para selector de filtros (aprovecha la caché Edge)
 */
export async function getPropiedadesCobranzaOpciones() {
  return await getPropiedadesOpciones();
}

/**
 * Carga los datos completos de un pago para el modal de ficha detallada (lazy loading)
 */
export async function getPagoDetalle(pagoId: string) {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      select: PAGO_SELECT,
    });

    if (!pago) {
      return { success: false, error: "Registro de cobro no encontrado" };
    }

    // Fase 24: Detectar si el contrato tiene mensualidades anteriores pendientes (Imputación correlativa)
    const cuotaAnteriorImpaga = await prisma.pago.findFirst({
      where: {
        contratoId: pago.contratoId,
        estado: { not: EstadoPago.PAGADO },
        OR: [
          { periodoAno: { lt: pago.periodoAno } },
          { periodoAno: pago.periodoAno, periodoMes: { lt: pago.periodoMes } },
        ],
      },
      select: {
        periodoMes: true,
        periodoAno: true,
        montoEsperado: true,
        montoPagado: true,
      },
      orderBy: [
        { periodoAno: "asc" },
        { periodoMes: "asc" },
      ],
    });

    const serialized = serializePagoItem(pago);
    if (cuotaAnteriorImpaga) {
      serialized.anteriorImpago = {
        mes: cuotaAnteriorImpaga.periodoMes,
        ano: cuotaAnteriorImpaga.periodoAno,
        saldo: Number((cuotaAnteriorImpaga.montoEsperado - cuotaAnteriorImpaga.montoPagado).toFixed(2)),
      };
    }

    return { success: true, pago: serialized };
  } catch (error) {
    console.error("Error al obtener detalle del pago:", error);
    return { success: false, error: "No se pudo cargar la ficha del pago" };
  }
}

/**
 * Rechaza o descarta un comprobante bancario reportado por el inquilino notificándole el motivo
 */
export async function rechazarComprobanteReportadoAction(pagoId: string, motivo?: string) {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        contrato: {
          include: {
            inquilino: {
              include: {
                usuario: { select: { email: true } },
              },
            },
            unidad: {
              include: {
                propiedad: true,
              },
            },
          },
        },
      },
    });

    if (!pago) {
      return { success: false, error: "El registro de cobro no existe." };
    }

    const notasActualizadas = [
      pago.notas,
      `[${new Date().toLocaleDateString("es-VE")}] Comprobante descartado por administración: ${motivo?.trim() || "No coincide con movimientos bancarios"}.`,
    ]
      .filter(Boolean)
      .join(" - ");

    // Limpiar el capture y la referencia para que el inquilino pueda corregirlo
    await prisma.pago.update({
      where: { id: pagoId },
      data: {
        comprobanteUrl: null,
        notas: notasActualizadas,
      },
    });

    // Enviar alerta al inquilino en segundo plano (respuesta instantánea < 150ms)
    const emailDestino = pago.contrato.inquilino.email || pago.contrato.inquilino.usuario?.email;
    if (emailDestino && emailDestino.includes("@")) {
      ejecutarEnSegundoPlano(async () => {
        await enviarNotificacionPagoRechazadoInquilino({
          inquilinoNombre: `${pago.contrato.inquilino.nombre} ${pago.contrato.inquilino.apellido || ""}`.trim(),
          inquilinoEmail: emailDestino,
          unidadCodigo: pago.contrato.unidad.codigo,
          propiedadNombre: pago.contrato.unidad.propiedad.nombre,
          periodoMes: pago.periodoMes,
          periodoAno: pago.periodoAno,
          referencia: pago.referencia,
          motivo: motivo?.trim() || null,
        });
      });
    }

    revalidatePath("/admin/cobranza");
    revalidatePath("/inquilino/pagos");
    revalidatePath("/inquilino/dashboard");

    return { success: true, message: "Comprobante descartado y notificado al inquilino." };
  } catch (error) {
    console.error("Error al rechazar comprobante:", error);
    return { success: false, error: "Ocurrió un error al descartar el comprobante." };
  }
}

/**
 * Obtiene la lista completa de cuotas morosas de periodos anteriores al mes actual (Fase 25)
 */
export async function getMorososHistoricosAction() {
  try {
    const ahora = new Date();
    const mesActualCal = ahora.getUTCMonth() + 1;
    const anoActualCal = ahora.getUTCFullYear();

    const registros = await prisma.pago.findMany({
      where: {
        estado: { not: EstadoPago.PAGADO },
        OR: [
          { periodoAno: { lt: anoActualCal } },
          { periodoAno: anoActualCal, periodoMes: { lt: mesActualCal } },
        ],
      },
      select: PAGO_LIST_SELECT,
      orderBy: [
        { periodoAno: "asc" },
        { periodoMes: "asc" },
        { estado: "asc" },
      ],
    });

    const pagos: PagoItem[] = registros.map((r) => serializePagoItem(r));

    return {
      success: true,
      pagos,
    };
  } catch (error) {
    console.error("Error al obtener morosos históricos:", error);
    return {
      success: false,
      error: "No se pudieron cargar los deudores históricos",
      pagos: [],
    };
  }
}

const actualizarSolvenciaSchema = z.object({
  pagoId: z.string().min(1, "El ID de la cuota es obligatorio"),
  luzSolvente: z.boolean(),
  luzNumeroFactura: z.string().optional().nullable(),
  luzComprobanteUrl: z.string().optional().nullable(),
  aguaSolvente: z.boolean(),
  aguaNumeroFactura: z.string().optional().nullable(),
  aguaComprobanteUrl: z.string().optional().nullable(),
  serviciosObservaciones: z.string().optional().nullable(),
});

export type ActualizarSolvenciaInput = z.infer<typeof actualizarSolvenciaSchema>;

/**
 * Registra o audita la solvencia mensual de servicios públicos (Corpoelec y Agua) de un local (Fase 27)
 */
export async function actualizarSolvenciaServiciosAction(input: ActualizarSolvenciaInput) {
  try {
    const validacion = actualizarSolvenciaSchema.safeParse(input);
    if (!validacion.success) {
      return { success: false, error: validacion.error.issues?.[0]?.message || "Datos inválidos" };
    }

    const {
      pagoId,
      luzSolvente,
      luzNumeroFactura,
      luzComprobanteUrl,
      aguaSolvente,
      aguaNumeroFactura,
      aguaComprobanteUrl,
      serviciosObservaciones,
    } = validacion.data;

    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        contrato: {
          include: {
            unidad: true,
            inquilino: true,
          },
        },
      },
    });

    if (!pago) {
      return { success: false, error: "Registro de cuota no encontrado" };
    }

    const pagoActualizado = await prisma.pago.update({
      where: { id: pagoId },
      data: {
        luzSolvente,
        luzNumeroFactura: luzNumeroFactura?.trim() || null,
        luzComprobanteUrl: luzComprobanteUrl?.trim() || null,
        aguaSolvente,
        aguaNumeroFactura: aguaNumeroFactura?.trim() || null,
        aguaComprobanteUrl: aguaComprobanteUrl?.trim() || null,
        serviciosObservaciones: serviciosObservaciones?.trim() || null,
        fechaRevisionServicios: new Date(),
      },
      select: PAGO_SELECT,
    });

    revalidatePath("/admin/cobranza");
    revalidatePath("/inquilino/pagos");

    return {
      success: true,
      data: serializePagoItem(pagoActualizado),
      message: `Solvencia de servicios actualizada para ${pago.contrato.unidad.codigo}.`,
    };
  } catch (error) {
    console.error("Error al actualizar solvencia de servicios:", error);
    return { success: false, error: "No se pudo actualizar el registro de solvencia de servicios." };
  }
}
