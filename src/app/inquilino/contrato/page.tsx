import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInquilinoContratosData } from "@/lib/actions/inquilinoPortal";
import { InquilinoContratoClient } from "./InquilinoContratoClient";

export const dynamic = "force-dynamic";

export default async function InquilinoContratoPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/home/login");
  }

  // Permitir solo a INQUILINO y ADMIN
  if (session.user.rol !== "INQUILINO" && session.user.rol !== "ADMIN") {
    redirect("/empleado/dashboard?unauthorized=inquilino");
  }

  const { contratos, esAdminModoSupervision, inquilinoNombre, documentoIdentidad } =
    await getInquilinoContratosData();

  return (
    <InquilinoContratoClient
      contratos={contratos}
      esAdminModoSupervision={esAdminModoSupervision}
      inquilinoNombre={inquilinoNombre}
      documentoIdentidad={documentoIdentidad}
    />
  );
}
