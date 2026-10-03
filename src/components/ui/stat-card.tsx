import React from "react";
import { type LucideIcon } from "lucide-react";

export type StatCardColor = "navy" | "indigo" | "emerald" | "amber" | "blue" | "rose";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: StatCardColor;
  subtitle?: string;
  progressPercent?: number;
  className?: string;
}

const COLOR_MAP: Record<
  StatCardColor,
  {
    glowBg: string;
    glowBorder: string;
    glowGrad: string;
    iconBox: string;
    iconText: string;
    progressBar: string;
  }
> = {
  navy: {
    glowBg: "bg-[#1C2539]/12",
    glowBorder: "border-[#1C2539]/15",
    glowGrad: "from-[#1C2539]/25",
    iconBox: "bg-[#1C2539]/10 border border-[#1C2539]/10",
    iconText: "text-[#1C2539]",
    progressBar: "bg-[#1C2539]",
  },
  indigo: {
    glowBg: "bg-indigo-500/18",
    glowBorder: "border-indigo-400/25",
    glowGrad: "from-indigo-600/25",
    iconBox: "bg-indigo-50 border border-indigo-100",
    iconText: "text-indigo-700",
    progressBar: "bg-indigo-600",
  },
  emerald: {
    glowBg: "bg-emerald-500/18",
    glowBorder: "border-emerald-400/25",
    glowGrad: "from-[#175E38]/30",
    iconBox: "bg-emerald-50 border border-emerald-100",
    iconText: "text-[#175E38]",
    progressBar: "bg-[#175E38]",
  },
  amber: {
    glowBg: "bg-amber-500/20",
    glowBorder: "border-amber-400/25",
    glowGrad: "from-amber-600/25",
    iconBox: "bg-amber-50 border border-amber-100",
    iconText: "text-amber-600",
    progressBar: "bg-amber-500",
  },
  blue: {
    glowBg: "bg-sky-500/18",
    glowBorder: "border-sky-400/25",
    glowGrad: "from-sky-600/25",
    iconBox: "bg-sky-50 border border-sky-100",
    iconText: "text-sky-700",
    progressBar: "bg-sky-600",
  },
  rose: {
    glowBg: "bg-rose-500/18",
    glowBorder: "border-rose-400/25",
    glowGrad: "from-rose-600/25",
    iconBox: "bg-rose-50 border border-rose-100",
    iconText: "text-rose-600",
    progressBar: "bg-rose-500",
  },
};

// Tarjeta ejecutiva con efecto sol en esquina y relieve 3D inferior
export function StatCard({
  title,
  value,
  icon: Icon,
  color = "navy",
  subtitle,
  progressPercent,
  className = "",
}: StatCardProps) {
  const theme = COLOR_MAP[color] ?? COLOR_MAP.navy;

  return (
    <div
      className={`group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl p-3.5 sm:p-5 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 ${className}`}
    >
      {/* Sol decorativo en esquina superior izquierda */}
      <div className="absolute -top-7 -left-7 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full blur-lg ${theme.glowBg}`} />
        <div className={`absolute inset-2 rounded-full bg-white/5 border ${theme.glowBorder}`} />
        <div
          className={`absolute inset-5 rounded-full bg-gradient-to-br to-transparent transition-transform duration-500 group-hover:scale-125 ${theme.glowGrad}`}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
        <span className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider truncate mr-1">
          {title}
        </span>
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl flex items-center justify-center shadow-xs ${theme.iconBox} ${theme.iconText}`}
        >
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-slate-500 font-medium truncate">
            {subtitle}
          </span>
        )}
      </div>

      {/* Barra de progreso opcional */}
      {typeof progressPercent === "number" && (
        <div className="mt-2.5 sm:mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden relative z-10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
