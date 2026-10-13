import {
  getFinanzasData,
  getPropiedadesFinanzasOpciones,
} from "@/lib/actions/finanzas";
import { FinanzasClient } from "./FinanzasClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finanzas & Balance General | Inmobiliaria Conté",
  description: "Supervisión de tesorería, flujo de caja, gastos operativos y cierres contables mensuales",
};

interface PageProps {
  searchParams?: Promise<{
    mes?: string;
    ano?: string;
    propiedadId?: string;
  }>;
}

export default async function FinanzasPage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const hoy = new Date();
  const mesActual = searchParams?.mes ? parseInt(searchParams.mes, 10) : hoy.getMonth() + 1;
  const anoActual = searchParams?.ano ? parseInt(searchParams.ano, 10) : hoy.getFullYear();
  const propiedadIdInicial = searchParams?.propiedadId || "TODAS";

  // Carga concurrente optimizada
  const [finanzasData, propiedades] = await Promise.all([
    getFinanzasData({
      mes: mesActual,
      ano: anoActual,
      propiedadId: propiedadIdInicial,
      pagina: 1,
    }),
    getPropiedadesFinanzasOpciones(),
  ]);

  return (
    <FinanzasClient
      estadisticasIniciales={finanzasData.estadisticas}
      mesInicial={mesActual}
      anoInicial={anoActual}
      propiedades={propiedades}
    />
  );
}
