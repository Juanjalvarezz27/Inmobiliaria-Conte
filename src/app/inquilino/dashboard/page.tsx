import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InquilinoDashboardClient } from "./InquilinoDashboardClient";

export const dynamic = "force-dynamic";

export default async function InquilinoDashboardPage() {
  const session = await auth();

  // Consultar estado en tiempo real en la base de datos para no depender del JWT estático de la sesión
  let mustChangePassword = false;
  if (session?.user?.id) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    mustChangePassword = usuario?.mustChangePassword ?? false;
  }

  // Fecha actual formateada en español institucional
  const fechaHoy = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <InquilinoDashboardClient
      nombre={session?.user?.nombre || "Inquilino"}
      email={session?.user?.email || ""}
      mustChangePasswordInitial={mustChangePassword}
      fechaFormateada={fechaFormateada}
    />
  );
}
