"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EstadoContrato, EstadoUnidad } from "@prisma/client";
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
});

export type CreateContratoInput = z.infer<typeof createContratoSchema>;
export type UpdateContratoInput = z.infer<typeof updateContratoSchema>;

// Proyección mínima optimizada para listados de contratos
const CONTRATO_SELECT = {
  id: true,
  codigo: true,
  fechaInicio: true,
  fechaFin: true,
  diaCobro: true,
  montoAlquiler: true,
  depositoGarantia: true,
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
} as const;

// Obtener listado de contratos con filtros y proyección ligera
export async function getContratos(filtros?: {
  estado?: EstadoContrato | "TODOS";
  search?: string;
}) {
  try {
    const estado = filtros?.estado && filtros.estado !== "TODOS" ? filtros.estado : undefined;
    const q = filtros?.search?.trim().toLowerCase();

    const contratos = await prisma.contrato.findMany({
      where: {
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
      },
      select: CONTRATO_SELECT,
      orderBy: { createdAt: "desc" },
      take: 200,
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
          moneda: parsed.moneda || "USD",
          estado: EstadoContrato.ACTIVO,
          documentoUrl: parsed.documentoUrl || null,
          notas: parsed.notas || null,
        },
        select: CONTRATO_SELECT,
      });

      // 4. Cambiar el estado de la unidad a OCUPADO
      await tx.unidad.update({
        where: { id: parsed.unidadId },
        data: { estado: EstadoUnidad.OCUPADO },
      });

      return contrato;
    });

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");

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
        select: { id: true, estado: true, unidadId: true },
      });

      if (!contrato) {
        throw new Error("Contrato no encontrado.");
      }

      // Si pasa a FINALIZADO o RESCINDIDO, liberar el espacio a DISPONIBLE
      if (
        (nuevoEstado === EstadoContrato.FINALIZADO || nuevoEstado === EstadoContrato.RESCINDIDO) &&
        contrato.estado !== EstadoContrato.FINALIZADO &&
        contrato.estado !== EstadoContrato.RESCINDIDO
      ) {
        await tx.unidad.update({
          where: { id: contrato.unidadId },
          data: { estado: EstadoUnidad.DISPONIBLE },
        });
      }

      // Si se reactiva a ACTIVO, verificar que el espacio esté disponible
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
      }

      return await tx.contrato.update({
        where: { id },
        data: { estado: nuevoEstado },
        select: CONTRATO_SELECT,
      });
    });

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");

    return { success: true, data: resultado };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar el estado del contrato.";
    console.error("Error en updateEstadoContrato:", error);
    return { success: false, error: message };
  }
}

// Actualizar datos del contrato
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

    const dataToUpdate: Record<string, unknown> = { ...parsed };
    if (parsed.fechaFin) {
      dataToUpdate.fechaFin = new Date(parsed.fechaFin);
    }
    if (parsed.documentoUrl === "") {
      dataToUpdate.documentoUrl = null;
    }

    const actualizado = await prisma.contrato.update({
      where: { id },
      data: dataToUpdate,
      select: CONTRATO_SELECT,
    });

    if (docPrevioAEliminar) {
      await eliminarDocumentosUploadThing(docPrevioAEliminar);
    }

    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/inquilinos");
    return { success: true, data: actualizado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    console.error("Error al actualizar contrato:", error);
    return { success: false, error: "No se pudo actualizar el contrato." };
  }
}

// Eliminar un contrato, liberar la unidad si estaba activo y borrar el PDF físico de UploadThing (cuenta conte)
export async function deleteContrato(id: string) {
  try {
    let docAEliminar: string | null = null;

    await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUnique({
        where: { id },
        select: { id: true, estado: true, unidadId: true, documentoUrl: true },
      });

      if (!contrato) throw new Error("Contrato no encontrado.");

      docAEliminar = contrato.documentoUrl;

      if (contrato.estado === EstadoContrato.ACTIVO) {
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
