import { getInquilinos, getInquilinosStats } from "@/lib/actions/inquilinos";
import { InquilinosClient } from "./InquilinosClient";
import type { InquilinoConContratos } from "./types";

export const metadata = {
  title: "Directorio de Inquilinos | Inmobiliaria Conté",
  description: "Directorio oficial de arrendatarios y clientes de Inmobiliaria Conté",
};

export default async function InquilinosPage() {
  // Carga paralela: listado de inquilinos y conteos agregados nativos de BD
  const [inquilinosRes, statsRes] = await Promise.all([
    getInquilinos(),
    getInquilinosStats(),
  ]);

  const inquilinos = (inquilinosRes.success && inquilinosRes.data
    ? inquilinosRes.data
    : []) as unknown as InquilinoConContratos[];

  const stats = statsRes.success && statsRes.data
    ? statsRes.data
    : {
        total: inquilinos.length,
        activos: inquilinos.filter((i) => i.activo).length,
        archivados: inquilinos.filter((i) => !i.activo).length,
        conContratosActivos: inquilinos.filter(
          (i) => (i.contratos && i.contratos.length > 0) || (i._count?.contratos ?? 0) > 0
        ).length,
        sinContrato: 0,
      };

  return <InquilinosClient inquilinos={inquilinos} stats={stats} />;
}
