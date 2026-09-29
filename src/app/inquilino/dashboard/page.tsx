import { auth } from "@/auth";
import Link from "next/link";

export default async function InquilinoDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Bienvenida Inquilino */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <span className="inline-block text-[11px] font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-md mb-3">
          Portal del Inquilino
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
          Bienvenido, {session?.user?.nombre || "Inquilino"}
        </h1>
        <p className="text-sm text-slate-200 mt-2 max-w-2xl leading-relaxed">
          Consulta el estado de tu contrato, mantente al día con tus pagos mensuales y solicita asistencia técnica para tu local o propiedad.
        </p>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/inquilino/pagos"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
            Estado de Cuenta & Recibos
          </h2>
          <p className="text-xs text-slate-500 mt-1">Descarga tus recibos de pago y verifica tu saldo actual.</p>
        </Link>

        <Link
          href="/inquilino/contrato"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
            Mi Contrato Vigente
          </h2>
          <p className="text-xs text-slate-500 mt-1">Revisa las cláusulas, montos de canon y fechas de vigencia.</p>
        </Link>

        <Link
          href="/inquilino/mantenimiento"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
            Reportar Falla o Avería
          </h2>
          <p className="text-xs text-slate-500 mt-1">Genera un ticket para que el equipo de soporte te atienda.</p>
        </Link>
      </div>
    </div>
  );
}
