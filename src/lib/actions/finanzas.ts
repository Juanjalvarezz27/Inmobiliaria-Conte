"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  TipoTransaccionFinanciera,
  CategoriaTransaccion,
  MetodoPago,
  Prisma,
} from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";
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
} from "@/app/admin/finanzas/types";
import { CATEGORIA_CONFIG } from "@/app/admin/finanzas/constants";

const transaccionSchema = z.object({
  tipo: z.nativeEnum(TipoTransaccionFinanciera),
  categoria: z.nativeEnum(CategoriaTransaccion).optional().default(CategoriaTransaccion.OTRO),
  concepto: z.string().min(2, "El concepto debe tener al menos 2 caracteres"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
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
  const conteoCategorias: Record<string, { total: number; conteo: number }> = {};

  for (const t of transaccionesMesTotales) {
    const diaNum = new Date(t.fecha).getDate();
    const esDiaValido = diaNum >= 1 && diaNum <= diasEnMes;

    if (t.tipo === TipoTransaccionFinanciera.INGRESO) {
      totalIngresosExtra += t.monto;
      conteoIngresosExtra += 1;
      if (esDiaValido) {
        diasDelMes[diaNum - 1].ingresos += t.monto;
        diasDelMes[diaNum - 1].conteoIngresos += 1;
      }
    } else {
      totalEgresos += t.monto;
      conteoEgresos += 1;
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

export async function crearTransaccionFinanciera(data: TransaccionInput) {
  try {
    const validated = transaccionSchema.parse(data);
    const fechaObj = new Date(validated.fecha);
    const periodoMes = fechaObj.getUTCMonth() + 1;
    const periodoAno = fechaObj.getUTCFullYear();

    const nueva = await prisma.transaccionFinanciera.create({
      data: {
        tipo: validated.tipo,
        categoria: validated.categoria,
        concepto: validated.concepto.trim(),
        monto: Number(validated.monto.toFixed(2)),
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

    revalidatePath("/admin/finanzas");
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

    await prisma.transaccionFinanciera.update({
      where: { id },
      data: {
        tipo: validated.tipo,
        categoria: validated.categoria,
        concepto: validated.concepto.trim(),
        monto: Number(validated.monto.toFixed(2)),
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

    revalidatePath("/admin/finanzas");
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

    revalidatePath("/admin/finanzas");
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
        montoPagado: true,
        contrato: {
          select: {
            unidad: {
              select: {
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
    });

    // 2. Transacciones financieras del mes
    const transaccionesMes = await prisma.transaccionFinanciera.findMany({
      where: {
        periodoMes: mes,
        periodoAno: ano,
        activo: true,
      },
      select: {
        tipo: true,
        categoria: true,
        monto: true,
        propiedadId: true,
        propiedad: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
          },
        },
      },
    });

    // Consolidar balance general por propiedad
    const propiedadesMap: Record<
      string,
      {
        nombre: string;
        ciudad: string;
        ingresos: number;
        egresos: number;
        balance: number;
      }
    > = {};

    for (const p of pagosMes) {
      const prop = p.contrato?.unidad?.propiedad;
      const propId = prop?.id || "GENERAL";
      const propNombre = prop?.nombre || "General / Inmobiliaria";
      const propCiudad = prop?.ciudad || "-";

      if (!propiedadesMap[propId]) {
        propiedadesMap[propId] = {
          nombre: propNombre,
          ciudad: propCiudad,
          ingresos: 0,
          egresos: 0,
          balance: 0,
        };
      }
      propiedadesMap[propId].ingresos += p.montoPagado;
    }

    let totalIngresosGeneral = 0;
    let totalEgresosGeneral = 0;

    for (const t of transaccionesMes) {
      const propId = t.propiedadId || "GENERAL";
      const propNombre = t.propiedad?.nombre || "General / Inmobiliaria";
      const propCiudad = t.propiedad?.ciudad || "-";

      if (!propiedadesMap[propId]) {
        propiedadesMap[propId] = {
          nombre: propNombre,
          ciudad: propCiudad,
          ingresos: 0,
          egresos: 0,
          balance: 0,
        };
      }

      if (t.tipo === TipoTransaccionFinanciera.INGRESO) {
        propiedadesMap[propId].ingresos += t.monto;
        totalIngresosGeneral += t.monto;
      } else {
        propiedadesMap[propId].egresos += t.monto;
        totalEgresosGeneral += t.monto;
      }
    }

    // Sumar alquileres al total ingresos
    for (const p of pagosMes) {
      totalIngresosGeneral += p.montoPagado;
    }

    // Calcular balances individuales
    const desglosePropiedades = Object.values(propiedadesMap).map((item) => {
      const balance = Number((item.ingresos - item.egresos).toFixed(2));
      return {
        ...item,
        ingresos: Number(item.ingresos.toFixed(2)),
        egresos: Number(item.egresos.toFixed(2)),
        balance,
      };
    }).sort((a, b) => b.balance - a.balance);

    return {
      success: true,
      mes,
      ano,
      totalIngresos: Number(totalIngresosGeneral.toFixed(2)),
      totalEgresos: Number(totalEgresosGeneral.toFixed(2)),
      balanceNeto: Number((totalIngresosGeneral - totalEgresosGeneral).toFixed(2)),
      desglosePropiedades,
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
