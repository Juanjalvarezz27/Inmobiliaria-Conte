import { getPerfilUsuario } from "@/lib/actions/perfil";
import { PerfilView } from "@/components/perfil/PerfilView";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPerfilPage() {
  const res = await getPerfilUsuario();
  if (!res.success || !res.data) {
    redirect("/admin/dashboard");
  }

  return <PerfilView usuario={res.data} />;
}

