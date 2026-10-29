import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InquilinoDashboardClient } from "./InquilinoDashboardClient";
import { getInquilinoDashboardData } from "@/lib/actions/inquilinoPortal";

export const dynamic = "force-dynamic";

export default async function InquilinoDashboardPage() {
  const session = await auth();

  // Consultar estado de clave provisional en la base de datos
  let mustChangePassword = false;
  if (session?.user?.id) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    mustChangePassword = usuario?.mustChangePassword ?? false;
  }

  // Obtener resumen financiero consolidado y locales arrendados
  const { resumen, locales } = await getInquilinoDashboardData();

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
      nombre={resumen.inquilinoNombre || session?.user?.nombre || "Inquilino"}
      email={session?.user?.email || ""}
      mustChangePasswordInitial={mustChangePassword}
      fechaFormateada={fechaFormateada}
      resumen={resumen}
      locales={locales}
    />
  );
}
