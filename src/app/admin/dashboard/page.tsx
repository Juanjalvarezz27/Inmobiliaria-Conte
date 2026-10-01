import { auth } from "@/auth";
import Link from "next/link";
import { Building2, CircleDollarSign, Wrench } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-[#1C2539] to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Building2 className="w-64 h-64 text-white stroke-[0.75]" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <span className="inline-block text-[11px] font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md mb-3">
            Panel de Control General
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            Bienvenido, {session?.user?.nombre || "Administrador"}
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Sistema de Gestión Integral Inmobiliaria Conté. Tienes acceso completo a la administración de inmuebles,
            cobranzas, contratos, facturación y operaciones.
          </p>
        </div>
      </div>

      {/* Acceso Rápido a Módulos Principales */}
      <div className="space-y-4">
        <h2 className="text-base font-bold font-heading text-slate-900">
          Módulos del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/propiedades"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                Propiedades & Centros Comerciales
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fase 4: Catálogo de inmuebles, locales y disponibilidad.
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-600 mt-4 flex items-center gap-1">
              Ver catálogo →
            </div>
          </Link>

          <Link
            href="/admin/cobranza"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                Panel de Cobranza
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fase 6: Control de pagos mensuales, estados y vencimientos.
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-600 mt-4 flex items-center gap-1">
              Gestionar cobranza →
            </div>
          </Link>

          <Link
            href="/admin/mantenimiento"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors">
                Tickets de Mantenimiento
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fase 9: Asignación a personal y seguimiento de incidentes.
              </p>
            </div>
            <div className="text-xs font-semibold text-amber-600 mt-4 flex items-center gap-1">
              Ver solicitudes →
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
