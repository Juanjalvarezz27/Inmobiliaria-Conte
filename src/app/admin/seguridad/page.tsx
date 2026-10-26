import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSeguridadDashboardDataAction } from "@/lib/actions/seguridad";
import { SeguridadClient } from "./SeguridadClient";

export const metadata = {
  title: "Bitácora de Seguridad | Administración Inmobiliaria Conté",
  description: "Supervisión de novedades, rondas de inspección y registro fotográfico en inmuebles.",
};

export default async function AdminSeguridadPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/home/login");
  }

  if (session.user.rol !== "ADMIN") {
    redirect("/empleado/dashboard?unauthorized=admin");
  }

  try {
    const data = await getSeguridadDashboardDataAction();
    return <SeguridadClient initialData={data} />;
  } catch (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-rose-600 font-bold mb-2">Error al cargar la bitácora de seguridad</p>
        <p className="text-xs text-slate-500">
          {error instanceof Error ? error.message : "Error inesperado"}
        </p>
      </div>
    );
  }
}
