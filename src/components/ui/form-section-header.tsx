import React from "react";

export interface FormSectionHeaderProps {
  step?: number | string;
  title: string;
  badge?: React.ReactNode;
  showDivider?: boolean;
  className?: string;
}

// Encabezado de sección de formulario con insignia numerada y divisor degradado
export function FormSectionHeader({
  step,
  title,
  badge,
  showDivider = true,
  className = "",
}: FormSectionHeaderProps) {
  return (
    <div className={`space-y-3 pt-1 ${className}`}>
      {/* Divisor con desvanecimiento lateral */}
      {showDivider && (
        <div className="h-px w-full bg-gradient-to-r from-slate-200/40 via-slate-400 to-slate-200/40" />
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          {step !== undefined && (
            <div className="w-6 h-6 rounded-lg bg-[#175E38] text-white inline-flex items-center justify-center text-xs font-black shadow-xs shrink-0">
              {step}
            </div>
          )}
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            {title}
          </h4>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </div>
  );
}
