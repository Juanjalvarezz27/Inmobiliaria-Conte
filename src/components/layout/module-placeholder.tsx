import Link from "next/link";
import { Rol } from "@prisma/client";

interface ModulePlaceholderProps {
  title: string;
  role: Rol;
  description: string;
  badge?: string;
  features: string[];
  iconType?: "building" | "money" | "wrench" | "users" | "doc" | "calendar" | "contract";
}

// Configuración global de simulación para desarrollo
// Cuando conectemos Neon en la Fase 4, este retraso se puede poner en 0 sin tocar ninguna página
const SIMULATED_LOAD_DELAY_MS = 100;

export async function ModulePlaceholder({
  title,
  role,
  description,
  badge = "Próximamente disponible",
  features,
  iconType = "building",
}: ModulePlaceholderProps) {
  // Retardo centralizado: permite apreciar el skeleton de forma global sin ensuciar las vistas individuales
  if (SIMULATED_LOAD_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LOAD_DELAY_MS));
  }

  const dashboardHref =
    role === "ADMIN"
      ? "/admin/dashboard"
      : role === "EMPLEADO"
      ? "/empleado/dashboard"
      : "/inquilino/dashboard";

  const renderIcon = () => {
    switch (iconType) {
      case "building":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        );
      case "money":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      case "wrench":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        );
      case "users":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        );
      case "doc":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        );
      case "calendar":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        );
      default:
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#1C2539] text-white flex items-center justify-center shadow-md flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {renderIcon()}
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
                {title}
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {badge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <Link
          href={dashboardHref}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5 w-fit self-start sm:self-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a mi panel
        </Link>
      </div>

      {/* Tarjeta de Contenido y Funcionalidades */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-sm font-bold font-heading text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ¿Qué podrás hacer en esta sección?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mensaje de estado amigable */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
          <span>
            Esta vista ya forma parte de la navegación oficial y se irá habilitando paso a paso según el plan de trabajo.
          </span>
        </div>
      </div>
    </div>
  );
}
