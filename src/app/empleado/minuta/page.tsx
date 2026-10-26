import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGuardiaDiarioDataAction } from "@/lib/actions/seguridad";
import { MinutaGuardiaClient } from "./MinutaGuardiaClient";

export const metadata = {
  title: "Bitácora de Seguridad | Inmobiliaria Conté",
  description: "Bitácora operativa diaria de rondas y novedades de seguridad en inmuebles.",
};

export default async function MinutaGuardiaPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/home/login");
  }

  // Permitir acceso a personal con cargo SEGURIDAD y a ADMIN en modo supervisión
  const esPersonalSeguridad =
    session.user.cargo === "SEGURIDAD" || session.user.rol === "ADMIN";

  if (!esPersonalSeguridad) {
    redirect("/empleado/dashboard?unauthorized=seguridad");
  }

  try {
    const data = await getGuardiaDiarioDataAction();
    return <MinutaGuardiaClient initialData={data} />;
  } catch (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-rose-600 font-bold mb-2">Error al cargar la Bitácora de Seguridad</p>
        <p className="text-xs text-slate-500">
          {error instanceof Error ? error.message : "Error inesperado"}
        </p>
      </div>
    );
  }
}
