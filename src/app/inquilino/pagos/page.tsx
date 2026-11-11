import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInquilinoPagosDataAction } from "@/lib/actions/inquilinoPortal";
import { InquilinoPagosClient } from "./InquilinoPagosClient";

export const dynamic = "force-dynamic";

export default async function InquilinoPagosPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/home/login");
  }

  // Permitir solo a INQUILINO y ADMIN en supervisión
  if (session.user.rol !== "INQUILINO" && session.user.rol !== "ADMIN") {
    redirect("/empleado/dashboard?unauthorized=inquilino");
  }

  const { pagos, resumen, esAdminModoSupervision, inquilinoNombre, tasaBcvActual } =
    await getInquilinoPagosDataAction();

  return (
    <InquilinoPagosClient
      initialPagos={pagos}
      resumen={resumen}
      esAdminModoSupervision={esAdminModoSupervision}
      inquilinoNombre={inquilinoNombre}
      tasaBcvActual={tasaBcvActual}
    />
  );
}
