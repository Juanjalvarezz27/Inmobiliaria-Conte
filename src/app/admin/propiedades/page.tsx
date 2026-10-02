import { getCentrosComerciales } from "@/lib/actions/centros-comerciales";
import { getLocales, getEstadisticasLocales } from "@/lib/actions/locales";
import { PropiedadesClient } from "./PropiedadesClient";

export const metadata = {
  title: "Propiedades | Inmobiliaria Conté",
  description: "Gestiona los centros comerciales y locales de Inmobiliaria Conté.",
};

export default async function PropiedadesPage() {
  // Carga paralela de todos los datos necesarios
  const [centros, locales, stats] = await Promise.all([
    getCentrosComerciales(),
    getLocales(),
    getEstadisticasLocales(),
  ]);

  return (
    <PropiedadesClient
      centros={centros}
      locales={locales}
      stats={stats}
    />
  );
}
