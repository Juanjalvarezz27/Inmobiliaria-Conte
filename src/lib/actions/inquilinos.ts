"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TipoPersona, EstadoContrato } from "@prisma/client";

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

// Proyección mínima optimizada para consultas de inquilinos
const INQUILINO_SELECT = {
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
} as const;

// Obtener listado de inquilinos con proyección mínima
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
      select: INQUILINO_SELECT,
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
          contratos: {
            some: { estado: EstadoContrato.ACTIVO },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        activos,
        conContratosActivos,
        sinContrato: total - conContratosActivos,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de inquilinos:", error);
    return {
      success: false,
      data: { total: 0, activos: 0, conContratosActivos: 0, sinContrato: 0 },
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
      select: INQUILINO_SELECT,
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
      select: INQUILINO_SELECT,
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

// Eliminar o desactivar un inquilino
export async function deleteInquilino(id: string) {
  try {
    // Comprobar si tiene contratos activos
    const tieneContratosActivos = await prisma.contrato.count({
      where: {
        inquilinoId: id,
        estado: EstadoContrato.ACTIVO,
      },
    });

    if (tieneContratosActivos > 0) {
      return {
        success: false,
        error: "No se puede eliminar un inquilino con contratos vigentes. Finaliza o rescinde sus contratos primero.",
      };
    }

    await prisma.inquilino.delete({
      where: { id },
    });

    revalidatePath("/admin/inquilinos");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar inquilino:", error);
    return { success: false, error: "No se pudo eliminar el inquilino." };
  }
}
