"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Esquema de validación para cambio de contraseña desde el perfil
const cambiarPasswordPerfilSchema = z
  .object({
    passwordActual: z.string().optional(),
    passwordNueva: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
    passwordConfirmacion: z.string().min(6, "Debes confirmar tu nueva contraseña"),
  })
  .refine((data) => data.passwordNueva === data.passwordConfirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmacion"],
  });

export interface PerfilUsuarioData {
  id: string;
  email: string;
  nombre: string;
  apellido: string | null;
  cedula: string | null;
  telefono: string | null;
  direccion: string | null;
  rol: "ADMIN" | "EMPLEADO" | "INQUILINO";
  activo: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  inquilino?: {
    id: string;
    tipoPersona: string;
    documentoIdentidad: string;
    telefono: string;
    email: string | null;
  } | null;
  empleado?: {
    id: string;
    cargo: string;
    cargoPersonalizado: string | null;
    cedula: string;
    telefono: string;
    fechaIngreso: Date;
    propiedadNombre: string | null;
  } | null;
}

// 1. Obtener datos completos del perfil del usuario autenticado
export async function getPerfilUsuario(): Promise<{
  success: boolean;
  data?: PerfilUsuarioData;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado." };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        cedula: true,
        telefono: true,
        direccion: true,
        rol: true,
        activo: true,
        mustChangePassword: true,
        createdAt: true,
        inquilino: {
          select: {
            id: true,
            tipoPersona: true,
            documentoIdentidad: true,
            telefono: true,
            email: true,
          },
        },
        empleado: {
          select: {
            id: true,
            cargo: true,
            cargoPersonalizado: true,
            cedula: true,
            telefono: true,
            fechaIngreso: true,
            propiedad: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return { success: false, error: "Usuario no encontrado." };
    }

    const data: PerfilUsuarioData = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      cedula: usuario.cedula,
      telefono: usuario.telefono,
      direccion: usuario.direccion,
      rol: usuario.rol as "ADMIN" | "EMPLEADO" | "INQUILINO",
      activo: usuario.activo,
      mustChangePassword: usuario.mustChangePassword,
      createdAt: usuario.createdAt,
      inquilino: usuario.inquilino,
      empleado: usuario.empleado
        ? {
            id: usuario.empleado.id,
            cargo: usuario.empleado.cargo,
            cargoPersonalizado: usuario.empleado.cargoPersonalizado,
            cedula: usuario.empleado.cedula,
            telefono: usuario.empleado.telefono,
            fechaIngreso: usuario.empleado.fechaIngreso,
            propiedadNombre: usuario.empleado.propiedad?.nombre || null,
          }
        : null,
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error al obtener perfil de usuario:", error);
    return { success: false, error: "Error al cargar la información del perfil." };
  }
}

// 2. Cambiar contraseña desde el perfil
export async function actualizarPasswordAction(input: {
  passwordActual?: string;
  passwordNueva: string;
  passwordConfirmacion: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Sesión no válida o expirada." };
    }

    const parseResult = cambiarPasswordPerfilSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error.issues[0]?.message || "Datos inválidos.",
      };
    }

    const { passwordActual, passwordNueva } = parseResult.data;

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true, mustChangePassword: true },
    });

    if (!usuario) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Si ya no tiene la clave por defecto, exigir verificar la contraseña actual
    if (!usuario.mustChangePassword) {
      if (!passwordActual) {
        return { success: false, message: "Debes ingresar tu contraseña actual." };
      }

      const esValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
      if (!esValida) {
        return { success: false, message: "La contraseña actual no es correcta." };
      }
    }

    // Hashear y actualizar contraseña
    const nuevoHash = await bcrypt.hash(passwordNueva, 10);

    await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        passwordHash: nuevoHash,
        mustChangePassword: false,
      },
    });

    revalidatePath("/admin/perfil");
    revalidatePath("/empleado/perfil");
    revalidatePath("/inquilino/perfil");
    revalidatePath("/admin/inquilinos");
    revalidatePath("/inquilino/dashboard");

    return {
      success: true,
      message: "¡Contraseña actualizada exitosamente!",
    };
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    return { success: false, message: "Error interno al actualizar la contraseña." };
  }
}

