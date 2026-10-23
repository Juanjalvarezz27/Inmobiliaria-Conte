import {
  getPortalEmpleadoData,
  getHistorialAsistenciaEmpleadoAction,
} from "@/lib/actions/personal-portal";
import { EmpleadoAsistenciaClient } from "./EmpleadoAsistenciaClient";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmpleadoAsistenciaPage() {
  const [portalRes, historialRes] = await Promise.all([
    getPortalEmpleadoData(),
    getHistorialAsistenciaEmpleadoAction(),
  ]);

  if (!portalRes.success || !portalRes.data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-white border border-rose-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">
          No se pudo cargar la asistencia
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          {portalRes.error || "No se encontró ficha de empleado asociada a tu cuenta."}
        </p>
        <Link
          href="/empleado/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <EmpleadoAsistenciaClient
      initialAsistenciaHoy={portalRes.data.asistenciaHoy}
      initialHistorial={historialRes.data || []}
      empleadoNombre={portalRes.data.empleado.nombre}
      propiedadNombre={portalRes.data.empleado.propiedadNombre}
    />
  );
}
