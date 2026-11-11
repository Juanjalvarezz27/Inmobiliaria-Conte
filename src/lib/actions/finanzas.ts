"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  TipoTransaccionFinanciera,
  CategoriaTransaccion,
  MetodoPago,
  MonedaTransaccion,
  Prisma,
} from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";
import { getTasaBcvOficial, getTasaBcvCierreMes, getTasaBcvPorFecha } from "@/lib/bcv";
import type {
  FinanzasDataResponse,
  FiltrosFinanzas,
  EstadisticasFinanzas,
  CategoriaDesglose,
  DiaFinancieroMes,
  PropiedadFinanzasOpcion,
  MovimientoIngresoDetalle,
  MovimientoEgresoDetalle,
  MovimientosPeriodoResponse,
  CierreMesData,
  MovimientoCierreItem,
} from "@/app/admin/finanzas/types";
import { CATEGORIA_CONFIG } from "@/app/admin/finanzas/constants";

const transaccionSchema = z.object({
  tipo: z.nativeEnum(TipoTransaccionFinanciera),
  categoria: z.nativeEnum(CategoriaTransaccion).optional().default(CategoriaTransaccion.OTRO),
  concepto: z.string().min(2, "El concepto debe tener al menos 2 caracteres"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  monedaOriginal: z.nativeEnum(MonedaTransaccion).optional().default(MonedaTransaccion.USD),
  montoOriginal: z.coerce.number().positive().optional().nullable(),
  tasaBcv: z.coerce.number().positive().optional().nullable(),
  fecha: z.string().min(1, "La fecha es requerida"),
  metodoPago: z.nativeEnum(MetodoPago),
  referencia: z.string().optional().nullable(),
  beneficiario: z.string().optional().nullable(),
  comprobanteUrl: z.string().optional().nullable().or(z.literal("")),
  notas: z.string().optional().nullable(),
  propiedadId: z.string().optional().nullable(),
  unidadId: z.string().optional().nullable(),
});

export type TransaccionInput = z.infer<typeof transaccionSchema>;

export async function getFinanzasData(
  filtros: FiltrosFinanzas
): Promise<FinanzasDataResponse> {
  const {
    mes,
    ano,
    propiedadId = "TODAS",
  } = filtros;

  const tienePropiedad = propiedadId && propiedadId !== "TODAS";

  // 1. Ingresos automáticos de Cobranzas del periodo
  const wherePagosCobranza: Prisma.PagoWhereInput = {
    periodoMes: mes,
    periodoAno: ano,
    montoPagado: { gt: 0 },
    ...(tienePropiedad
      ? {
          contrato: {
            unidad: {
              propiedadId: propiedadId,
            },
          },
        }
      : {}),
  };

  const diasEnMes = new Date(ano, mes, 0).getDate();

  // 1. Consultar cobros y transacciones del mes y año seleccionados
  const [pagosMes, transaccionesMesTotales] = await Promise.all([
    prisma.pago.findMany({
      where: wherePagosCobranza,
      select: {
        id: true,
        montoPagado: true,
        fechaPago: true,
        fechaVencimiento: true,
        createdAt: true,
      },
    }),
    prisma.transaccionFinanciera.findMany({
      where: {
        periodoMes: mes,
        periodoAno: ano,
        activo: true,
        ...(tienePropiedad ? { propiedadId } : {}),
      },
      select: {
        tipo: true,
        categoria: true,
        monto: true,
        monedaOriginal: true,
        montoOriginal: true,
        tasaBcv: true,
        fecha: true,
      },
    }),
  ]);

  // Inicializar arreglo de días del mes (1..diasEnMes)
  const diasDelMes: DiaFinancieroMes[] = Array.from({ length: diasEnMes }, (_, i) => ({
    dia: i + 1,
    ingresos: 0,
    egresos: 0,
    conteoIngresos: 0,
    conteoEgresos: 0,
  }));

  let totalIngresosAlquiler = 0;
  let conteoCobranzas = 0;

  for (const p of pagosMes) {
    totalIngresosAlquiler += p.montoPagado;
    conteoCobranzas += 1;

    const fechaRaw = p.fechaPago || p.fechaVencimiento || p.createdAt;
    const diaNum = new Date(fechaRaw).getDate();
    if (diaNum >= 1 && diaNum <= diasEnMes) {
      diasDelMes[diaNum - 1].ingresos += p.montoPagado;
      diasDelMes[diaNum - 1].conteoIngresos += 1;
    }
  }

  let totalIngresosExtra = 0;
  let conteoIngresosExtra = 0;
  let totalEgresos = 0;
  let conteoEgresos = 0;
  let totalEgresosUsd = 0;
  let totalEgresosVes = 0;
  let totalEgresosVesEquivUsd = 0;
  let totalIngresosUsd = totalIngresosAlquiler;
  let totalIngresosVes = 0;
  let totalIngresosVesEquivUsd = 0;
  const conteoCategorias: Record<string, { total: number; conteo: number }> = {};

  for (const t of transaccionesMesTotales) {
    const diaNum = new Date(t.fecha).getDate();
    const esDiaValido = diaNum >= 1 && diaNum <= diasEnMes;

    if (t.tipo === TipoTransaccionFinanciera.INGRESO) {
      totalIngresosExtra += t.monto;
      conteoIngresosExtra += 1;

      if (t.monedaOriginal === MonedaTransaccion.VES) {
        totalIngresosVes += t.montoOriginal || (t.monto * (t.tasaBcv || 1));
        totalIngresosVesEquivUsd += t.monto;
      } else {
        totalIngresosUsd += t.monto;
      }

      if (esDiaValido) {
        diasDelMes[diaNum - 1].ingresos += t.monto;
        diasDelMes[diaNum - 1].conteoIngresos += 1;
      }
    } else {
      totalEgresos += t.monto;
      conteoEgresos += 1;

      if (t.monedaOriginal === MonedaTransaccion.VES) {
        totalEgresosVes += t.montoOriginal || (t.monto * (t.tasaBcv || 1));
        totalEgresosVesEquivUsd += t.monto;
      } else {
        totalEgresosUsd += t.monto;
      }

      if (esDiaValido) {
        diasDelMes[diaNum - 1].egresos += t.monto;
        diasDelMes[diaNum - 1].conteoEgresos += 1;
      }
      const catKey = t.categoria;
      if (!conteoCategorias[catKey]) {
        conteoCategorias[catKey] = { total: 0, conteo: 0 };
      }
      conteoCategorias[catKey].total += t.monto;
      conteoCategorias[catKey].conteo += 1;
    }
  }

  // Redondear montos por día
  diasDelMes.forEach((d) => {
    d.ingresos = Number(d.ingresos.toFixed(2));
    d.egresos = Number(d.egresos.toFixed(2));
  });

  totalIngresosAlquiler = Number(totalIngresosAlquiler.toFixed(2));
  totalIngresosExtra = Number(totalIngresosExtra.toFixed(2));
  totalEgresos = Number(totalEgresos.toFixed(2));
  totalEgresosUsd = Number(totalEgresosUsd.toFixed(2));
  totalEgresosVes = Number(totalEgresosVes.toFixed(2));
  totalEgresosVesEquivUsd = Number(totalEgresosVesEquivUsd.toFixed(2));
  totalIngresosUsd = Number(totalIngresosUsd.toFixed(2));
  totalIngresosVes = Number(totalIngresosVes.toFixed(2));
  totalIngresosVesEquivUsd = Number(totalIngresosVesEquivUsd.toFixed(2));
  const totalIngresos = Number((totalIngresosAlquiler + totalIngresosExtra).toFixed(2));
  const balanceNeto = Number((totalIngresos - totalEgresos).toFixed(2));
  const margenOperativo =
    totalIngresos > 0 ? Number(((balanceNeto / totalIngresos) * 100).toFixed(1)) : 0;

  // Desglose de egresos por categoría
  const desgloseEgresosPorCategoria: CategoriaDesglose[] = Object.entries(
    conteoCategorias
  ).map(([catKey, data]) => {
    const catEnum = catKey as CategoriaTransaccion;
    const catConf = CATEGORIA_CONFIG[catEnum];
    const totalCat = Number(data.total.toFixed(2));
    const porcentaje =
      totalEgresos > 0 ? Number(((totalCat / totalEgresos) * 100).toFixed(1)) : 0;
    return {
      categoria: catEnum,
      label: catConf?.label || catKey,
      total: totalCat,
      conteo: data.conteo,
      porcentaje,
    };
  }).sort((a, b) => b.total - a.total);

  const estadisticas: EstadisticasFinanzas = {
    totalIngresos,
    totalIngresosAlquiler,
    totalIngresosExtra,
    totalEgresos,
    totalEgresosUsd,
    totalEgresosVes,
    totalEgresosVesEquivUsd,
    totalIngresosUsd,
    totalIngresosVes,
    totalIngresosVesEquivUsd,
    balanceNeto,
    margenOperativo,
    conteoCobranzas,
    conteoEgresos,
    conteoIngresosExtra,
    desgloseEgresosPorCategoria,
    diasDelMes,
    diasEnMes,
  };

  // La lista detallada se delega a getMovimientosDetalladosPeriodo mediante Lazy Loading
  return {
    transacciones: [],
    estadisticas,
    totalRegistros: estadisticas.conteoEgresos + estadisticas.conteoIngresosExtra,
    totalPaginas: 1,
    paginaActual: 1,
  };
}

export async function getPropiedadesFinanzasOpciones(): Promise<
  PropiedadFinanzasOpcion[]
> {
  const propiedades = await prisma.propiedad.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      ciudad: true,
      _count: {
        select: {
          transaccionesFinancieras: {
            where: { activo: true },
          },
        },
      },
    },
    orderBy: { nombre: "asc" },
    take: 100,
  });

  return propiedades.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    ciudad: p.ciudad,
    totalEgresos: 0,
    totalIngresos: 0,
    count: p._count.transaccionesFinancieras,
  }));
}

