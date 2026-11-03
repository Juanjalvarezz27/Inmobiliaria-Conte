import { getTicketsInquilino } from "@/lib/actions/mantenimiento";
import { InquilinoMantenimientoClient } from "./InquilinoMantenimientoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reportar Problema o Avería | Inmobiliaria Conté",
  description: "Portal de gestión y reporte de fallas y averías técnicas para inquilinos.",
};

export default async function InquilinoMantenimientoPage() {
  const data = await getTicketsInquilino();

  return (
    <InquilinoMantenimientoClient
      ticketsIniciales={data.tickets}
      locales={data.locales}
      propiedades={data.propiedades}
      inquilinoNombre={data.inquilinoNombre}
    />
  );
}
