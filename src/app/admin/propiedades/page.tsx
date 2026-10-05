import { getPropiedades } from "@/lib/actions/propiedades";
import { getUnidades } from "@/lib/actions/unidades";
import { EstadoUnidad } from "@prisma/client";
import { PropiedadesClient } from "./PropiedadesClient";

export const metadata = {
  title: "Propiedades y Espacios | Inmobiliaria Conté",
  description: "Gestión integral del parque inmobiliario: complejos, edificios, unidades y locales.",
};

export default async function PropiedadesPage() {
  // Carga paralela y optimizada de datos (solo 2 consultas indispensables a BD)
  const [propiedades, unidades] = await Promise.all([
    getPropiedades(),
    getUnidades(),
  ]);

  // Cálculo de métricas en memoria: 0 llamadas de red extra a la base de datos
  const totalPropiedades = propiedades.length;
  const totalUnidades = unidades.length;
  const disponibles = unidades.filter((u) => u.estado === EstadoUnidad.DISPONIBLE).length;
  const ocupadas = unidades.filter((u) => u.estado === EstadoUnidad.OCUPADO).length;
  const tasaOcupacion = totalUnidades > 0 ? Math.round((ocupadas / totalUnidades) * 100) : 0;

  const stats = {
    totalPropiedades,
    totalUnidades,
    disponibles,
    ocupadas,
    tasaOcupacion,
  };

  return (
    <PropiedadesClient
      propiedades={propiedades}
      unidades={unidades}
      stats={stats}
    />
  );
}