function safeRevalidateFinanzas() {
  try {
    revalidatePath("/admin/finanzas");
  } catch {
    // Entorno de prueba o script independiente
  }
}

export async function crearTransaccionFinanciera(data: TransaccionInput) {
  try {
    const validated = transaccionSchema.parse(data);
    const fechaObj = new Date(validated.fecha);
    const periodoMes = fechaObj.getUTCMonth() + 1;
    const periodoAno = fechaObj.getUTCFullYear();

    let montoCalculado = Number(validated.monto.toFixed(2));
    let montoOriginalVal = validated.montoOriginal ?? null;
    let tasaBcvVal = validated.tasaBcv ?? null;

    if (validated.monedaOriginal === MonedaTransaccion.VES) {
      if (validated.montoOriginal && validated.tasaBcv && validated.tasaBcv > 0) {
        montoCalculado = Number((validated.montoOriginal / validated.tasaBcv).toFixed(2));
      }
    } else {
      montoOriginalVal = montoCalculado;
    }

    // Registrar tasa BCV histórica en la transacción para auditoría
    if (!tasaBcvVal) {
      try {
        const fechaDiaStr = validated.fecha.split("T")[0];
        const resTasa = await getTasaBcvPorFecha(fechaDiaStr);
        if (resTasa?.tasa) {
          tasaBcvVal = resTasa.tasa;
          if (validated.monedaOriginal === MonedaTransaccion.VES && validated.montoOriginal && tasaBcvVal > 0) {
            montoCalculado = Number((validated.montoOriginal / tasaBcvVal).toFixed(2));
          }
        }
      } catch (errTasa) {
        console.warn("No se pudo obtener tasa BCV histórica:", errTasa);
      }
    }

    const nueva = await prisma.transaccionFinanciera.create({
      data: {
        tipo: validated.tipo,
        categoria: validated.categoria,
        concepto: validated.concepto.trim(),
        monto: montoCalculado,
        monedaOriginal: validated.monedaOriginal,
        montoOriginal: montoOriginalVal,
        tasaBcv: tasaBcvVal,
        fecha: fechaObj,
        periodoMes,
        periodoAno,
        metodoPago: validated.metodoPago,
        referencia: validated.referencia?.trim() || null,
        beneficiario: validated.beneficiario?.trim() || null,
        comprobanteUrl: validated.comprobanteUrl || null,
        notas: validated.notas?.trim() || null,
        propiedadId: validated.propiedadId || null,
        unidadId: validated.unidadId || null,
      },
    });

    safeRevalidateFinanzas();
    return { success: true, transaccionId: nueva.id };
  } catch (error: unknown) {
    console.error("Error al crear transacción financiera:", error);
    const mensaje = error instanceof Error ? error.message : "No se pudo registrar la transacción.";
    return {
      success: false,
      error: mensaje,
    };
  }
}

