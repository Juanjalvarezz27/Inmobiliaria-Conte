import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export interface AuthGuardSuccess {
  ok: true;
  session: Session;
  user: Session["user"];
}

export interface AuthGuardFailure {
  ok: false;
  error: string;
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

// Verifica que el usuario tenga sesión activa, cuenta habilitada y rol ADMIN
export async function requireAdminSession(): Promise<AuthGuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autenticado. Por favor inicia sesión." };
  }
  if (session.user.rol !== "ADMIN") {
    return { ok: false, error: "No autorizado. Se requieren permisos de administrador." };
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { activo: true },
  });
  if (!usuario || !usuario.activo) {
    return { ok: false, error: "Tu cuenta ha sido desactivada o suspendida." };
  }
  return { ok: true, session, user: session.user };
}

// Lanza excepción si el usuario no tiene sesión o rol ADMIN
export async function assertAdminSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado. Por favor inicia sesión.");
  }
  if (session.user.rol !== "ADMIN") {
    throw new Error("No autorizado. Se requieren permisos de administrador.");
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { activo: true },
  });
  if (!usuario || !usuario.activo) {
    throw new Error("Tu cuenta ha sido desactivada o suspendida.");
  }
  return session;
}

// Verifica que el usuario tenga una sesión activa válida y cuenta habilitada
export async function requireActiveSession(): Promise<AuthGuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autenticado. Por favor inicia sesión." };
  }
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { activo: true },
  });
  if (!usuario || !usuario.activo) {
    return { ok: false, error: "Tu cuenta ha sido desactivada o suspendida." };
  }
  return { ok: true, session, user: session.user };
}
