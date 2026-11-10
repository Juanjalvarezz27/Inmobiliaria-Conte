import { auth } from "@/auth";
import { InquilinoDashboardClient } from "./InquilinoDashboardClient";
import { getInquilinoDashboardData } from "@/lib/actions/inquilinoPortal";

export const dynamic = "force-dynamic";

export default async function InquilinoDashboardPage() {
  const session = await auth();

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
      fechaFormateada={fechaFormateada}
      resumen={resumen}
      locales={locales}
    />
  );
}