export async function actualizarTransaccionFinanciera(
  id: string,
  data: TransaccionInput
) {
  try {
    const validated = transaccionSchema.parse(data);
    const fechaObj = new Date(validated.fecha);
    const periodoMes = fechaObj.getUTCMonth() + 1;
    const periodoAno = fechaObj.getUTCFullYear();

    let montoCalculado = Number(validated.monto.toFixed(2));
    let montoOriginalVal = validated.montoOriginal ?? null;
    let tasaBcvVal = validated.tasaBcv ?? null;

    if (validated.monedaOriginal === MonedaTransaccion.VES) {
      if (validated.montoOriginal && validated.tasaBcv && validated.tasaBcv > 0) {
        montoCalculado = Number((validated.montoOriginal / validated.tasaBcv).toFixed(2));
      }
    } else {
      montoOriginalVal = montoCalculado;
    }

    // Registrar tasa BCV histórica en la transacción para auditoría
    if (!tasaBcvVal) {
      try {
        const fechaDiaStr = validated.fecha.split("T")[0];
        const resTasa = await getTasaBcvPorFecha(fechaDiaStr);
        if (resTasa?.tasa) {
          tasaBcvVal = resTasa.tasa;
          if (validated.monedaOriginal === MonedaTransaccion.VES && validated.montoOriginal && tasaBcvVal > 0) {
            montoCalculado = Number((validated.montoOriginal / tasaBcvVal).toFixed(2));
          }
        }
      } catch (errTasa) {
        console.warn("No se pudo obtener tasa BCV histórica:", errTasa);
      }
    }

    await prisma.transaccionFinanciera.update({
      where: { id },
      data: {
        tipo: validated.tipo,
        categoria: validated.categoria,
        concepto: validated.concepto.trim(),
        monto: montoCalculado,
        monedaOriginal: validated.monedaOriginal,
        montoOriginal: montoOriginalVal,
        tasaBcv: tasaBcvVal,
        fecha: fechaObj,
        periodoMes,
        periodoAno,
        metodoPago: validated.metodoPago,
        referencia: validated.referencia?.trim() || null,
        beneficiario: validated.beneficiario?.trim() || null,
        comprobanteUrl: validated.comprobanteUrl || null,
        notas: validated.notas?.trim() || null,
        propiedadId: validated.propiedadId || null,
        unidadId: validated.unidadId || null,
      },
    });

    safeRevalidateFinanzas();
    return { success: true };
  } catch (error: unknown) {
    console.error("Error al actualizar transacción financiera:", error);
    const mensaje = error instanceof Error ? error.message : "No se pudo actualizar la transacción.";
    return {
      success: false,
      error: mensaje,
    };
  }
}

