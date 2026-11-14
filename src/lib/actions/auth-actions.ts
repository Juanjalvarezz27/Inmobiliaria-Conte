"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

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
    // Propagar errores no capturados
    throw error;
  }

  // Redirección relativa nativa de Next.js para preservar el host actual (IP móvil, local o dominio)
  redirect("/home/dashboard");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/home/login");
}
