import { auth } from "@/auth";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-[#1C2539] to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <svg className="w-64 h-64 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
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
