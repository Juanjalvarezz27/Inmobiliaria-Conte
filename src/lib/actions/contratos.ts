"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  EstadoContrato,
  EstadoDeposito,
  EstadoPago,
  EstadoUnidad,
  MetodoPago,
  Prisma,
} from "@prisma/client";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import { resolvePagination, createPaginatedResponse } from "@/lib/pagination-helper";
import { eliminarDocumentosUploadThing } from "@/lib/uploadthing-server";

// Esquema de validación para registrar un contrato
const createContratoSchema = z.object({
  inquilinoId: z.string().min(1, "Debes seleccionar un inquilino"),
  unidadId: z.string().min(1, "Debes seleccionar un espacio disponible"),
  fechaInicio: z.string().min(1, "La fecha de inicio es requerida"),
  fechaFin: z.string().min(1, "La fecha de fin es requerida"),
  diaCobro: z.coerce
    .number()
    .int("El día de cobro debe ser un número entero")
    .min(1, "El día de cobro debe estar entre 1 y 31")
    .max(31, "El día de cobro debe estar entre 1 y 31"),
  montoAlquiler: z.coerce
    .number()
    .min(0.01, "La mensualidad debe ser mayor a 0"),
  depositoGarantia: z.coerce.number().min(0).optional().nullable(),
  depositoCobradoAlFirmar: z.boolean().optional(),
  depositoFechaCobro: z.string().optional().nullable(),
  depositoMetodoPago: z.nativeEnum(MetodoPago).optional().nullable(),
  depositoReferencia: z.string().optional().nullable(),
  moneda: z.string().default("USD"),
  documentoUrl: z.string().url("URL de documento inválida").optional().nullable().or(z.literal("")),
  notas: z.string().optional().nullable(),
});

const updateContratoSchema = z.object({
  fechaFin: z.string().optional(),
  diaCobro: z.coerce.number().min(1).max(31).optional(),
  montoAlquiler: z.coerce.number().min(0).optional(),
  depositoGarantia: z.coerce.number().min(0).optional().nullable(),
  documentoUrl: z.string().optional().nullable().or(z.literal("")),
  notas: z.string().optional().nullable(),
  aplicarDesdeMes: z.coerce.number().min(1).max(12).optional(),
  aplicarDesdeAno: z.coerce.number().min(2000).max(2100).optional(),
});

export type CreateContratoInput = z.infer<typeof createContratoSchema>;
export type UpdateContratoInput = z.infer<typeof updateContratoSchema>;

// Calcula todos los períodos (mes/año) comprendidos entre dos fechas en formato UTC
function obtenerPeriodosContrato(
  fechaInicio: Date,
  fechaFin: Date
): Array<{ mes: number; ano: number }> {
  const periodos: Array<{ mes: number; ano: number }> = [];
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  let ano = inicio.getUTCFullYear();
  let mes = inicio.getUTCMonth() + 1;

  const finAno = fin.getUTCFullYear();
  const finMes = fin.getUTCMonth() + 1;

  while (ano < finAno || (ano === finAno && mes <= finMes)) {
    periodos.push({ mes, ano });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return periodos;
}

// Proyección ligera optimizada para listados y tarjetas de contratos (sin JOIN masivo de pagos)
const CONTRATO_LIST_SELECT = {
  id: true,
  codigo: true,
  fechaInicio: true,
  fechaFin: true,
  diaCobro: true,
  montoAlquiler: true,
  depositoGarantia: true,
  depositoEstado: true,
  depositoFechaCobro: true,
  depositoMetodoPago: true,
  depositoReferencia: true,
  depositoComprobanteUrl: true,
  depositoNotas: true,
  depositoFechaLiquidacion: true,
  depositoMontoReembolsado: true,
  depositoMontoRetenido: true,
  depositoMotivoLiquidacion: true,
  depositoMetodoPagoLiquidacion: true,
  depositoReferenciaLiquidacion: true,
  depositoComprobanteLiquidacionUrl: true,
  moneda: true,
  estado: true,
  documentoUrl: true,
  notas: true,
  createdAt: true,
  updatedAt: true,
  inquilino: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      tipoPersona: true,
      documentoIdentidad: true,
      telefono: true,
      email: true,
    },
  },
  unidad: {
    select: {
      id: true,
      codigo: true,
      tipo: true,
      piso: true,
      areaMt2: true,
      propiedad: {
        select: {
          id: true,
          nombre: true,
          ciudad: true,
          direccion: true,
          tipo: true,
        },
      },
    },
  },
  _count: {
    select: {
      pagos: true,
    },
  },
} satisfies Prisma.ContratoSelect;

