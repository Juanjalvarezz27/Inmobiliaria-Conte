import { getInquilinos } from "@/lib/actions/inquilinos";
import { InquilinosClient } from "./InquilinosClient";
import type { InquilinoConContratos } from "./types";

export const metadata = {
  title: "Directorio de Inquilinos | Inmobiliaria Conté",
  description: "Directorio oficial de arrendatarios y clientes de Inmobiliaria Conté",
};

export default async function InquilinosPage() {
  const inquilinosRes = await getInquilinos();

  const inquilinos = (inquilinosRes.success && inquilinosRes.data
    ? inquilinosRes.data
    : []) as unknown as InquilinoConContratos[];

  // Cálculo de estadísticas en memoria: 0 queries adicionales a Neon
  const total = inquilinos.length;
  const activos = inquilinos.filter((i) => i.activo).length;
  // Cada contrato en inquilinos ya viene filtrado por estado ACTIVO
  const conContratosActivos = inquilinos.filter(
    (i) => (i.contratos && i.contratos.length > 0) || (i._count?.contratos ?? 0) > 0
  ).length;
  const sinContrato = total - conContratosActivos;

  const stats = {
    total,
    activos,
    conContratosActivos,
    sinContrato,
  };

  return <InquilinosClient inquilinos={inquilinos} stats={stats} />;
}
