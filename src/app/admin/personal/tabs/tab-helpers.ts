import { EmpleadoItem, TareaEmpleadoItem } from "../types";

export const PAGE_SIZE_TAREAS = 6;
export const PAGE_SIZE_ASISTENCIA = 8;

export interface PropiedadGrupoInfo {
  id: string;
  nombre: string;
  ciudad?: string;
  tipo?: string;
}

export interface GrupoDirectorio {
  id: string;
  propiedad: PropiedadGrupoInfo;
  empleados: EmpleadoItem[];
}

export interface GrupoAsistencia {
  id: string;
  propiedad: PropiedadGrupoInfo;
  empleados: EmpleadoItem[];
}

export interface GrupoTareas {
  id: string;
  propiedad: PropiedadGrupoInfo;
  tareas: TareaEmpleadoItem[];
}

// Configuración de resplandor ambiental para la esquina del acordeón
export function getCornerSunConfig(tipo?: string) {
  switch (tipo) {
    case "CENTRO_COMERCIAL":
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    case "EDIFICIO":
      return {
        glow: "bg-indigo-500/20",
        ring: "bg-indigo-500/[0.08] border-indigo-400/25",
        sun: "from-indigo-600/25 to-indigo-400/5",
      };
    case "CASA":
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
    case "SEDE_CENTRAL":
      return {
        glow: "bg-slate-500/20",
        ring: "bg-slate-500/[0.08] border-slate-400/25",
        sun: "from-[#1C2539]/25 to-slate-400/5",
      };
    default:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/25 to-transparent",
      };
  }
}

// Badge de tipología de inmueble
export function getPropiedadBadge(tipo?: string) {
  switch (tipo) {
    case "CENTRO_COMERCIAL":
      return { label: "Centro Comercial", bg: "bg-blue-50 text-blue-800 border-blue-200" };
    case "EDIFICIO":
      return { label: "Edificio", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "CASA":
      return { label: "Casa Sola", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "SEDE_CENTRAL":
      return { label: "Corporativo", bg: "bg-slate-100 text-slate-800 border-slate-300" };
    default:
      return { label: "Inmueble", bg: "bg-slate-50 text-slate-800 border-slate-200" };
  }
}
