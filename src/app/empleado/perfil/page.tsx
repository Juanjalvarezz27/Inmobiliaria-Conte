import { getPerfilUsuario } from "@/lib/actions/perfil";
import { PerfilView } from "@/components/perfil/PerfilView";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmpleadoPerfilPage() {
  const res = await getPerfilUsuario();
  if (!res.success || !res.data) {
    redirect("/empleado/dashboard");
  }

  return <PerfilView usuario={res.data} />;
}

