import { getCachedSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { getSeguridadDashboardDataAction } from "@/lib/actions/seguridad";
import { SeguridadClient } from "./SeguridadClient";

export const metadata = {
  title: "Bitácora de Seguridad | Administración Inmobiliaria Conté",
  description: "Supervisión de novedades, rondas de inspección y registro fotográfico en inmuebles.",
};

export default async function AdminSeguridadPage() {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/home/login");
  }

  if (session.user.rol !== "ADMIN") {
    redirect("/empleado/dashboard?unauthorized=admin");
  }

  let data = null;
  let errorMessage: string | null = null;

  try {
    data = await getSeguridadDashboardDataAction();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Error inesperado";
  }

  if (errorMessage || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-rose-600 font-bold mb-2">Error al cargar la bitácora de seguridad</p>
        <p className="text-xs text-slate-500">{errorMessage || "Error inesperado"}</p>
      </div>
    );
  }

  return <SeguridadClient initialData={data} />;
}
