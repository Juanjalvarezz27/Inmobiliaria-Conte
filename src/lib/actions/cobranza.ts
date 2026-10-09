"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EstadoContrato, EstadoPago, MetodoPago, Prisma, TransaccionPago } from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";
import type { PagoItem, EstadisticasCobranza } from "@/app/admin/cobranza/types";

const PAGE_SIZE = 20;

// Esquema de validación para asentar un pago
const registrarPagoSchema = z.object({
  pagoId: z.string().min(1, "El identificador del cobro es requerido"),
  montoPagado: z.coerce.number().positive("El monto pagado debe ser mayor a 0"),
  fechaPago: z.string().min(1, "La fecha de pago es requerida"),
  metodoPago: z.nativeEnum(MetodoPago),
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
  fechaVencimiento: true,
  fechaPago: true,
  metodoPago: true,
  referencia: true,
  comprobanteUrl: true,
  estado: true,
  notas: true,
  createdAt: true,
  updatedAt: true,
  transacciones: {
    select: {
      id: true,
      pagoId: true,
      monto: true,
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
  fechaVencimiento: true,
  fechaPago: true,
  metodoPago: true,
  referencia: true,
  comprobanteUrl: true,
  estado: true,
  notas: true,
  createdAt: true,
  updatedAt: true,
  transacciones: {
    select: {
      id: true,
      pagoId: true,
      monto: true,
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
    fechaVencimiento: p.fechaVencimiento.toISOString(),
    fechaPago: p.fechaPago ? p.fechaPago.toISOString() : null,
    metodoPago: p.metodoPago,
    referencia: p.referencia,
    comprobanteUrl: p.comprobanteUrl,
    estado: p.estado,
    notas: p.notas,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    transacciones: p.transacciones
      ? p.transacciones.map((t: TransaccionPago) => ({
          id: t.id,
          pagoId: t.pagoId,
          monto: t.monto,
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
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
    const finMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const ultimoDiaMes = finMes.getUTCDate();
    const ahora = new Date();

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
      },
    });

    const mapaPagosExistentes = new Map(pagosExistentes.map((p) => [p.contratoId, p]));

    const nuevosPagos = [];
    const pagosParaVencer: string[] = [];
    const pagosParaActualizar: Array<{
      id: string;
      montoEsperado: number;
      fechaVencimiento: Date;
      estado: EstadoPago;
    }> = [];

    for (const contrato of contratosVigentes) {
      const diaEfectivo = Math.min(contrato.diaCobro, ultimoDiaMes);
      const fechaVencimiento = new Date(Date.UTC(ano, mes - 1, diaEfectivo, 23, 59, 59, 999));
      const pagoActual = mapaPagosExistentes.get(contrato.id);

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
        // Cuota existente no pagada: mantener sincronizada si el canon o día de cobro cambió
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

    // Creación en lote de cuotas faltantes
    if (nuevosPagos.length > 0) {
      await prisma.pago.createMany({
        data: nuevosPagos,
        skipDuplicates: true,
      });
    }

    // Actualización de cuotas pendientes cuyo canon o día cambió
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
}: {
  mes: number;
  ano: number;
  propiedadId?: string;
  estado?: EstadoPago | "TODOS";
  busqueda?: string;
  pagina?: number;
  forzarSincronizacion?: boolean;
}) {
  try {
    // Sincronización inteligente de cuotas
    if (forzarSincronizacion) {
      await sincronizarCuotasMes(mes, ano);
    } else {
      const cuotasExistentes = await prisma.pago.count({
        where: { periodoMes: mes, periodoAno: ano },
      });
      if (cuotasExistentes === 0) {
        await sincronizarCuotasMes(mes, ano);
      }
    }

    // Filtro base por periodo
    const whereAnd: Prisma.PagoWhereInput[] = [{ periodoMes: mes }, { periodoAno: ano }];

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

    // Filtro por estado
    if (estado && estado !== "TODOS") {
      whereAnd.push({
        estado: estado,
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
    const [totalRegistros, registros, agregadosPorEstado, agregadosPorPropiedad] = await Promise.all([
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
      // Agregados de montos y conteos por estado para el mes — GROUP BY en la DB
      prisma.pago.groupBy({
        by: ["estado"],
        where: whereMesGlobal,
        _sum: { montoEsperado: true, montoPagado: true },
        _count: { id: true },
      }),
      // Conteo por propiedad para el selector de filtro — GROUP BY en la DB
      prisma.pago.groupBy({
        by: ["contratoId"],
        where: whereMesGlobal,
        _count: { id: true },
      }).then(async (grupos) => {
        if (grupos.length === 0) return {} as Record<string, number>;
        // Traer propiedadId de los contratos agrupados con una sola query
        const contratoIds = grupos.map((g) => g.contratoId);
        const unidades = await prisma.contrato.findMany({
          where: { id: { in: contratoIds } },
          select: { id: true, unidad: { select: { propiedadId: true } } },
        });
        const mapPropId = new Map(unidades.map((u) => [u.id, u.unidad.propiedadId]));
        const conteo: Record<string, number> = {};
        for (const g of grupos) {
          const propId = mapPropId.get(g.contratoId);
          if (propId) conteo[propId] = (conteo[propId] || 0) + (g._count.id || 0);
        }
        return conteo;
      }),
    ]);

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
      porcentajeRecaudado,
      conteoPorPropiedad: agregadosPorPropiedad,
    };

    // Serializar fechas ISO para Client Components
    const pagos: PagoItem[] = registros.map(serializePagoItem);

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

    const { pagoId, montoPagado, fechaPago, metodoPago, referencia, comprobanteUrl, notas } =
      validado.data;

    const fechaPagoDate = new Date(fechaPago);

    const pagoActualizado = await prisma.$transaction(async (tx) => {
      const pagoActual = await tx.pago.findUnique({
        where: { id: pagoId },
      });

      if (!pagoActual) {
        throw new Error("El registro de cobro no existe");
      }

      // 1. Asentar la transacción individual en el Libro Mayor
      await tx.transaccionPago.create({
        data: {
          pagoId,
          monto: montoPagado,
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
      return await tx.pago.update({
        where: { id: pagoId },
        data: {
          montoPagado: totalAbonado,
          fechaPago: fechaPagoDate,
          metodoPago,
          referencia: referencia ? referencia.trim() : null,
          comprobanteUrl: comprobanteUrl && comprobanteUrl.trim() !== "" ? comprobanteUrl.trim() : null,
          notas: notas ? notas.trim() : null,
          estado: nuevoEstado,
        },
        select: PAGO_SELECT,
      });
    });

    revalidatePath("/admin/cobranza");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/contratos");

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

    return { success: true };
  } catch (error) {
    console.error("Error al anular pago:", error);
    return { success: false, error: "No se pudo anular el pago. Intente nuevamente." };
  }
}

/**
 * Obtiene lista reducida de propiedades para selector de filtros
 */
export async function getPropiedadesCobranzaOpciones() {
  try {
    return await prisma.propiedad.findMany({
      select: { id: true, nombre: true, ciudad: true, tipo: true },
      orderBy: { nombre: "asc" },
    });
  } catch (error) {
    console.error("Error al obtener opciones de propiedades:", error);
    return [];
  }
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

    return { success: true, pago: serializePagoItem(pago) };
  } catch (error) {
    console.error("Error al obtener detalle del pago:", error);
    return { success: false, error: "No se pudo cargar la ficha del pago" };
  }
}
