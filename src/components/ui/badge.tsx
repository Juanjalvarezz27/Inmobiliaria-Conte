import React from "react";
import { X } from "lucide-react";

// Tipos de variantes de estado del sistema inmobiliario
export type BadgeVariant =
  | "default"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "outline"
  | "PAGADO"
  | "PENDIENTE"
  | "VENCIDO"
  | "DISPONIBLE"
  | "OCUPADO"
  | "MANTENIMIENTO"
  | "RESERVADO"
  | "VIGENTE"
  | "CANCELADO"
  | "ABIERTO"
  | "EN_PROCESO"
  | "RESUELTO"
  | "ACTIVO"
  | "INACTIVO";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotPulse?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
  children: React.ReactNode;
}

// Mapeo exhaustivo de estilos según el estado o variante
const variantStyles: Record<
  BadgeVariant,
  {
    container: string;
    dot: string;
    pulseDot: string;
  }
> = {
  // Variantes Semánticas Generales
  default: {
    container: "bg-slate-100 text-slate-700 border-slate-200/80",
    dot: "bg-slate-500",
    pulseDot: "bg-slate-400",
  },
  neutral: {
    container: "bg-slate-100 text-slate-600 border-slate-200/80",
    dot: "bg-slate-400",
    pulseDot: "bg-slate-300",
  },
  success: {
    container: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    dot: "bg-emerald-500",
    pulseDot: "bg-emerald-400",
  },
  warning: {
    container: "bg-amber-50 text-amber-700 border-amber-200/70",
    dot: "bg-amber-500",
    pulseDot: "bg-amber-400",
  },
  danger: {
    container: "bg-rose-50 text-[#CC1A22] border-rose-200/70",
    dot: "bg-[#CC1A22]",
    pulseDot: "bg-rose-400",
  },
  info: {
    container: "bg-sky-50 text-sky-700 border-sky-200/70",
    dot: "bg-sky-500",
    pulseDot: "bg-sky-400",
  },
  brand: {
    container: "bg-[#1C2539] text-white border-[#1C2539]",
    dot: "bg-emerald-400",
    pulseDot: "bg-emerald-300",
  },
  outline: {
    container: "bg-transparent text-slate-700 border-slate-300",
    dot: "bg-slate-500",
    pulseDot: "bg-slate-400",
  },

  // Estados de Pagos y Finanzas
  PAGADO: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-600",
    pulseDot: "bg-emerald-400",
  },
  PENDIENTE: {
    container: "bg-amber-50 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
    pulseDot: "bg-amber-400",
  },
  VENCIDO: {
    container: "bg-rose-50 text-[#CC1A22] border-rose-200/80",
    dot: "bg-[#CC1A22]",
    pulseDot: "bg-rose-400",
  },

  // Estados de Propiedades
  DISPONIBLE: {
    container: "bg-emerald-50 text-[#175E38] border-emerald-200/80",
    dot: "bg-[#175E38]",
    pulseDot: "bg-emerald-400",
  },
  OCUPADO: {
    container: "bg-slate-100 text-slate-800 border-slate-200/80",
    dot: "bg-slate-700",
    pulseDot: "bg-slate-400",
  },
  MANTENIMIENTO: {
    container: "bg-orange-50 text-orange-800 border-orange-200/80",
    dot: "bg-orange-500",
    pulseDot: "bg-orange-400",
  },
  RESERVADO: {
    container: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    dot: "bg-indigo-500",
    pulseDot: "bg-indigo-400",
  },

  // Estados de Contratos y Tickets
  VIGENTE: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-600",
    pulseDot: "bg-emerald-400",
  },
  CANCELADO: {
    container: "bg-slate-100 text-slate-500 border-slate-200/80",
    dot: "bg-slate-400",
    pulseDot: "bg-slate-300",
  },
  ABIERTO: {
    container: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-500",
    pulseDot: "bg-blue-400",
  },
  EN_PROCESO: {
    container: "bg-amber-50 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
    pulseDot: "bg-amber-400",
  },
  RESUELTO: {
    container: "bg-emerald-50 text-[#175E38] border-emerald-200/80",
    dot: "bg-[#175E38]",
    pulseDot: "bg-emerald-400",
  },

  // Estados de Usuarios
  ACTIVO: {
    container: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    dot: "bg-emerald-500",
    pulseDot: "bg-emerald-400",
  },
  INACTIVO: {
    container: "bg-slate-100 text-slate-500 border-slate-200/80",
    dot: "bg-slate-400",
    pulseDot: "bg-slate-300",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2 py-0.5 gap-1 font-semibold",
  md: "text-xs px-2.5 py-1 gap-1.5 font-semibold",
  lg: "text-sm px-3 py-1.5 gap-2 font-medium",
};

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  dotPulse = false,
  icon,
  onRemove,
  children,
  className = "",
  ...props
}: BadgeProps) {
  const currentStyles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-150 tracking-wide select-none ${currentStyles.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {/* Indicador de punto circular con opción pulsante */}
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {dotPulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${currentStyles.pulseDot}`}
            />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${currentStyles.dot}`} />
        </span>
      )}

      {/* Ícono personalizado opcional */}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}

      {/* Contenido de la etiqueta */}
      <span className="truncate">{children}</span>

      {/* Botón interactivo para remover si aplica como filtro */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Eliminar filtro"
          className="ml-0.5 -mr-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-current hover:bg-black/10 focus:outline-hidden"
        >
          <X className="h-2.5 w-2.5 stroke-[2.5]" />
        </button>
      )}
    </span>
  );
}
