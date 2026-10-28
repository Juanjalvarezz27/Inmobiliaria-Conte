"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TipoPersona, EstadoContrato, EstadoUnidad, EstadoPago, Prisma } from "@prisma/client";

// Esquema de validación para registrar un inquilino
const createInquilinoSchema = z.object({
  nombre: z.string().min(2, "El nombre o razón social es requerido").trim(),
  apellido: z.string().optional().nullable(),
  tipoPersona: z.nativeEnum(TipoPersona).default(TipoPersona.NATURAL),
  documentoIdentidad: z.string().min(3, "La cédula o RIF es requerido").trim().toUpperCase(),
  telefono: z.string().min(6, "El teléfono de contacto es requerido").trim(),
  telefonoSecundario: z.string().optional().nullable(),
  email: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  direccion: z.string().optional().nullable(),
});

const updateInquilinoSchema = createInquilinoSchema.partial();

export type CreateInquilinoInput = z.infer<typeof createInquilinoSchema>;
export type UpdateInquilinoInput = z.infer<typeof updateInquilinoSchema>;

// Proyección ligera optimizada para el listado general de inquilinos (sin subconsultas de pagos)
const INQUILINO_LIST_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  tipoPersona: true,
  documentoIdentidad: true,
  telefono: true,
  telefonoSecundario: true,
  email: true,
  direccion: true,
  activo: true,
  usuarioId: true,
  usuario: {
    select: {
      id: true,
      email: true,
      activo: true,
      mustChangePassword: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      contratos: {
        where: { estado: EstadoContrato.ACTIVO },
      },
    },
  },
  contratos: {
    where: { estado: EstadoContrato.ACTIVO },
    select: {
      id: true,
      codigo: true,
      montoAlquiler: true,
      fechaFin: true,
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
    },
  },
} satisfies Prisma.InquilinoSelect;

// Proyección completa solo para el modal de ficha técnica (con historial de pagos y solvencia)
const INQUILINO_SELECT = {
  ...INQUILINO_LIST_SELECT,
  contratos: {
    where: { estado: EstadoContrato.ACTIVO },
    select: {
      id: true,
      codigo: true,
      montoAlquiler: true,
      fechaFin: true,
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
        },
        orderBy: [
          { periodoAno: "asc" },
          { periodoMes: "asc" },
        ],
        take: 60,
      },
    },
  },
} satisfies Prisma.InquilinoSelect;

// Obtener detalle completo de un inquilino para la ficha técnica (carga bajo demanda)
export async function getInquilinoDetalle(id: string) {
  try {
    const inquilino = await prisma.inquilino.findUnique({
      where: { id },
      select: INQUILINO_SELECT,
    });
    if (!inquilino) {
      return { success: false, error: "Inquilino no encontrado." };
    }
    return { success: true, data: inquilino };
  } catch (error) {
    console.error("Error al obtener detalle del inquilino:", error);
    return { success: false, error: "No se pudo cargar el detalle del inquilino." };
  }
}

