import { getPortalEmpleadoData } from "@/lib/actions/personal-portal";
import { EmpleadoDashboardClient } from "./EmpleadoDashboardClient";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmpleadoDashboardPage() {
  const res = await getPortalEmpleadoData();

  if (!res.success || !res.data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-white border border-rose-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Ficha de empleado no vinculada
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          {res.error || "Tu cuenta no tiene una ficha de empleado asignada en el sistema. Comunícate con la administración para vincularla."}
        </p>
        <Link
          href="/admin/personal"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all"
        >
          Ir al Panel de Personal
        </Link>
      </div>
    );
  }

  return <EmpleadoDashboardClient initialData={res.data} />;
}
