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
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string" || !emailRaw.trim() || !passwordRaw) {
    return { error: "Por favor, completa todos los campos requeridos." };
  }

  const email = emailRaw.trim().toLowerCase();

  try {
    // Autenticar credenciales y asentar cookies de sesión de forma segura
    await signIn("credentials", {
      email,
      password: passwordRaw,
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
  let rolUsuario: string | undefined;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { rol: true },
    });
    rolUsuario = usuario?.rol;
  } catch (err) {
    console.error("Error consultando rol tras login:", err);
  }

  const destino =
    rolUsuario === "ADMIN"
      ? "/admin/dashboard"
      : rolUsuario === "EMPLEADO"
      ? "/empleado/dashboard"
      : rolUsuario === "INQUILINO"
      ? "/inquilino/dashboard"
      : "/home/dashboard";

  redirect(destino);
}

export async function logoutAction() {
  try {
    await signOut({ redirect: false });
  } catch (err) {
    console.error("Error en signOut:", err);
  }
  redirect("/home/login");
}
