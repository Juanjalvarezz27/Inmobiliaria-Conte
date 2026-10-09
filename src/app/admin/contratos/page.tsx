import {
  getContratos,
  getUnidadesDisponiblesParaContrato,
  getInquilinosParaSelector,
} from "@/lib/actions/contratos";
import { getPropiedadesOpciones } from "@/lib/actions/propiedades";
import { EstadoContrato } from "@prisma/client";
import { ContratosClient } from "./ContratosClient";
import type {
  ContratoConRelaciones,
  UnidadDisponible,
  InquilinoSelector,
} from "./types";

export const metadata = {
  title: "Gestión de Contratos | Inmobiliaria Conté",
  description: "Control de contratos de arrendamiento, vigencias y mensualidades",
};

interface ContratosPageProps {
  searchParams: Promise<{
    inquilinoId?: string;
    unidadId?: string;
    arrendarUnidadId?: string;
    nuevo?: string;
    search?: string;
  }>;
}

export default async function ContratosPage({ searchParams }: ContratosPageProps) {
  const resolvedSearchParams = await searchParams;
  const inquilinoIdPreseleccionado = resolvedSearchParams?.inquilinoId;
  const unidadIdPreseleccionada =
    resolvedSearchParams?.arrendarUnidadId || resolvedSearchParams?.unidadId;
  const abrirCrear =
    resolvedSearchParams?.nuevo === "true" ||
    !!unidadIdPreseleccionada ||
    !!inquilinoIdPreseleccionado;
  const initialSearch = resolvedSearchParams?.search;

  // Carga concurrente optimizada: selectores ligeros y sin queries redundantes
  const [contratosRes, unidadesRes, inquilinosRes, propiedades] = await Promise.all([
    getContratos(),
    getUnidadesDisponiblesParaContrato(),
    getInquilinosParaSelector(),
    getPropiedadesOpciones(),
  ]);

  const contratos = (contratosRes.success && contratosRes.data
    ? contratosRes.data
    : []) as unknown as ContratoConRelaciones[];

  // Cálculo de estadísticas en memoria: 0 queries a la base de datos
  const ahora = new Date();
  const en30Dias = new Date();
  en30Dias.setDate(en30Dias.getDate() + 30);

  const stats = {
    total: contratos.length,
    activos: contratos.filter((c) => c.estado === EstadoContrato.ACTIVO).length,
    porVencer: contratos.filter((c) => {
      if (c.estado !== EstadoContrato.ACTIVO) return false;
      const fin = new Date(c.fechaFin);
      return fin >= ahora && fin <= en30Dias;
    }).length,
    finalizados: contratos.filter((c) => c.estado === EstadoContrato.FINALIZADO).length,
  };

  const unidadesDisponibles = (unidadesRes.success && unidadesRes.data
    ? unidadesRes.data
    : []) as unknown as UnidadDisponible[];

  const inquilinos = (inquilinosRes.success && inquilinosRes.data
    ? inquilinosRes.data
    : []) as unknown as InquilinoSelector[];

  return (
    <ContratosClient
      contratos={contratos}
      stats={stats}
      unidadesDisponibles={unidadesDisponibles}
      inquilinos={inquilinos}
      propiedades={propiedades}
      inquilinoIdPreseleccionado={inquilinoIdPreseleccionado}
      unidadIdPreseleccionada={unidadIdPreseleccionada}
      abrirCrear={abrirCrear}
      initialSearch={initialSearch}
    />
  );
}