// Obtener listado de inquilinos con proyección ligera
export async function getInquilinos(busqueda?: string) {
  try {
    const q = busqueda?.trim().toLowerCase();

    const inquilinos = await prisma.inquilino.findMany({
      where: q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { apellido: { contains: q, mode: "insensitive" } },
              { documentoIdentidad: { contains: q, mode: "insensitive" } },
              { telefono: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: INQUILINO_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return { success: true, data: inquilinos };
  } catch (error) {
    console.error("Error al obtener inquilinos:", error);
    return { success: false, error: "No se pudo cargar el directorio de inquilinos." };
  }
}

// Obtener estadísticas de inquilinos
export async function getInquilinosStats() {
  try {
    const [total, activos, conContratosActivos] = await Promise.all([
      prisma.inquilino.count(),
      prisma.inquilino.count({ where: { activo: true } }),
      prisma.inquilino.count({
        where: {
          activo: true,
          contratos: {
            some: { estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] } },
          },
        },
      }),
    ]);

    const archivados = total - activos;

    return {
      success: true,
      data: {
        total,
        activos,
        archivados,
        conContratosActivos,
        sinContrato: activos - conContratosActivos,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de inquilinos:", error);
    return {
      success: false,
      data: { total: 0, activos: 0, archivados: 0, conContratosActivos: 0, sinContrato: 0 },
    };
  }
}

// Registrar un nuevo inquilino
export async function createInquilino(data: CreateInquilinoInput) {
  try {
    const parsed = createInquilinoSchema.parse(data);

    // Verificar unicidad de documento de identidad (cédula o RIF)
    const existente = await prisma.inquilino.findUnique({
      where: { documentoIdentidad: parsed.documentoIdentidad },
      select: { id: true, nombre: true },
    });

    if (existente) {
      return {
        success: false,
        error: `Ya existe un inquilino registrado con el documento "${parsed.documentoIdentidad}".`,
      };
    }

    const nuevoInquilino = await prisma.inquilino.create({
      data: {
        nombre: parsed.nombre,
        apellido: parsed.apellido || null,
        tipoPersona: parsed.tipoPersona,
        documentoIdentidad: parsed.documentoIdentidad,
        telefono: parsed.telefono,
        telefonoSecundario: parsed.telefonoSecundario || null,
        email: parsed.email ? parsed.email.toLowerCase() : null,
        direccion: parsed.direccion || null,
        activo: true,
      },
      select: INQUILINO_LIST_SELECT,
    });

    revalidatePath("/admin/inquilinos");
    return { success: true, data: nuevoInquilino };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    console.error("Error al registrar inquilino:", error);
    return { success: false, error: "Ocurrió un error inesperado al registrar el inquilino." };
  }
}

// Actualizar información de un inquilino
export async function updateInquilino(id: string, data: UpdateInquilinoInput) {
  try {
    const parsed = updateInquilinoSchema.parse(data);

    // Verificar si el documento pertenece a otro inquilino
    if (parsed.documentoIdentidad) {
      const duplicado = await prisma.inquilino.findFirst({
        where: {
          documentoIdentidad: parsed.documentoIdentidad,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicado) {
        return {
          success: false,
          error: `Ya existe otro inquilino con el documento "${parsed.documentoIdentidad}".`,
        };
      }
    }

    const actualizado = await prisma.inquilino.update({
      where: { id },
      data: {
        ...parsed,
        email: parsed.email ? parsed.email.toLowerCase() : parsed.email === "" ? null : undefined,
      },
      select: INQUILINO_LIST_SELECT,
    });

    revalidatePath("/admin/inquilinos");
    return { success: true, data: actualizado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos." };
    }
    console.error("Error al actualizar inquilino:", error);
    return { success: false, error: "No se pudo actualizar el inquilino." };
  }
}

// Archivar o inactivar un inquilino (Soft Delete seguro que preserva el historial contable)
export async function archivarInquilino(
  id: string,
  opciones?: { rescindirContratos?: boolean }
) {
  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      // Comprobar si tiene contratos vigentes activos
      const contratosActivos = await tx.contrato.findMany({
        where: {
          inquilinoId: id,
          estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] },
        },
        select: { id: true, unidadId: true },
      });

      if (contratosActivos.length > 0 && !opciones?.rescindirContratos) {
        throw new Error(
          `Este inquilino tiene ${contratosActivos.length} contrato(s) vigente(s). Debes autorizar la rescisión de sus contratos para poder archivarlo.`
        );
      }

      // Si tiene contratos vigentes y se autorizó rescindir, procesarlos atómicamente:
      if (contratosActivos.length > 0 && opciones?.rescindirContratos) {
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const anoActual = hoy.getFullYear();

        for (const c of contratosActivos) {
          // Liberar el espacio a DISPONIBLE
          await tx.unidad.update({
            where: { id: c.unidadId },
            data: { estado: EstadoUnidad.DISPONIBLE },
          });

          // Purgar cuotas futuras pendientes no devengadas que no tienen cobro asentado
          await tx.pago.deleteMany({
            where: {
              contratoId: c.id,
              montoPagado: 0,
              estado: EstadoPago.PENDIENTE,
              OR: [
                { periodoAno: { gt: anoActual } },
                { periodoAno: anoActual, periodoMes: { gt: mesActual } },
              ],
            },
          });

          // Marcar el contrato como RESCINDIDO
          await tx.contrato.update({
            where: { id: c.id },
            data: { estado: EstadoContrato.RESCINDIDO },
          });
        }
      }

      // Marcar al inquilino como inactivo
      return await tx.inquilino.update({
        where: { id },
        data: { activo: false },
        select: INQUILINO_LIST_SELECT,
      });
    });

    revalidatePath("/admin/inquilinos");
    revalidatePath("/admin/contratos");
    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/cobranza");

    return { success: true, data: actualizado };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al archivar inquilino.";
    console.error("Error al archivar inquilino:", error);
    return { success: false, error: message };
  }
}

// Reactivar o restaurar un inquilino archivado
export async function reactivarInquilino(id: string) {
  try {
    const actualizado = await prisma.inquilino.update({
      where: { id },
      data: { activo: true },
      select: INQUILINO_LIST_SELECT,
    });

    revalidatePath("/admin/inquilinos");
    return { success: true, data: actualizado };
  } catch (error) {
    console.error("Error al reactivar inquilino:", error);
    return { success: false, error: "No se pudo reactivar el inquilino." };
  }
}

// Alias retrocompatible
export const deleteInquilino = archivarInquilino;