export async function eliminarTransaccionFinanciera(id: string) {
  try {
    const existente = await prisma.transaccionFinanciera.findUnique({
      where: { id },
      select: { comprobanteUrl: true },
    });

    if (existente?.comprobanteUrl) {
      // Liberar espacio en UploadThing
      await eliminarArchivosUploadThing(existente.comprobanteUrl).catch(() => {});
    }

    await prisma.transaccionFinanciera.delete({
      where: { id },
    });

    safeRevalidateFinanzas();
    return { success: true };
  } catch (error: unknown) {
    console.error("Error al eliminar transacción financiera:", error);
    const mensaje = error instanceof Error ? error.message : "No se pudo eliminar la transacción.";
    return {
      success: false,
      error: mensaje,
    };
  }
}

export async function getCierreMesData(mes: number, ano: number) {
  try {
    // 1. Ingresos por alquileres agrupados por propiedad
    const pagosMes = await prisma.pago.findMany({
      where: {
        periodoMes: mes,
        periodoAno: ano,
        montoPagado: { gt: 0 },
      },
      select: {
        id: true,
        montoPagado: true,
        monedaOriginal: true,
        montoOriginal: true,
        montoBs: true,
        tasaBcv: true,
        fechaPago: true,
        fechaVencimiento: true,
        createdAt: true,
        contrato: {
          select: {
            codigo: true,
            inquilino: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
            unidad: {
              select: {
                codigo: true,
                propiedad: {
                  select: {
                    id: true,
                    nombre: true,
                    ciudad: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaPago: "asc" },
    });

    // 2. Transacciones financieras del mes (con soporte multimoneda)
    const transaccionesMes = await prisma.transaccionFinanciera.findMany({
      where: {
        periodoMes: mes,
        periodoAno: ano,
        activo: true,
      },
      select: {
        id: true,
        tipo: true,
        categoria: true,
        concepto: true,
        fecha: true,
        monto: true,
        monedaOriginal: true,
        montoOriginal: true,
        tasaBcv: true,
        propiedadId: true,
        propiedad: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
          },
        },
      },
      orderBy: { fecha: "asc" },
    });

    // Tasa BCV histórica oficial de cierre para el mes y año consultado
    let tasaBcvReferencial = 899.27;
    try {
      tasaBcvReferencial = await getTasaBcvCierreMes(mes, ano);
    } catch {
      // Usar fallback seguro
    }

    // Consolidar balance general por propiedad con desglose multimoneda
    const propiedadesMap: Record<
      string,
      {
        propiedadId: string;
        nombre: string;
        ciudad: string;
        ingresos: number;
        ingresosUsd: number;
        ingresosVes: number;
        egresos: number;
        egresosUsd: number;
        egresosVes: number;
        balance: number;
        movimientos: MovimientoCierreItem[];
      }
    > = {};

    let totalIngresosGeneral = 0;
    let totalIngresosUsdGeneral = 0;
    let totalIngresosVesGeneral = 0;

    let totalEgresosGeneral = 0;
    let totalEgresosUsdGeneral = 0;
    let totalEgresosVesGeneral = 0;

    // Procesar alquileres devengados (en USD canónicos)
    for (const p of pagosMes) {
      const prop = p.contrato?.unidad?.propiedad;
      const propId = prop?.id || "GENERAL";
      const propNombre = prop?.nombre || "General / Inmobiliaria";
      const propCiudad = prop?.ciudad || "-";

      if (!propiedadesMap[propId]) {
        propiedadesMap[propId] = {
          propiedadId: propId,
          nombre: propNombre,
          ciudad: propCiudad,
          ingresos: 0,
          ingresosUsd: 0,
          ingresosVes: 0,
          egresos: 0,
          egresosUsd: 0,
          egresosVes: 0,
          balance: 0,
          movimientos: [],
        };
      }
      propiedadesMap[propId].ingresos += p.montoPagado;
      propiedadesMap[propId].ingresosUsd += p.montoPagado;
      totalIngresosGeneral += p.montoPagado;
      totalIngresosUsdGeneral += p.montoPagado;

      const fechaObj = p.fechaPago || p.fechaVencimiento || p.createdAt;
      const inq = p.contrato?.inquilino;
      const inqNombre = inq ? `${inq.nombre}${inq.apellido ? ` ${inq.apellido}` : ""}` : "";
      const unidCodigo = p.contrato?.unidad?.codigo;
      const concepto = unidCodigo
        ? `Cobro Alquiler (${unidCodigo})${inqNombre ? ` - ${inqNombre}` : ""}`
        : `Cobro de Alquiler${inqNombre ? ` - ${inqNombre}` : ""}`;

      const esVes = p.monedaOriginal === MonedaTransaccion.VES;
      propiedadesMap[propId].movimientos.push({
        id: `pago-${p.id}`,
        fecha: fechaObj.toISOString().split("T")[0],
        tipo: "INGRESO",
        concepto,
        propiedad: propNombre,
        monedaOriginal: esVes ? "VES" : "USD",
        montoOriginal: p.montoOriginal || (p.montoBs ? p.montoBs : p.montoPagado),
        montoBs: p.montoBs || null,
        tasaBcv: p.tasaBcv || null,
        montoUsd: Number(p.montoPagado.toFixed(2)),
      });
    }

    // Procesar transacciones financieras
    for (const t of transaccionesMes) {
      const propId = t.propiedadId || "GENERAL";
      const propNombre = t.propiedad?.nombre || "General / Inmobiliaria";
      const propCiudad = t.propiedad?.ciudad || "-";

      if (!propiedadesMap[propId]) {
        propiedadesMap[propId] = {
          propiedadId: propId,
          nombre: propNombre,
          ciudad: propCiudad,
          ingresos: 0,
          ingresosUsd: 0,
          ingresosVes: 0,
          egresos: 0,
          egresosUsd: 0,
          egresosVes: 0,
          balance: 0,
          movimientos: [],
        };
      }

      const esVes = t.monedaOriginal === MonedaTransaccion.VES;
      const montoBs = esVes
        ? (t.montoOriginal || (t.monto * (t.tasaBcv || tasaBcvReferencial)))
        : 0;

      if (t.tipo === TipoTransaccionFinanciera.INGRESO) {
        propiedadesMap[propId].ingresos += t.monto;
        totalIngresosGeneral += t.monto;
        if (esVes) {
          propiedadesMap[propId].ingresosVes += montoBs;
          totalIngresosVesGeneral += montoBs;
        } else {
          propiedadesMap[propId].ingresosUsd += t.monto;
          totalIngresosUsdGeneral += t.monto;
        }
      } else {
        propiedadesMap[propId].egresos += t.monto;
        totalEgresosGeneral += t.monto;
        if (esVes) {
          propiedadesMap[propId].egresosVes += montoBs;
          totalEgresosVesGeneral += montoBs;
        } else {
          propiedadesMap[propId].egresosUsd += t.monto;
          totalEgresosUsdGeneral += t.monto;
        }
      }

      propiedadesMap[propId].movimientos.push({
        id: t.id,
        fecha: t.fecha.toISOString().split("T")[0],
        tipo: t.tipo,
        concepto: t.concepto,
        propiedad: propNombre,
        monedaOriginal: t.monedaOriginal,
        montoOriginal: t.montoOriginal,
        montoBs: esVes ? Number(montoBs.toFixed(2)) : null,
        tasaBcv: t.tasaBcv || (esVes ? tasaBcvReferencial : null),
        montoUsd: Number(t.monto.toFixed(2)),
      });
    }

    // Calcular balances individuales
    const desglosePropiedades = Object.values(propiedadesMap).map((item) => {
      const balance = Number((item.ingresos - item.egresos).toFixed(2));
      item.movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
      return {
        ...item,
        ingresos: Number(item.ingresos.toFixed(2)),
        ingresosUsd: Number(item.ingresosUsd.toFixed(2)),
        ingresosVes: Number(item.ingresosVes.toFixed(2)),
        egresos: Number(item.egresos.toFixed(2)),
        egresosUsd: Number(item.egresosUsd.toFixed(2)),
        egresosVes: Number(item.egresosVes.toFixed(2)),
        balance,
      };
    }).sort((a, b) => b.balance - a.balance);

    // Lista consolidada de todos los movimientos
    const movimientos: MovimientoCierreItem[] = desglosePropiedades.flatMap((p) => p.movimientos);

    return {
      success: true,
      mes,
      ano,
      totalIngresos: Number(totalIngresosGeneral.toFixed(2)),
      totalIngresosUsd: Number(totalIngresosUsdGeneral.toFixed(2)),
      totalIngresosVes: Number(totalIngresosVesGeneral.toFixed(2)),
      totalEgresos: Number(totalEgresosGeneral.toFixed(2)),
      totalEgresosUsd: Number(totalEgresosUsdGeneral.toFixed(2)),
      totalEgresosVes: Number(totalEgresosVesGeneral.toFixed(2)),
      balanceNeto: Number((totalIngresosGeneral - totalEgresosGeneral).toFixed(2)),
      tasaBcvReferencial,
      desglosePropiedades,
      movimientos,
    };
  } catch (error: unknown) {
    console.error("Error al calcular cierre de mes:", error);
    const mensaje = error instanceof Error ? error.message : "No se pudo calcular el cierre del mes.";
    return {
      success: false,
      error: mensaje,
    };
  }
}

// Consultar movimientos detallados de ingresos y egresos por fecha (Lazy Loading)
export async function getMovimientosDetalladosPeriodo(params: {
  mes: number;
  ano: number;
  propiedadId?: string;
}): Promise<MovimientosPeriodoResponse> {
  const { mes, ano, propiedadId = "TODAS" } = params;
  const tienePropiedad = propiedadId && propiedadId !== "TODAS";

  // 1. Pagos de cobranza de alquiler del periodo
  const pagos = await prisma.pago.findMany({
    where: {
      periodoMes: mes,
      periodoAno: ano,
      montoPagado: { gt: 0 },
      ...(tienePropiedad
        ? {
            contrato: {
              unidad: {
                propiedadId: propiedadId,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      montoPagado: true,
      monedaOriginal: true,
      montoOriginal: true,
      montoBs: true,
      tasaBcv: true,
      fechaPago: true,
      fechaVencimiento: true,
      createdAt: true,
      metodoPago: true,
      referencia: true,
      comprobanteUrl: true,
      notas: true,
      contrato: {
        select: {
          codigo: true,
          inquilino: {
            select: {
              nombre: true,
              apellido: true,
              documentoIdentidad: true,
            },
          },
          unidad: {
            select: {
              codigo: true,
              propiedad: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { fechaPago: "desc" },
  });

  // 2. Transacciones financieras manuales (ingresos extra y egresos)
  const transacciones = await prisma.transaccionFinanciera.findMany({
    where: {
      periodoMes: mes,
      periodoAno: ano,
      activo: true,
      ...(tienePropiedad ? { propiedadId } : {}),
    },
    include: {
      propiedad: {
        select: { id: true, nombre: true, tipo: true, ciudad: true },
      },
      unidad: {
        select: { id: true, codigo: true, tipo: true },
      },
    },
    orderBy: { fecha: "desc" },
  });

  // Transformar ingresos
  const ingresos: MovimientoIngresoDetalle[] = [];

  // A) Pagos de alquiler devengados
  for (const p of pagos) {
    const fecha = p.fechaPago || p.fechaVencimiento || p.createdAt;
    const fechaIso = fecha.toISOString();
    const dia = new Date(fecha).getDate();
    const inq = p.contrato?.inquilino;
    const inqNombre = inq
      ? `${inq.nombre}${inq.apellido ? ` ${inq.apellido}` : ""}`
      : "Inquilino";
    const inqDoc = inq?.documentoIdentidad || null;
    const propNombre = p.contrato?.unidad?.propiedad?.nombre || null;
    const unidCodigo = p.contrato?.unidad?.codigo || null;

    ingresos.push({
      id: `pago-${p.id}`,
      tipo: "ALQUILER",
      concepto: "Cobranza de Alquiler",
      contratoCodigo: p.contrato?.codigo || null,
      monto: Number(p.montoPagado.toFixed(2)),
      monedaOriginal: p.monedaOriginal || MonedaTransaccion.USD,
      montoOriginal: p.montoOriginal || (p.montoBs ? p.montoBs : null),
      tasaBcv: p.tasaBcv || null,
      fecha: fechaIso,
      dia,
      inquilinoNombre: inqNombre,
      inquilinoDocumento: inqDoc,
      propiedadNombre: propNombre,
      unidadCodigo: unidCodigo,
      metodoPago: p.metodoPago || null,
      referencia: p.referencia || null,
      comprobanteUrl: p.comprobanteUrl || null,
      notas: p.notas || null,
    });
  }

  // B) Ingresos extra de TransaccionFinanciera
  for (const t of transacciones) {
    if (t.tipo === TipoTransaccionFinanciera.INGRESO) {
      const fechaIso = t.fecha.toISOString();
      const dia = new Date(t.fecha).getDate();

      ingresos.push({
        id: `extra-${t.id}`,
        tipo: "EXTRA",
        concepto: t.concepto,
        monto: Number(t.monto.toFixed(2)),
        monedaOriginal: t.monedaOriginal,
        montoOriginal: t.montoOriginal,
        tasaBcv: t.tasaBcv,
        fecha: fechaIso,
        dia,
        inquilinoNombre: t.beneficiario || "Ingreso Extraordinario",
        inquilinoDocumento: null,
        propiedadNombre: t.propiedad?.nombre || null,
        unidadCodigo: t.unidad?.codigo || null,
        metodoPago: t.metodoPago || null,
        referencia: t.referencia || null,
        comprobanteUrl: t.comprobanteUrl || null,
        notas: t.notas || null,
        transaccionOriginal: {
          ...t,
          fecha: fechaIso,
          createdAt: t.createdAt.toISOString(),
        },
      });
    }
  }

  // Ordenar ingresos por fecha descendente
  ingresos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Transformar egresos
  const egresos: MovimientoEgresoDetalle[] = [];
  for (const t of transacciones) {
    if (t.tipo === TipoTransaccionFinanciera.EGRESO) {
      const fechaIso = t.fecha.toISOString();
      const dia = new Date(t.fecha).getDate();
      const catConf = CATEGORIA_CONFIG[t.categoria] || CATEGORIA_CONFIG.OTRO;

      egresos.push({
        id: t.id,
        concepto: t.concepto,
        categoria: t.categoria,
        categoriaLabel: catConf.label,
        categoriaBadge: catConf.colorBadge,
        monto: Number(t.monto.toFixed(2)),
        monedaOriginal: t.monedaOriginal,
        montoOriginal: t.montoOriginal,
        tasaBcv: t.tasaBcv,
        fecha: fechaIso,
        dia,
        beneficiario: t.beneficiario || null,
        propiedadNombre: t.propiedad?.nombre || null,
        unidadCodigo: t.unidad?.codigo || null,
        metodoPago: t.metodoPago || null,
        referencia: t.referencia || null,
        comprobanteUrl: t.comprobanteUrl || null,
        notas: t.notas || null,
        transaccionOriginal: {
          ...t,
          fecha: fechaIso,
          createdAt: t.createdAt.toISOString(),
        },
      });
    }
  }

  // Ordenar egresos por fecha descendente
  egresos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalIngresos = Number(ingresos.reduce((acc, i) => acc + i.monto, 0).toFixed(2));
  const totalEgresos = Number(egresos.reduce((acc, e) => acc + e.monto, 0).toFixed(2));

  return {
    ingresos,
    egresos,
    totalIngresos,
    totalEgresos,
    conteoIngresos: ingresos.length,
    conteoEgresos: egresos.length,
  };
}
