import React from "react";
import { TipoPropiedad, TipoUnidad } from "@prisma/client";
import {
  Building2,
  Store,
  Home,
  Building,
  Warehouse,
  MapPin,
  Layers,
} from "lucide-react";

// Etiquetas legibles para tipos de propiedad
export const TIPO_PROPIEDAD_LABEL: Record<TipoPropiedad, string> = {
  CENTRO_COMERCIAL: "Centro Comercial",
  EDIFICIO: "Edificio",
  CASA: "Casa Sola",
  APARTAMENTO: "Apartamento Solo",
  LOCAL: "Local Solo",
  GALPON: "Galpón / Depósito",
  TERRENO: "Terreno",
  OTRO: "Otro",
};

// Plurales para el selector de filtro por tipo
export const TIPO_PROPIEDAD_PLURAL: Record<TipoPropiedad, string> = {
  CENTRO_COMERCIAL: "Centros Comerciales",
  EDIFICIO: "Edificios",
  CASA: "Casas Solas",
  APARTAMENTO: "Apartamentos Solos",
  LOCAL: "Locales Solos",
  GALPON: "Galpones",
  TERRENO: "Terrenos",
  OTRO: "Otros",
};

// Etiquetas legibles para tipos de unidad
export const TIPO_UNIDAD_LABEL: Record<TipoUnidad, string> = {
  LOCAL: "Local Comercial",
  APARTAMENTO: "Apartamento",
  OFICINA: "Oficina",
  DEPOSITO: "Depósito",
  CASA: "Casa",
  OTRO: "Otro",
};

// Configuración de estilo visual y badges por tipología de propiedad
export const tipoPropiedadBadgeConfig = (tipo: TipoPropiedad) => {
  switch (tipo) {
    case TipoPropiedad.CENTRO_COMERCIAL:
      return { label: "Centro Comercial", bg: "bg-blue-50 text-blue-800 border-blue-200", icon: Store };
    case TipoPropiedad.EDIFICIO:
      return { label: "Edificio", bg: "bg-indigo-50 text-indigo-800 border-indigo-200", icon: Building2 };
    case TipoPropiedad.CASA:
      return { label: "Casa Sola", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: Home };
    case TipoPropiedad.APARTAMENTO:
      return { label: "Apartamento", bg: "bg-cyan-50 text-cyan-800 border-cyan-200", icon: Building };
    case TipoPropiedad.LOCAL:
      return { label: "Local Solo", bg: "bg-amber-50 text-amber-800 border-amber-200", icon: Store };
    case TipoPropiedad.GALPON:
      return { label: "Galpón", bg: "bg-purple-50 text-purple-800 border-purple-200", icon: Warehouse };
    case TipoPropiedad.TERRENO:
      return { label: "Terreno", bg: "bg-stone-50 text-stone-800 border-stone-200", icon: MapPin };
    default:
      return { label: "Inmueble", bg: "bg-slate-50 text-slate-800 border-slate-200", icon: Layers };
  }
};

// Estilo del sol decorativo en esquina según la tipología
export const tipoPropiedadCornerSun = (tipo: TipoPropiedad) => {
  switch (tipo) {
    case TipoPropiedad.CENTRO_COMERCIAL:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    case TipoPropiedad.EDIFICIO:
      return {
        glow: "bg-indigo-500/20",
        ring: "bg-indigo-500/[0.08] border-indigo-400/25",
        sun: "from-indigo-600/25 to-indigo-400/5",
      };
    case TipoPropiedad.CASA:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
    case TipoPropiedad.APARTAMENTO:
      return {
        glow: "bg-cyan-500/20",
        ring: "bg-cyan-500/[0.08] border-cyan-400/25",
        sun: "from-cyan-600/25 to-cyan-400/5",
      };
    case TipoPropiedad.LOCAL:
      return {
        glow: "bg-amber-500/20",
        ring: "bg-amber-500/[0.08] border-amber-400/25",
        sun: "from-amber-600/25 to-amber-400/5",
      };
    case TipoPropiedad.GALPON:
      return {
        glow: "bg-purple-500/20",
        ring: "bg-purple-500/[0.08] border-purple-400/25",
        sun: "from-purple-600/25 to-purple-400/5",
      };
    case TipoPropiedad.TERRENO:
      return {
        glow: "bg-stone-500/20",
        ring: "bg-stone-500/[0.08] border-stone-400/25",
        sun: "from-stone-600/25 to-stone-400/5",
      };
    default:
      return {
        glow: "bg-slate-500/20",
        ring: "bg-slate-500/[0.08] border-slate-400/25",
        sun: "from-slate-600/25 to-slate-400/5",
      };
  }
};

// Re-exportación de utilidades globales desde @/lib/formatters para compatibilidad
export { formatCurrency, formatCurrencyDecimals, getWhatsAppUrl, WhatsAppIcon } from "@/lib/formatters";

