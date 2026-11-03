import { getTicketsEmpleado } from "@/lib/actions/mantenimiento";
import { EmpleadoMantenimientoClient } from "./EmpleadoMantenimientoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Averías y Reparaciones Asignadas | Inmobiliaria Conté",
  description: "Portal técnico para trabajadores y especialistas de mantenimiento.",
};

export default async function EmpleadoMantenimientoPage() {
  const data = await getTicketsEmpleado();

  return (
    <EmpleadoMantenimientoClient
      ticketsIniciales={data.tickets}
      empleado={data.empleado}
    />
  );
}
