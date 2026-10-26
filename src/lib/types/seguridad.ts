// Enums y tipos institucionales para la Bitácora de Seguridad

export const CategoriaNovedad = {
  RONDA_DE_RUTINA: "RONDA_DE_RUTINA",
  INCIDENCIA_SEGURIDAD: "INCIDENCIA_SEGURIDAD",
  FALLA_INFRAESTRUCTURA: "FALLA_INFRAESTRUCTURA",
  ACCESO_VEHICULAR: "ACCESO_VEHICULAR",
  OTRO: "OTRO",
} as const;

export type CategoriaNovedad = (typeof CategoriaNovedad)[keyof typeof CategoriaNovedad];

export const CATEGORIA_NOVEDAD_CONFIG: Record<
  CategoriaNovedad,
  { label: string; badgeClass: string; iconColor: string; solClass: string }
> = {
  RONDA_DE_RUTINA: {
    label: "Vigilancia Diaria",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-600",
    solClass: "bg-emerald-500/15",
  },
  INCIDENCIA_SEGURIDAD: {
    label: "Incidencia de Seguridad",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    iconColor: "text-rose-600",
    solClass: "bg-rose-500/15",
  },
  FALLA_INFRAESTRUCTURA: {
    label: "Falla / Avería",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
    solClass: "bg-amber-500/15",
  },
  ACCESO_VEHICULAR: {
    label: "Control de Acceso",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    iconColor: "text-sky-600",
    solClass: "bg-sky-500/15",
  },
  OTRO: {
    label: "Otro Suceso",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    iconColor: "text-slate-600",
    solClass: "bg-slate-400/15",
  },
};

// Helper institucional para parsear títulos con tipo personalizado en [Otro: ...]
export function parseNovedadTitulo(
  categoria: CategoriaNovedad,
  titulo: string
): { badgeLabel: string; tituloLimpio: string } {
  if (categoria === CategoriaNovedad.OTRO) {
    const match = titulo.match(/^\[(.*?)\]\s*(.*)$/);
    if (match && match[1]?.trim()) {
      return {
        badgeLabel: match[1].trim(),
        tituloLimpio: match[2]?.trim() || match[1].trim(),
      };
    }
  }
  return {
    badgeLabel: CATEGORIA_NOVEDAD_CONFIG[categoria]?.label || "Otro Suceso",
    tituloLimpio: titulo,
  };
}

// Estructura de una Novedad / Incidencia en la Bitácora de Seguridad
export interface IncidenciaItem {
  id: string;
  propiedadId: string;
  propiedadNombre: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoCedula: string;
  empleadoTelefono?: string | null;
  fecha: string; // ISO string
  horaFormateada: string; // Ej: "10:30 AM"
  fechaFormateada: string; // Ej: "24/10/2026"
  categoria: CategoriaNovedad;
  titulo: string;
  descripcion: string;
  fotos: string[];
  createdAt: string;
}

// Vista del guardia (Bitácora de Seguridad del Inmueble)
export interface GuardiaDiarioData {
  propiedadAsignada: { id: string; nombre: string; ciudad?: string } | null;
  propiedades: Array<{ id: string; nombre: string; ciudad: string }>;
  incidencias: IncidenciaItem[];
  incidenciasHoy: IncidenciaItem[];
  fechaHoy: string;
  esAdmin: boolean;
}

// Vista ejecutiva de auditoría (Admin)
export interface SeguridadDashboardData {
  incidencias: IncidenciaItem[];
  metricas: {
    totalIncidenciasMes: number;
    incidenciasHoy: number;
    propiedadesReportadas: number;
    fotosRegistradas: number;
  };
  propiedades: Array<{ id: string; nombre: string; ciudad: string }>;
}
