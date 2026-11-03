import { CategoriaTicket, UrgenciaTicket, EstadoTicket } from "@prisma/client";

export interface OpcionConfig<T> {
  value: T;
  label: string;
  descripcion?: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const CATEGORIAS_TICKET: Record<CategoriaTicket, { label: string; icon: string }> = {
  ELECTRICIDAD: { label: "Electricidad / Iluminación", icon: "Zap" },
  PLOMERIA: { label: "Plomería / Tuberías / Bombas", icon: "Droplets" },
  FILTRACIONES: { label: "Filtraciones / Humedad", icon: "CloudRain" },
  CERRAJERIA: { label: "Cerrajería / Santamarías / Puertas", icon: "Key" },
  CLIMATIZACION: { label: "Aire Acondicionado / Climatización", icon: "Wind" },
  AREAS_COMUNES: { label: "Áreas Comunes / Fachada", icon: "Building2" },
  PINTURA_ALBANILERIA: { label: "Pintura / Albañilería", icon: "Paintbrush" },
  OTRO: { label: "Otras Incidencias", icon: "Wrench" },
};

export const URGENCIAS_TICKET: Record<
  UrgenciaTicket,
  { label: string; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  BAJA: {
    label: "Baja",
    badgeBg: "bg-slate-50",
    badgeText: "text-slate-700",
    badgeBorder: "border-slate-200",
  },
  MEDIA: {
    label: "Media",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200",
  },
  ALTA: {
    label: "Alta",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
  },
  URGENTE: {
    label: "Urgente",
    badgeBg: "bg-rose-50",
    badgeText: "text-[#CC1A22]",
    badgeBorder: "border-rose-200",
  },
};

export const ESTADOS_TICKET: Record<
  EstadoTicket,
  { label: string; paso: number; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  PENDIENTE: {
    label: "Pendiente",
    paso: 1,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
  },
  EN_PROCESO: {
    label: "En Proceso",
    paso: 2,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
  },
  RESUELTO: {
    label: "Resuelto",
    paso: 3,
    badgeBg: "bg-emerald-50",
    badgeText: "text-[#175E38]",
    badgeBorder: "border-emerald-200",
  },
  CANCELADO: {
    label: "Cancelado",
    paso: 0,
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    badgeBorder: "border-slate-300",
  },
};

// Temas cromáticos institucionales para tarjetas y sol ambiental de 3 capas
export const TEMA_ESTADO_CARD: Record<
  EstadoTicket,
  {
    glowBg: string;
    glowBorder: string;
    glowGrad: string;
    cardBorder: string;
    cardBg: string;
    codeBadge: string;
    estadoBadge: string;
    cardShadow: string;
  }
> = {
  PENDIENTE: {
    glowBg: "bg-amber-500/28",
    glowBorder: "border-amber-400/40 bg-amber-500/10",
    glowGrad: "from-amber-500/45",
    cardBorder: "border-slate-200/90 border-b-[3px] border-b-slate-300/90",
    cardBg: "bg-gradient-to-b from-white via-white to-slate-50/60",
    codeBadge: "bg-slate-50 text-slate-700 border-slate-200 font-bold",
    estadoBadge: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
    cardShadow:
      "shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)]",
  },
  EN_PROCESO: {
    glowBg: "bg-blue-500/26",
    glowBorder: "border-blue-400/40 bg-blue-500/10",
    glowGrad: "from-blue-600/45",
    cardBorder: "border-slate-200/90 border-b-[3px] border-b-slate-300/90",
    cardBg: "bg-gradient-to-b from-white via-white to-slate-50/60",
    codeBadge: "bg-slate-50 text-slate-700 border-slate-200 font-bold",
    estadoBadge: "bg-blue-50 text-blue-800 border-blue-200 font-bold",
    cardShadow:
      "shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)]",
  },
  RESUELTO: {
    glowBg: "bg-emerald-500/28",
    glowBorder: "border-emerald-400/40 bg-emerald-500/10",
    glowGrad: "from-[#175E38]/50",
    cardBorder: "border-slate-200/90 border-b-[3px] border-b-slate-300/90",
    cardBg: "bg-gradient-to-b from-white via-white to-slate-50/60",
    codeBadge: "bg-slate-50 text-slate-700 border-slate-200 font-bold",
    estadoBadge: "bg-emerald-50 text-[#175E38] border-emerald-200 font-bold",
    cardShadow:
      "shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)]",
  },
  CANCELADO: {
    glowBg: "bg-slate-400/15",
    glowBorder: "border-slate-300/25",
    glowGrad: "from-slate-500/25",
    cardBorder: "border-slate-200/90 border-b-[3px] border-b-slate-300/90",
    cardBg: "bg-gradient-to-b from-white via-white to-slate-50/60",
    codeBadge: "bg-slate-100 text-slate-600 border-slate-200 font-bold",
    estadoBadge: "bg-slate-100 text-slate-700 border-slate-300 font-bold",
    cardShadow:
      "shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)]",
  },
};

export interface AfinidadEspecialidad {
  score: number;
  esRecomendado: boolean;
  etiqueta?: string;
}

// Determina la afinidad y recomendación de un colaborador según la categoría de la avería
export function getAfinidadTecnico(
  cargo: string,
  categoria?: CategoriaTicket
): AfinidadEspecialidad {
  if (!categoria) return { score: 0, esRecomendado: false };

  const c = cargo.toUpperCase();

  switch (categoria) {
    case CategoriaTicket.ELECTRICIDAD:
      if (c === "ELECTRICISTA") {
        return { score: 10, esRecomendado: true, etiqueta: "Especialista Eléctrico" };
      }
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 6, esRecomendado: true, etiqueta: "Técnico General" };
      }
      break;

    case CategoriaTicket.PLOMERIA:
    case CategoriaTicket.FILTRACIONES:
      if (c === "PLOMERO") {
        return { score: 10, esRecomendado: true, etiqueta: "Especialista en Plomería" };
      }
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 6, esRecomendado: true, etiqueta: "Técnico General" };
      }
      break;

    case CategoriaTicket.CERRAJERIA:
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 10, esRecomendado: true, etiqueta: "Técnico Calificado" };
      }
      break;

    case CategoriaTicket.CLIMATIZACION:
      if (c === "ELECTRICISTA") {
        return { score: 10, esRecomendado: true, etiqueta: "Especialista en Climatización" };
      }
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 8, esRecomendado: true, etiqueta: "Técnico Calificado" };
      }
      break;

    case CategoriaTicket.AREAS_COMUNES:
      if (c === "CONSERJE") {
        return { score: 10, esRecomendado: true, etiqueta: "Encargado de Áreas Comunes" };
      }
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 8, esRecomendado: true, etiqueta: "Técnico de Apoyo" };
      }
      break;

    case CategoriaTicket.PINTURA_ALBANILERIA:
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 10, esRecomendado: true, etiqueta: "Mantenimiento General" };
      }
      if (c === "CONSERJE") {
        return { score: 6, esRecomendado: false, etiqueta: "Personal de Apoyo" };
      }
      break;

    case CategoriaTicket.OTRO:
      if (c === "TECNICO_MANTENIMIENTO") {
        return { score: 10, esRecomendado: true, etiqueta: "Técnico Multidisciplinario" };
      }
      break;
  }

  // Personal sin calificación técnica directa para reparaciones
  if (c === "SEGURIDAD" || c === "ADMINISTRATIVO") {
    return { score: -5, esRecomendado: false };
  }

  return { score: 0, esRecomendado: false };
}

