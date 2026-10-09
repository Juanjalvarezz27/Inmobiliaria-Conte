import { getPagosCobranza, getPropiedadesCobranzaOpciones } from "@/lib/actions/cobranza";
import { CobranzaClient } from "./CobranzaClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Control de Cobranzas y Mensualidades | Inmobiliaria Conté",
  description: "Supervisión de recaudación mensual, pagos y cuotas en mora",
};

interface PageProps {
  searchParams?: Promise<{
    mes?: string;
    ano?: string;
  }>;
}

export default async function CobranzaPage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const hoy = new Date();
  const mesActual = searchParams?.mes ? parseInt(searchParams.mes, 10) : hoy.getMonth() + 1;
  const anoActual = searchParams?.ano ? parseInt(searchParams.ano, 10) : hoy.getFullYear();

  // Obtener cobros iniciales y lista de propiedades para filtros
  const [cobranzaData, propiedades] = await Promise.all([
    getPagosCobranza({ mes: mesActual, ano: anoActual, pagina: 1 }),
    getPropiedadesCobranzaOpciones(),
  ]);

  return (
    <CobranzaClient
      pagosIniciales={cobranzaData.pagos}
      estadisticasIniciales={cobranzaData.estadisticas}
      totalRegistrosIniciales={cobranzaData.totalRegistros}
      totalPaginasIniciales={cobranzaData.totalPaginas}
      paginaActualInicial={cobranzaData.paginaActual}
      mesInicial={mesActual}
      anoInicial={anoActual}
      propiedades={propiedades}
    />
  );
}
