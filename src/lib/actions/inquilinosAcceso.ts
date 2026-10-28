"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Esquema de validación para crear acceso digital (clave por defecto 123456)
const crearAccesoSchema = z.object({
  inquilinoId: z.string().min(1, "El ID de inquilino es obligatorio"),
  email: z.string().email("El correo electrónico no tiene un formato válido").trim().toLowerCase(),
  passwordTemporal: z.string().default("123456"),
});

// Esquema de validación para resetear clave (por defecto 123456)
const restablecerClaveSchema = z.object({
  inquilinoId: z.string().min(1, "El ID de inquilino es obligatorio"),
  passwordTemporal: z.string().default("123456"),
});

// Esquema de cambio de contraseña en primer acceso
const cambiarPasswordSchema = z
  .object({
    passwordNueva: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
    passwordConfirmacion: z.string().min(6, "Debes confirmar tu nueva contraseña"),
  })
  .refine((data) => data.passwordNueva === data.passwordConfirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmacion"],
  });

// Tipo de respuesta estándar para Server Actions
export interface AccesoResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

// 1. Crear acceso digital para un inquilino
export async function crearAccesoInquilino(input: z.infer<typeof crearAccesoSchema>): Promise<AccesoResponse> {
  const session = await auth();
  if (!session?.user || session.user.rol !== "ADMIN") {
    return { success: false, message: "No autorizado. Solo administradores pueden gestionar credenciales." };
  }

  const parseResult = crearAccesoSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, message: parseResult.error.issues[0]?.message || "Datos inválidos." };
  }

  const { inquilinoId, email, passwordTemporal } = parseResult.data;

  try {
    const inquilino = await prisma.inquilino.findUnique({
      where: { id: inquilinoId },
      include: { usuario: true },
    });

    if (!inquilino) {
      return { success: false, message: "Inquilino no encontrado." };
    }

    if (inquilino.usuario) {
      return { success: false, message: "Este inquilino ya cuenta con un usuario digital activo." };
    }

    // Verificar si el correo ya existe en otro usuario
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, rol: true, nombre: true },
    });

    if (usuarioExistente) {
      return {
        success: false,
        message: `El correo "${email}" ya está registrado en el sistema como ${usuarioExistente.rol} (${usuarioExistente.nombre}). Por favor ingresa un correo diferente.`,
      };
    }

    const passwordFinal = passwordTemporal || "123456";
    const passwordHash = await bcrypt.hash(passwordFinal, 10);

    // Creación atómica del usuario y vinculación al inquilino
    await prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuario.create({
        data: {
          email,
          passwordHash,
          nombre: inquilino.nombre,
          apellido: inquilino.apellido,
          cedula: inquilino.documentoIdentidad,
          telefono: inquilino.telefono,
          direccion: inquilino.direccion,
          rol: "INQUILINO",
          activo: true,
          mustChangePassword: true,
        },
      });

      await tx.inquilino.update({
        where: { id: inquilinoId },
        data: {
          usuarioId: nuevoUsuario.id,
          email, // Sincronizar correo oficial en ficha de inquilino
        },
      });
    });

    revalidatePath("/admin/inquilinos");
    return {
      success: true,
      message: "Acceso digital habilitado correctamente para el inquilino.",
    };
  } catch (error) {
    console.error("Error al crear acceso digital de inquilino:", error);
    return {
      success: false,
      message: "Error interno al crear el acceso digital. Intenta nuevamente.",
    };
  }
}

// 2. Restablecer clave temporal de inquilino
export async function restablecerClaveInquilino(input: z.infer<typeof restablecerClaveSchema>): Promise<AccesoResponse> {
  const session = await auth();
  if (!session?.user || session.user.rol !== "ADMIN") {
    return { success: false, message: "No autorizado." };
  }

  const parseResult = restablecerClaveSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, message: parseResult.error.issues[0]?.message || "Datos inválidos." };
  }

  const { inquilinoId, passwordTemporal } = parseResult.data;

  try {
    const inquilino = await prisma.inquilino.findUnique({
      where: { id: inquilinoId },
      include: { usuario: true },
    });

    if (!inquilino || !inquilino.usuarioId) {
      return { success: false, message: "El inquilino no tiene un usuario asignado para restablecer clave." };
    }

    const passwordFinal = passwordTemporal || "123456";
    const passwordHash = await bcrypt.hash(passwordFinal, 10);

    await prisma.usuario.update({
      where: { id: inquilino.usuarioId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    revalidatePath("/admin/inquilinos");
    return {
      success: true,
      message: "Contraseña temporal restablecida exitosamente.",
    };
  } catch (error) {
    console.error("Error al restablecer contraseña de inquilino:", error);
    return {
      success: false,
      message: "Error interno al restablecer la contraseña.",
    };
  }
}

// 3. Suspender o Reactivar acceso digital de inquilino
export async function toggleEstadoAccesoInquilino(
  inquilinoId: string,
  activo: boolean
): Promise<AccesoResponse> {
  const session = await auth();
  if (!session?.user || session.user.rol !== "ADMIN") {
    return { success: false, message: "No autorizado." };
  }

  try {
    const inquilino = await prisma.inquilino.findUnique({
      where: { id: inquilinoId },
    });

    if (!inquilino || !inquilino.usuarioId) {
      return { success: false, message: "El inquilino no tiene cuenta de acceso digital asignada." };
    }

    await prisma.usuario.update({
      where: { id: inquilino.usuarioId },
      data: { activo },
    });

    revalidatePath("/admin/inquilinos");
    return {
      success: true,
      message: activo ? "Acceso digital reactivado con éxito." : "Acceso digital suspendido.",
    };
  } catch (error) {
    console.error("Error al cambiar estado de acceso de inquilino:", error);
    return {
      success: false,
      message: "Error interno al actualizar el estado de la cuenta.",
    };
  }
}

// 4. Cambiar contraseña en primer acceso (invocado por el inquilino)
export async function cambiarPasswordPrimerAcceso(input: z.infer<typeof cambiarPasswordSchema>): Promise<AccesoResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Sesión no válida o expirada. Inicia sesión nuevamente." };
  }

  const parseResult = cambiarPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, message: parseResult.error.issues[0]?.message || "Datos inválidos." };
  }

  const { passwordNueva } = parseResult.data;

  try {
    const passwordHash = await bcrypt.hash(passwordNueva, 10);

    await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    revalidatePath("/inquilino");
    revalidatePath("/inquilino/dashboard");
    revalidatePath("/admin/inquilinos");

    return {
      success: true,
      message: "¡Contraseña actualizada exitosamente! Tu clave ya está activa.",
    };
  } catch (error) {
    console.error("Error al cambiar contraseña de primer acceso:", error);
    return {
      success: false,
      message: "Error al actualizar la contraseña. Intenta nuevamente.",
    };
  }
}
