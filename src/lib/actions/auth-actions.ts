"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

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
    // Redirige al dashboard en caso de éxito
    await signIn("credentials", {
      email: String(email).trim().toLowerCase(),
      password: String(password),
      redirectTo: "/home/dashboard",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciales inválidas. Verifica tu correo y contraseña." };
        default:
          return { error: "Error en el servidor de autenticación. Intenta nuevamente." };
      }
    }
    // Re-lanzar error para permitir la redirección nativa de Next.js
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/home/login" });
}
