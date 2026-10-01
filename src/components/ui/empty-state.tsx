import React from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Folder,
  Receipt,
  Users,
  Wrench,
  Calendar,
  Inbox,
} from "lucide-react";

export type EmptyStateIconType =
  | "search"
  | "building"
  | "folder"
  | "receipt"
  | "users"
  | "wrench"
  | "calendar"
  | "inbox";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyStateIconType | React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = "folder",
  action,
  secondaryAction,
  compact = false,
  className = "",
}: EmptyStateProps) {
  // Renderizador de íconos Lucide predefinidos para módulos inmobiliarios
  const renderPredefinedIcon = (type: EmptyStateIconType) => {
    const iconProps = { className: "w-6 h-6 sm:w-7 sm:h-7 stroke-[1.75]" };

    switch (type) {
      case "search":
        return <Search {...iconProps} />;
      case "building":
        return <Building2 {...iconProps} />;
      case "receipt":
        return <Receipt {...iconProps} />;
      case "users":
        return <Users {...iconProps} />;
      case "wrench":
        return <Wrench {...iconProps} />;
      case "calendar":
        return <Calendar {...iconProps} />;
      case "inbox":
        return <Inbox {...iconProps} />;
      case "folder":
      default:
        return <Folder {...iconProps} />;
    }
  };

  const getButtonClass = (variant: "primary" | "secondary" | "danger" = "primary") => {
    switch (variant) {
      case "danger":
        return "bg-[#CC1A22] hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500";
      case "secondary":
        return "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs focus:ring-slate-400";
      case "primary":
      default:
        return "bg-[#1C2539] hover:bg-slate-800 text-white shadow-xs focus:ring-slate-900";
    }
  };

  const renderActionButton = (act: EmptyStateAction) => {
    const btnClasses = `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-1 ${getButtonClass(
      act.variant
    )}`;

    if (act.href) {
      return (
        <Link href={act.href} className={btnClasses}>
          {act.icon && <span className="shrink-0">{act.icon}</span>}
          <span>{act.label}</span>
        </Link>
      );
    }

    return (
      <button type="button" onClick={act.onClick} className={btnClasses}>
        {act.icon && <span className="shrink-0">{act.icon}</span>}
        <span>{act.label}</span>
      </button>
    );
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 sm:p-10 ${
        compact ? "py-6 sm:py-8" : "py-10 sm:py-16"
      } ${className}`}
    >
      {/* Contenedor del ícono decorativo con Lucide */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 text-slate-500 ring-8 ring-slate-50 flex items-center justify-center mb-4 transition-transform duration-200">
        {typeof icon === "string" ? renderPredefinedIcon(icon as EmptyStateIconType) : icon}
      </div>

      {/* Título y descripción */}
      <h3 className="text-base sm:text-lg font-bold font-heading text-slate-800 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {/* Botones de acción principal y secundaria */}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action && renderActionButton(action)}
          {secondaryAction && renderActionButton(secondaryAction)}
        </div>
      )}
    </div>
  );
}
