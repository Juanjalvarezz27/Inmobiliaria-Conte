import { auth } from "@/auth";
import Link from "next/link";

export default async function EmpleadoDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <span className="inline-block text-[11px] font-bold tracking-widest text-sky-400 uppercase bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md mb-3">
          Portal de Operaciones
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
          Hola, {session?.user?.nombre || "Empleado"}
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Bienvenido a tu panel de campo. Aquí puedes registrar tu asistencia diaria, consultar las tareas asignadas
          y gestionar los reportes de mantenimiento.
        </p>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/empleado/asistencia"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
            Marcaje de Asistencia
          </h2>
          <p className="text-xs text-slate-500 mt-1">Registra tu hora de entrada y salida con un solo click.</p>
        </Link>

        <Link
          href="/empleado/tareas"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
            Mis Tareas
          </h2>
          <p className="text-xs text-slate-500 mt-1">Revisa tus actividades asignadas y márcalas como completadas.</p>
        </Link>

        <Link
          href="/empleado/mantenimiento"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
            Tickets de Mantenimiento
          </h2>
          <p className="text-xs text-slate-500 mt-1">Inspecciona y soluciona fallas técnicas reportadas.</p>
        </Link>
      </div>
    </div>
  );
}
