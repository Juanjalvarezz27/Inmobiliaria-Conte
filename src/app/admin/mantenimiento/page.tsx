import { getTicketsAdmin } from "@/lib/actions/mantenimiento";
import { prisma } from "@/lib/prisma";
import { AdminMantenimientoClient } from "./AdminMantenimientoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Averías y Mantenimiento | Inmobiliaria Conté",
  description: "Bandeja ejecutiva de mantenimiento técnico, asignación y costos.",
};

export default async function AdminMantenimientoPage() {
  const [data, propiedadesCompletas] = await Promise.all([
    getTicketsAdmin({}),
    prisma.propiedad.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        unidades: {
          orderBy: { codigo: "asc" },
          select: {
            id: true,
            codigo: true,
            tipo: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminMantenimientoClient
      ticketsIniciales={data.tickets}
      estadisticas={data.estadisticas}
      tecnicos={data.tecnicos}
      propiedades={propiedadesCompletas}
    />
  );
}
