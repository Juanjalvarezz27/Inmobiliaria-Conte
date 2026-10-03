import { getPropiedades } from "@/lib/actions/propiedades";
import { getUnidades, getEstadisticasPropiedades } from "@/lib/actions/unidades";
import { PropiedadesClient } from "./PropiedadesClient";

export const metadata = {
  title: "Propiedades y Espacios | Inmobiliaria Conté",
  description: "Gestión integral del parque inmobiliario: complejos, edificios, unidades y locales.",
};

export default async function PropiedadesPage() {
  // Carga paralela y optimizada de datos
  const [propiedades, unidades, stats] = await Promise.all([
    getPropiedades(),
    getUnidades(),
    getEstadisticasPropiedades(),
  ]);

  return (
    <PropiedadesClient
      propiedades={propiedades}
      unidades={unidades}
      stats={stats}
    />
  );
}
