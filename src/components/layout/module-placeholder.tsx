import Link from "next/link";
import { Rol } from "@prisma/client";
import {
  Building2,
  CircleDollarSign,
  Wrench,
  Users,
  FileText,
  Calendar,
  ClipboardList,
  ArrowLeft,
  Check,
} from "lucide-react";
import { ModuleActionButtons } from "./module-action-buttons";

interface ModulePlaceholderProps {
  title: string;
  role: Rol;
  description: string;
  badge?: string;
  features: string[];
  iconType?: "building" | "money" | "wrench" | "users" | "doc" | "calendar" | "contract";
}

// Configuración global de simulación para desarrollo
const SIMULATED_LOAD_DELAY_MS = 100;

export async function ModulePlaceholder({
  title,
  role,
  description,
  badge = "Próximamente disponible",
  features,
  iconType = "building",
}: ModulePlaceholderProps) {
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
    const iconClass = "w-6 h-6 stroke-[1.75]";
    switch (iconType) {
      case "building":
        return <Building2 className={iconClass} />;
      case "money":
        return <CircleDollarSign className={iconClass} />;
      case "wrench":
        return <Wrench className={iconClass} />;
      case "users":
        return <Users className={iconClass} />;
      case "doc":
        return <FileText className={iconClass} />;
      case "calendar":
        return <Calendar className={iconClass} />;
      default:
        return <ClipboardList className={iconClass} />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#1C2539] text-white flex items-center justify-center shadow-md shrink-0">
            {renderIcon()}
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
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a mi panel</span>
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
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs sm:text-sm text-slate-700 leading-snug">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones interactivas con notificaciones claras */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <ModuleActionButtons title={title} />
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            <span>En desarrollo activo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
