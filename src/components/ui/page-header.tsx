import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  icon,
  actions,
  backHref,
  backLabel = "Volver",
  breadcrumbs,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`space-y-4 border-b border-slate-200/90 pb-5 mb-6 ${className}`}>
      {/* Navegación superior: Breadcrumbs o botón Volver */}
      {(breadcrumbs?.length || backHref) && (
        <div className="flex items-center justify-between gap-3 text-xs">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Ruta de navegación" className="flex items-center space-x-1.5 overflow-x-auto text-slate-500 py-0.5">
              <ol className="flex items-center space-x-1.5 flex-nowrap">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <li key={idx} className="flex items-center space-x-1.5 whitespace-nowrap">
                      {idx > 0 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="hover:text-slate-900 transition-colors font-medium text-slate-600 hover:underline"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className={isLast ? "font-semibold text-slate-900" : "text-slate-600"}>
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : <div />}

          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium text-xs bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{backLabel}</span>
            </Link>
          )}
        </div>
      )}

      {/* Fila principal: Título con ícono y badges + Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Lado izquierdo: Ícono + Título + Descripción */}
        <div className={`flex ${description ? "items-start" : "items-center"} gap-3.5 min-w-0`}>
          {icon && (
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#1C2539] text-white flex items-center justify-center shadow-xs shrink-0 ${description ? "mt-0.5" : ""}`}>
              {icon}
            </div>
          )}

          <div className={`${description ? "space-y-1" : ""} min-w-0 flex-1`}>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight leading-tight truncate">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {description && (
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Lado derecho: Slot de Botones de Acción */}
        {actions && (
          <div className="flex items-center justify-center sm:justify-end gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
