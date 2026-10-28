import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Cambiar Contraseña | Inmobiliaria Conté",
  description: "Actualización de contraseña para acceso al portal de Inmobiliaria Conté.",
};

export default async function ChangePasswordPage() {
  const session = await auth();

  // Si no hay sesión, al login
  if (!session?.user) {
    redirect("/home/login");
  }

  const nombre = session.user.nombre || "Usuario";
  const email = session.user.email || "";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100">
      <ChangePasswordForm nombreUsuario={nombre} emailUsuario={email} />
    </main>
  );
}

