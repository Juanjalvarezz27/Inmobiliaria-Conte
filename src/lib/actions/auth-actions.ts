"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
  success?: boolean;
} | null;

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Por favor, completa todos los campos requeridos." };
  }

  try {
    // Autenticar credenciales y asentar cookies de sesión de forma segura
    await signIn("credentials", {
      email: String(email).trim().toLowerCase(),
      password: String(password),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciales inválidas. Verifica tu correo y contraseña." };
        default:
          return { error: "Error en el servidor de autenticación. Intenta nuevamente." };
      }
    }
    // Propagar errores nativos de Next.js (como NEXT_REDIRECT lanzado por redirect)
    throw error;
  }

  // Redirigir directamente al dashboard según el rol del usuario autenticado
  const usuario = await prisma.usuario.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    select: { rol: true },
  });

  const destino =
    usuario?.rol === "ADMIN"
      ? "/admin/dashboard"
      : usuario?.rol === "EMPLEADO"
      ? "/empleado/dashboard"
      : usuario?.rol === "INQUILINO"
      ? "/inquilino/dashboard"
      : "/home/dashboard";

  redirect(destino);
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/home/login");
}