// Proyección completa solo para el modal de ficha detallada (con historial de pagos)
const CONTRATO_SELECT = {
  ...CONTRATO_LIST_SELECT,
  pagos: {
    select: {
      id: true,
      periodoMes: true,
      periodoAno: true,
      montoEsperado: true,
      montoPagado: true,
      estado: true,
      fechaVencimiento: true,
      fechaPago: true,
      metodoPago: true,
      referencia: true,
      comprobanteUrl: true,
    },
    orderBy: [
      { periodoAno: "asc" },
      { periodoMes: "asc" },
    ],
    take: 120,
  },
} satisfies Prisma.ContratoSelect;

// Obtener detalle completo de un contrato para el modal (carga bajo demanda)
export async function getContratoDetalle(id: string) {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id },
      select: CONTRATO_SELECT,
    });
    if (!contrato) {
      return { success: false, error: "Contrato no encontrado." };
    }
    return { success: true, data: contrato };
  } catch (error) {
    console.error("Error al obtener detalle del contrato:", error);
    return { success: false, error: "No se pudo cargar el detalle del contrato." };
  }
}

// Filtros para consulta paginada de contratos
export interface FiltrosContratos extends PaginationParams {
  estado?: EstadoContrato | "TODOS";
}

// Consulta paginada real en servidor para contratos (sin tope de take: 200)
export async function getContratosPaginadosAction(
  filtros: FiltrosContratos = {}
): Promise<PaginatedResult<any>> {
  const { page, pageSize, skip, take } = resolvePagination(filtros, 15);
  const estado = filtros.estado && filtros.estado !== "TODOS" ? filtros.estado : undefined;
  const q = filtros.search?.trim().toLowerCase();

  const where: Prisma.ContratoWhereInput = {
    ...(estado ? { estado } : {}),
    ...(q
      ? {
          OR: [
            { codigo: { contains: q, mode: "insensitive" } },
            { inquilino: { nombre: { contains: q, mode: "insensitive" } } },
            { inquilino: { apellido: { contains: q, mode: "insensitive" } } },
            { inquilino: { documentoIdentidad: { contains: q, mode: "insensitive" } } },
            { unidad: { codigo: { contains: q, mode: "insensitive" } } },
            { unidad: { propiedad: { nombre: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, contratos] = await prisma.$transaction([
    prisma.contrato.count({ where }),
    prisma.contrato.findMany({
      where,
      select: CONTRATO_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return createPaginatedResponse(contratos, total, page, pageSize);
}

// Obtener listado de contratos con filtros y proyección ligera
export async function getContratos(filtros?: {
  estado?: EstadoContrato | "TODOS";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const estado = filtros?.estado && filtros.estado !== "TODOS" ? filtros.estado : undefined;
    const q = filtros?.search?.trim().toLowerCase();

    const where: Prisma.ContratoWhereInput = {
      ...(estado ? { estado } : {}),
      ...(q
        ? {
            OR: [
              { codigo: { contains: q, mode: "insensitive" } },
              { inquilino: { nombre: { contains: q, mode: "insensitive" } } },
              { inquilino: { apellido: { contains: q, mode: "insensitive" } } },
              { inquilino: { documentoIdentidad: { contains: q, mode: "insensitive" } } },
              { unidad: { codigo: { contains: q, mode: "insensitive" } } },
              { unidad: { propiedad: { nombre: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    if (filtros?.page || filtros?.pageSize) {
      const { skip, take, page, pageSize } = resolvePagination(filtros, 15);
      const [total, contratos] = await prisma.$transaction([
        prisma.contrato.count({ where }),
        prisma.contrato.findMany({
          where,
          select: CONTRATO_LIST_SELECT,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
      ]);
      return { success: true, data: contratos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    const contratos = await prisma.contrato.findMany({
      where,
      select: CONTRATO_LIST_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: contratos };
  } catch (error) {
    console.error("Error al obtener contratos:", error);
    return { success: false, error: "No se pudieron cargar los contratos." };
  }
}

// Obtener estadísticas de contratos
export async function getContratosStats() {
  try {
    const ahora = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);

    const [total, activos, porVencer, finalizados] = await Promise.all([
      prisma.contrato.count(),
      prisma.contrato.count({ where: { estado: EstadoContrato.ACTIVO } }),
      prisma.contrato.count({
        where: {
          estado: EstadoContrato.ACTIVO,
          fechaFin: {
            gte: ahora,
            lte: en30Dias,
          },
        },
      }),
      prisma.contrato.count({
        where: {
          estado: { in: [EstadoContrato.FINALIZADO, EstadoContrato.RESCINDIDO] },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        activos,
        porVencer,
        finalizados,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de contratos:", error);
    return {
      success: false,
      data: { total: 0, activos: 0, porVencer: 0, finalizados: 0 },
    };
  }
}

// Obtener espacios disponibles (no ocupados) para el selector del contrato
export async function getUnidadesDisponiblesParaContrato() {
  try {
    const unidades = await prisma.unidad.findMany({
      where: {
        estado: {
          not: EstadoUnidad.OCUPADO,
        },
      },
      select: {
        id: true,
        codigo: true,
        tipo: true,
        estado: true,
        piso: true,
        areaMt2: true,
        precioAlquiler: true,
        propiedad: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            tipo: true,
          },
        },
      },
      orderBy: [
        { propiedad: { nombre: "asc" } },
        { codigo: "asc" },
      ],
      take: 150,
    });

    return { success: true, data: unidades };
  } catch (error) {
    console.error("Error al obtener espacios disponibles:", error);
    return { success: false, error: "No se pudieron cargar los espacios disponibles." };
  }
}

// Obtener inquilinos activos para el selector de contrato
export async function getInquilinosParaSelector() {
  try {
    const inquilinos = await prisma.inquilino.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tipoPersona: true,
        documentoIdentidad: true,
        telefono: true,
      },
      orderBy: { nombre: "asc" },
      take: 200,
    });

    return { success: true, data: inquilinos };
  } catch (error) {
    console.error("Error al obtener inquilinos para selector:", error);
    return { success: false, error: "No se pudieron cargar los inquilinos." };
  }
}

// Crear contrato con transacción atómica (actualiza la unidad a OCUPADO)
export async function createContrato(data: CreateContratoInput) {
  try {
    const parsed = createContratoSchema.parse(data);

    const fInicio = new Date(parsed.fechaInicio);
    const fFin = new Date(parsed.fechaFin);

    if (fFin <= fInicio) {
      return {
        success: false,
        error: "La fecha de fin del contrato debe ser posterior a la fecha de inicio.",
      };
    }

    // Transacción atómica de Prisma
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Validar que la unidad no esté ocupada por otro contrato
      const unidad = await tx.unidad.findUnique({
        where: { id: parsed.unidadId },
        select: { id: true, codigo: true, estado: true },
      });

      if (!unidad) {
        throw new Error("El espacio seleccionado no existe.");
      }

      if (unidad.estado === EstadoUnidad.OCUPADO) {
        throw new Error(`El espacio "${unidad.codigo}" ya se encuentra ocupado por otro contrato activo.`);
      }

      // 2. Generar código único de contrato
      const year = fInicio.getFullYear();
      const countYear = await tx.contrato.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      });
      const consecutivo = String(countYear + 1).padStart(3, "0");
      const codigoContrato = `CTR-${year}-${consecutivo}`;

      // 3. Crear el contrato
      const tieneDeposito = parsed.depositoGarantia && parsed.depositoGarantia > 0;
      let depositoEstado: EstadoDeposito = EstadoDeposito.NO_APLICA;
      let depositoFechaCobro: Date | null = null;
      let depositoMetodoPago: MetodoPago | null = null;
      let depositoReferencia: string | null = null;

      if (tieneDeposito) {
        if (parsed.depositoCobradoAlFirmar && parsed.depositoMetodoPago) {
          depositoEstado = EstadoDeposito.COBRADO;
          depositoFechaCobro = parsed.depositoFechaCobro ? new Date(parsed.depositoFechaCobro) : fInicio;
          depositoMetodoPago = parsed.depositoMetodoPago;
          depositoReferencia = parsed.depositoReferencia || null;
        } else {
          depositoEstado = EstadoDeposito.PENDIENTE;
        }
      }

      const contrato = await tx.contrato.create({
        data: {
          codigo: codigoContrato,
          inquilinoId: parsed.inquilinoId,
          unidadId: parsed.unidadId,
          fechaInicio: fInicio,
          fechaFin: fFin,
          diaCobro: parsed.diaCobro,
          montoAlquiler: parsed.montoAlquiler,
          depositoGarantia: parsed.depositoGarantia || null,
          depositoEstado,
          depositoFechaCobro,
          depositoMetodoPago,
          depositoReferencia,
          moneda: parsed.moneda || "USD",
          estado: EstadoContrato.ACTIVO,
          documentoUrl: parsed.documentoUrl || null,
          notas: parsed.notas || null,
        },
        select: CONTRATO_LIST_SELECT,
      });

      // 4. Cambiar el estado de la unidad a OCUPADO
      await tx.unidad.update({
        where: { id: parsed.unidadId },
        data: { estado: EstadoUnidad.OCUPADO },
      });

      // 5. Pre-generar cronograma de cuotas mensuales del contrato
      const periodos = obtenerPeriodosContrato(fInicio, fFin);
      const ahora = new Date();
      const cuotasParaCrear = periodos.map(({ mes, ano }) => {
        const ultimoDiaMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
        const diaEfectivo = Math.min(parsed.diaCobro, ultimoDiaMes);
        const fechaVencimiento = new Date(Date.UTC(ano, mes - 1, diaEfectivo, 23, 59, 59, 999));
        const esVencido = ahora > fechaVencimiento;
        return {
          contratoId: contrato.id,
          periodoMes: mes,
          periodoAno: ano,
          montoEsperado: parsed.montoAlquiler,
          montoPagado: 0,
          fechaVencimiento,
          estado: esVencido ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE,
        };
      });

      if (cuotasParaCrear.length > 0) {
        await tx.pago.createMany({
          data: cuotasParaCrear,
          skipDuplicates: true,
        });
      }

      return contrato;
    });

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true, data: resultado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    const message = error instanceof Error ? error.message : "Error al registrar el contrato.";
    console.error("Error en createContrato:", error);
    return { success: false, error: message };
  }
}

// Cambiar estado del contrato (si finaliza o rescinde, libera la unidad a DISPONIBLE)
export async function updateEstadoContrato(id: string, nuevoEstado: EstadoContrato) {
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUnique({
        where: { id },
        select: {
          id: true,
          estado: true,
          unidadId: true,
          depositoEstado: true,
          depositoGarantia: true,
          depositoComprobanteLiquidacionUrl: true,
        },
      });

      if (!contrato) {
        throw new Error("Contrato no encontrado.");
      }

      // Si pasa a FINALIZADO o RESCINDIDO, liberar el espacio a DISPONIBLE y purgar cuotas futuras no devengadas
      if (
        (nuevoEstado === EstadoContrato.FINALIZADO || nuevoEstado === EstadoContrato.RESCINDIDO) &&
        contrato.estado !== EstadoContrato.FINALIZADO &&
        contrato.estado !== EstadoContrato.RESCINDIDO
      ) {
        await tx.unidad.update({
          where: { id: contrato.unidadId },
          data: { estado: EstadoUnidad.DISPONIBLE },
        });

        // Purgar cuotas futuras pendientes no devengadas que no tienen pagos asentados
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const anoActual = hoy.getFullYear();

        await tx.pago.deleteMany({
          where: {
            contratoId: id,
            montoPagado: 0,
            estado: EstadoPago.PENDIENTE,
            OR: [
              { periodoAno: { gt: anoActual } },
              { periodoAno: anoActual, periodoMes: { gt: mesActual } },
            ],
          },
        });
      }

      const dataActualizacion: Prisma.ContratoUpdateInput = { estado: nuevoEstado };

      // Si se reactiva a ACTIVO, verificar que el espacio esté disponible y restablecer el depósito a custodia
      if (
        nuevoEstado === EstadoContrato.ACTIVO &&
        (contrato.estado === EstadoContrato.FINALIZADO || contrato.estado === EstadoContrato.RESCINDIDO)
      ) {
        const unidad = await tx.unidad.findUnique({
          where: { id: contrato.unidadId },
          select: { estado: true, codigo: true },
        });

        if (unidad && unidad.estado !== EstadoUnidad.DISPONIBLE) {
          throw new Error(`No se puede reactivar: el espacio "${unidad.codigo}" ya está ${unidad.estado.toLowerCase()}.`);
        }

        await tx.unidad.update({
          where: { id: contrato.unidadId },
          data: { estado: EstadoUnidad.OCUPADO },
        });

        // Al reactivar, si el depósito estaba finiquitado, vuelve automáticamente a custodia activa
        if (
          contrato.depositoEstado === EstadoDeposito.REEMBOLSADO ||
          contrato.depositoEstado === EstadoDeposito.RETENIDO ||
          contrato.depositoEstado === EstadoDeposito.PARCIALMENTE_RETENIDO
        ) {
          dataActualizacion.depositoEstado = EstadoDeposito.COBRADO;
          dataActualizacion.depositoFechaLiquidacion = null;
          dataActualizacion.depositoMontoReembolsado = null;
          dataActualizacion.depositoMontoRetenido = null;
          dataActualizacion.depositoMotivoLiquidacion = null;
          dataActualizacion.depositoComprobanteLiquidacionUrl = null;
        }
      }

      return await tx.contrato.update({
        where: { id },
        data: dataActualizacion,
        select: CONTRATO_LIST_SELECT,
      });
    });

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true, data: resultado };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar el estado del contrato.";
    console.error("Error en updateEstadoContrato:", error);
    return { success: false, error: message };
  }
}

// Actualizar datos del contrato y sincronizar cuotas con preservación histórica
export async function updateContrato(id: string, data: UpdateContratoInput) {
  try {
    const parsed = updateContratoSchema.parse(data);

    // Si se modifica el documento, verificar si había uno previo para eliminarlo físicamente
    let docPrevioAEliminar: string | null = null;
    if (parsed.documentoUrl !== undefined) {
      const previo = await prisma.contrato.findUnique({
        where: { id },
        select: { documentoUrl: true },
      });
      if (previo?.documentoUrl && previo.documentoUrl !== parsed.documentoUrl) {
        docPrevioAEliminar = previo.documentoUrl;
      }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obtener contrato previo con todos sus pagos registrados
      const contratoPrevio = await tx.contrato.findUnique({
        where: { id },
        include: {
          pagos: true,
        },
      });

      if (!contratoPrevio) {
        throw new Error("Contrato no encontrado.");
      }

      const nuevoMonto = parsed.montoAlquiler !== undefined ? parsed.montoAlquiler : contratoPrevio.montoAlquiler;
      const nuevoDia = parsed.diaCobro !== undefined ? parsed.diaCobro : contratoPrevio.diaCobro;
      const nuevaFechaFin = parsed.fechaFin ? new Date(parsed.fechaFin) : contratoPrevio.fechaFin;

      const cambioMonto = parsed.montoAlquiler !== undefined && parsed.montoAlquiler !== contratoPrevio.montoAlquiler;
      const cambioDia = parsed.diaCobro !== undefined && parsed.diaCobro !== contratoPrevio.diaCobro;
      const cambioFechaFin = parsed.fechaFin !== undefined && nuevaFechaFin.getTime() !== contratoPrevio.fechaFin.getTime();

      const dataToUpdate: Record<string, unknown> = { ...parsed };
      delete dataToUpdate.aplicarDesdeMes;
      delete dataToUpdate.aplicarDesdeAno;

      if (parsed.fechaFin) {
        dataToUpdate.fechaFin = nuevaFechaFin;
      }
      if (parsed.documentoUrl === "") {
        dataToUpdate.documentoUrl = null;
      }
      if (parsed.depositoGarantia !== undefined) {
        if (!parsed.depositoGarantia || parsed.depositoGarantia <= 0) {
          if (contratoPrevio.depositoEstado === EstadoDeposito.PENDIENTE) {
            dataToUpdate.depositoEstado = EstadoDeposito.NO_APLICA;
          }
        } else if (contratoPrevio.depositoEstado === EstadoDeposito.NO_APLICA) {
          dataToUpdate.depositoEstado = EstadoDeposito.PENDIENTE;
        }
      }

      // 2. Actualizar datos base del contrato
      const contratoActualizado = await tx.contrato.update({
        where: { id },
        data: dataToUpdate,
        select: CONTRATO_LIST_SELECT,
      });

      // 3. Manejo de cuotas: Preservación histórica de pagos y actualización de cuotas que faltan
      if (cambioMonto || cambioDia || cambioFechaFin) {
        const ahora = new Date();
        const mesActual = ahora.getMonth() + 1;
        const anoActual = ahora.getFullYear();

        // Determinar período de corte efectivo
        let desdeMes = parsed.aplicarDesdeMes;
        let desdeAno = parsed.aplicarDesdeAno;

        if (!desdeMes || !desdeAno) {
          // Si no se especificó, encontrar el primer período pendiente / no pagado
          const pagosSinPagar = contratoPrevio.pagos
            .filter((p) => p.montoPagado === 0 && p.estado !== EstadoPago.PAGADO)
            .sort((a, b) => (a.periodoAno !== b.periodoAno ? a.periodoAno - b.periodoAno : a.periodoMes - b.periodoMes));

          if (pagosSinPagar.length > 0) {
            desdeMes = pagosSinPagar[0].periodoMes;
            desdeAno = pagosSinPagar[0].periodoAno;
          } else {
            desdeMes = mesActual;
            desdeAno = anoActual;
          }
        }

        // A) Actualizar cuotas existentes NO PAGADAS que sean >= al periodo efectivo
        for (const pago of contratoPrevio.pagos) {
          // REGLA DE ORO: Si ya se pagó (montoPagado > 0 o estado === PAGADO), se mantiene 100% INMUTABLE.
          if (pago.montoPagado > 0 || pago.estado === EstadoPago.PAGADO) {
            continue;
          }

          const esPeriodoEfectivo =
            pago.periodoAno > desdeAno || (pago.periodoAno === desdeAno && pago.periodoMes >= desdeMes);

          if (esPeriodoEfectivo) {
            const ultimoDia = new Date(Date.UTC(pago.periodoAno, pago.periodoMes, 0)).getUTCDate();
            const diaEfectivo = Math.min(nuevoDia, ultimoDia);
            const nuevaFechaVenc = new Date(Date.UTC(pago.periodoAno, pago.periodoMes - 1, diaEfectivo, 23, 59, 59, 999));
            const esVencido = ahora > nuevaFechaVenc;

            await tx.pago.update({
              where: { id: pago.id },
              data: {
                montoEsperado: nuevoMonto,
                fechaVencimiento: nuevaFechaVenc,
                estado: esVencido ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE,
              },
            });
          }
        }

        // B) Si se amplió fechaFin o faltan cuotas por generar en el cronograma
        const periodosTotales = obtenerPeriodosContrato(contratoPrevio.fechaInicio, nuevaFechaFin);
        const setPagosExistentes = new Set(contratoPrevio.pagos.map((p) => `${p.periodoAno}-${p.periodoMes}`));

        const nuevasCuotas = [];
        for (const { mes: pMes, ano: pAno } of periodosTotales) {
          if (!setPagosExistentes.has(`${pAno}-${pMes}`)) {
            const ultimoDia = new Date(Date.UTC(pAno, pMes, 0)).getUTCDate();
            const diaEfectivo = Math.min(nuevoDia, ultimoDia);
            const fechaVenc = new Date(Date.UTC(pAno, pMes - 1, diaEfectivo, 23, 59, 59, 999));
            const esVencido = ahora > fechaVenc;

            const esEfectivo = pAno > desdeAno || (pAno === desdeAno && pMes >= desdeMes);
            const montoCuota = esEfectivo ? nuevoMonto : contratoPrevio.montoAlquiler;

            nuevasCuotas.push({
              contratoId: id,
              periodoMes: pMes,
              periodoAno: pAno,
              montoEsperado: montoCuota,
              montoPagado: 0,
              fechaVencimiento: fechaVenc,
              estado: esVencido ? EstadoPago.VENCIDO : EstadoPago.PENDIENTE,
            });
          }
        }

        if (nuevasCuotas.length > 0) {
          await tx.pago.createMany({
            data: nuevasCuotas,
            skipDuplicates: true,
          });
        }

        // C) Si se acortó fechaFin, eliminar cuotas futuras posteriores que nunca se pagaron
        if (cambioFechaFin && nuevaFechaFin < contratoPrevio.fechaFin) {
          const finAno = nuevaFechaFin.getUTCFullYear();
          const finMes = nuevaFechaFin.getUTCMonth() + 1;

          await tx.pago.deleteMany({
            where: {
              contratoId: id,
              montoPagado: 0,
              estado: { not: EstadoPago.PAGADO },
              OR: [
                { periodoAno: { gt: finAno } },
                { periodoAno: finAno, periodoMes: { gt: finMes } },
              ],
            },
          });
        }
      }

      return contratoActualizado;
    });

    if (docPrevioAEliminar) {
      await eliminarDocumentosUploadThing(docPrevioAEliminar);
    }

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");
    return { success: true, data: resultado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    const message = error instanceof Error ? error.message : "No se pudo actualizar el contrato.";
    console.error("Error al actualizar contrato:", error);
    return { success: false, error: message };
  }
}

// Eliminar un contrato si no tiene historial contable registrado, liberar la unidad si estaba activo y borrar el PDF físico de UploadThing
export async function deleteContrato(id: string) {
  try {
    let docAEliminar: string | null = null;

    await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUnique({
        where: { id },
        select: {
          id: true,
          estado: true,
          unidadId: true,
          documentoUrl: true,
          pagos: {
            where: {
              OR: [
                { montoPagado: { gt: 0 } },
                { estado: { in: [EstadoPago.PAGADO, EstadoPago.PARCIAL] } },
              ],
            },
            select: { id: true },
          },
        },
      });

      if (!contrato) throw new Error("Contrato no encontrado.");

      // Si el contrato ya tiene pagos asentados, bloqueamos el borrado destructivo
      if (contrato.pagos.length > 0) {
        throw new Error(
          "No se puede eliminar este contrato porque posee historial contable y pagos registrados. Para retirarlo de operaciones conservando la trazabilidad financiera, cámbialo a estado RESCINDIDO o FINALIZADO."
        );
      }

      // Si tiene cuotas pendientes no pagadas (montoPagado = 0), las eliminamos de forma segura para permitir el borrado sin error de clave foránea
      await tx.pago.deleteMany({
        where: {
          contratoId: id,
          montoPagado: 0,
        },
      });

      docAEliminar = contrato.documentoUrl;

      if (contrato.estado === EstadoContrato.ACTIVO || contrato.estado === EstadoContrato.POR_VENCER) {
        await tx.unidad.update({
          where: { id: contrato.unidadId },
          data: { estado: EstadoUnidad.DISPONIBLE },
        });
      }

      await tx.contrato.delete({ where: { id } });
    });

    // Limpieza física del archivo PDF en la cuenta de conte
    if (docAEliminar) {
      await eliminarDocumentosUploadThing(docAEliminar);
    }

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar el contrato.";
    console.error("Error en deleteContrato:", error);
    return { success: false, error: message };
  }
}

// Acción del servidor para eliminar un documento PDF individual de UploadThing (ej. al quitarlo en el formulario)
export async function eliminarDocumentoContratoAction(url: string) {
  try {
    await eliminarDocumentosUploadThing(url);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar documento de UploadThing:", error);
    return { success: false, error: "No se pudo eliminar el documento físico." };
  }
}

// Esquema para registrar el cobro de depósito en garantía
const registrarCobroDepositoSchema = z.object({
  contratoId: z.string().min(1, "ID de contrato requerido"),
  fechaCobro: z.string().min(1, "La fecha de cobro es requerida"),
  metodoPago: z.nativeEnum(MetodoPago),
  referencia: z.string().optional().nullable(),
  comprobanteUrl: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export type RegistrarCobroDepositoInput = z.infer<typeof registrarCobroDepositoSchema>;

export async function registrarCobroDeposito(input: RegistrarCobroDepositoInput) {
  try {
    const parsed = registrarCobroDepositoSchema.parse(input);

    const contrato = await prisma.contrato.findUnique({
      where: { id: parsed.contratoId },
      select: { id: true, depositoGarantia: true, depositoEstado: true },
    });

    if (!contrato) {
      return { success: false, error: "Contrato no encontrado." };
    }

    if (!contrato.depositoGarantia || contrato.depositoGarantia <= 0) {
      return { success: false, error: "Este contrato no tiene estipulado un depósito en garantía." };
    }

    const contratoActualizado = await prisma.contrato.update({
      where: { id: parsed.contratoId },
      data: {
        depositoEstado: EstadoDeposito.COBRADO,
        depositoFechaCobro: new Date(parsed.fechaCobro),
        depositoMetodoPago: parsed.metodoPago,
        depositoReferencia: parsed.referencia?.trim() || null,
        depositoComprobanteUrl: parsed.comprobanteUrl || null,
        depositoNotas: parsed.notas?.trim() || null,
      },
      select: CONTRATO_LIST_SELECT,
    });

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true, data: contratoActualizado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    const message = error instanceof Error ? error.message : "Error al registrar cobro de depósito.";
    console.error("Error en registrarCobroDeposito:", error);
    return { success: false, error: message };
  }
}

// Esquema para cerrar un contrato (finalizar o rescindir) resolviendo el depósito de forma directa
const cerrarContratoSchema = z.object({
  contratoId: z.string().min(1, "ID de contrato requerido"),
  nuevoEstado: z.enum([EstadoContrato.FINALIZADO, EstadoContrato.RESCINDIDO]),
  tieneDepositoEnCustodia: z.boolean().optional(),
  tipoResolucion: z.enum(["REEMBOLSO_TOTAL", "RETENCION_TOTAL", "MIXTO"]).optional(),
  montoReembolsado: z.coerce.number().min(0).optional(),
  montoRetenido: z.coerce.number().min(0).optional(),
  motivoRetencion: z.string().optional().nullable(),
  metodoPagoLiquidacion: z.nativeEnum(MetodoPago).optional().nullable(),
  referenciaLiquidacion: z.string().optional().nullable(),
});

export type CerrarContratoInput = z.infer<typeof cerrarContratoSchema>;

export async function cerrarContratoAction(input: CerrarContratoInput) {
  try {
    const parsed = cerrarContratoSchema.parse(input);

    const resultado = await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUnique({
        where: { id: parsed.contratoId },
        select: {
          id: true,
          estado: true,
          unidadId: true,
          depositoGarantia: true,
          depositoEstado: true,
        },
      });

      if (!contrato) throw new Error("Contrato no encontrado.");

      const dataActualizacion: Prisma.ContratoUpdateInput = {
        estado: parsed.nuevoEstado,
      };

      // Si tiene depósito cobrado en custodia y se especificó resolución:
      if (parsed.tieneDepositoEnCustodia && contrato.depositoEstado === EstadoDeposito.COBRADO) {
        const total = contrato.depositoGarantia || 0;
        let ret = 0;
        let reem = total;
        let nuevoEstadoDep: EstadoDeposito = EstadoDeposito.REEMBOLSADO;

        if (parsed.tipoResolucion === "RETENCION_TOTAL") {
          ret = total;
          reem = 0;
          nuevoEstadoDep = EstadoDeposito.RETENIDO;
        } else if (parsed.tipoResolucion === "MIXTO") {
          ret = parsed.montoRetenido || 0;
          reem = parsed.montoReembolsado || 0;
          if (ret > 0 && reem > 0) {
            nuevoEstadoDep = EstadoDeposito.PARCIALMENTE_RETENIDO;
          } else if (ret > 0) {
            nuevoEstadoDep = EstadoDeposito.RETENIDO;
          } else {
            nuevoEstadoDep = EstadoDeposito.REEMBOLSADO;
          }
        }

        dataActualizacion.depositoEstado = nuevoEstadoDep;
        dataActualizacion.depositoFechaLiquidacion = new Date();
        dataActualizacion.depositoMontoReembolsado = reem;
        dataActualizacion.depositoMontoRetenido = ret;
        dataActualizacion.depositoMotivoLiquidacion = parsed.motivoRetencion?.trim() || null;
        dataActualizacion.depositoMetodoPagoLiquidacion = parsed.metodoPagoLiquidacion || null;
        dataActualizacion.depositoReferenciaLiquidacion = parsed.referenciaLiquidacion?.trim() || null;
      }

      // Liberar la unidad a DISPONIBLE
      await tx.unidad.update({
        where: { id: contrato.unidadId },
        data: { estado: EstadoUnidad.DISPONIBLE },
      });

      // Purgar cuotas futuras pendientes no devengadas que no tienen abonos
      const hoy = new Date();
      const mesActual = hoy.getMonth() + 1;
      const anoActual = hoy.getFullYear();

      await tx.pago.deleteMany({
        where: {
          contratoId: parsed.contratoId,
          montoPagado: 0,
          estado: EstadoPago.PENDIENTE,
          OR: [
            { periodoAno: { gt: anoActual } },
            { periodoAno: anoActual, periodoMes: { gt: mesActual } },
          ],
        },
      });

      return await tx.contrato.update({
        where: { id: parsed.contratoId },
        data: dataActualizacion,
        select: CONTRATO_LIST_SELECT,
      });
    });

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true, data: resultado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    const message = error instanceof Error ? error.message : "Error al cerrar el contrato.";
    console.error("Error en cerrarContratoAction:", error);
    return { success: false, error: message };
  }
}



// Revertir liquidación del depósito (regresarlo a estado COBRADO en custodia)
export async function revertirLiquidacionDeposito(contratoId: string) {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: {
        id: true,
        depositoEstado: true,
        depositoComprobanteLiquidacionUrl: true,
      },
    });

    if (!contrato) throw new Error("Contrato no encontrado.");

    if (
      contrato.depositoEstado !== EstadoDeposito.REEMBOLSADO &&
      contrato.depositoEstado !== EstadoDeposito.RETENIDO &&
      contrato.depositoEstado !== EstadoDeposito.PARCIALMENTE_RETENIDO
    ) {
      throw new Error("El depósito no se encuentra en estado liquidado.");
    }

    const compAEliminar = contrato.depositoComprobanteLiquidacionUrl;

    const contratoActualizado = await prisma.contrato.update({
      where: { id: contratoId },
      data: {
        depositoEstado: EstadoDeposito.COBRADO,
        depositoFechaLiquidacion: null,
        depositoMontoReembolsado: null,
        depositoMontoRetenido: null,
        depositoMotivoLiquidacion: null,
        depositoMetodoPagoLiquidacion: null,
        depositoReferenciaLiquidacion: null,
        depositoComprobanteLiquidacionUrl: null,
      },
      select: CONTRATO_LIST_SELECT,
    });

    if (compAEliminar) {
      await eliminarDocumentosUploadThing(compAEliminar).catch(() => {});
    }

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true, data: contratoActualizado };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al revertir liquidación.";
    console.error("Error en revertirLiquidacionDeposito:", error);
    return { success: false, error: message };
  }
}

// Revertir cobro del depósito (regresarlo a estado PENDIENTE)
export async function revertirCobroDeposito(contratoId: string) {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: {
        id: true,
        depositoEstado: true,
        depositoComprobanteUrl: true,
      },
    });

    if (!contrato) throw new Error("Contrato no encontrado.");

    if (contrato.depositoEstado !== EstadoDeposito.COBRADO) {
      throw new Error("Solo se puede revertir un depósito que esté cobrado y no liquidado.");
    }

    const compAEliminar = contrato.depositoComprobanteUrl;

    const contratoActualizado = await prisma.contrato.update({
      where: { id: contratoId },
      data: {
        depositoEstado: EstadoDeposito.PENDIENTE,
        depositoFechaCobro: null,
        depositoMetodoPago: null,
        depositoReferencia: null,
        depositoComprobanteUrl: null,
        depositoNotas: null,
      },
      select: CONTRATO_LIST_SELECT,
    });

    if (compAEliminar) {
      await eliminarDocumentosUploadThing(compAEliminar).catch(() => {});
    }

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/cobranza");

    return { success: true, data: contratoActualizado };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al revertir cobro.";
    console.error("Error en revertirCobroDeposito:", error);
    return { success: false, error: message };
  }
}
