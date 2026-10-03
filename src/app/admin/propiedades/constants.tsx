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

// Formateador de moneda en USD
export const formatCurrency = (val: number | null) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
};

// Generador de enlace directo a WhatsApp
export const getWhatsAppUrl = (phone: string) => {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}`;
};

// Icono SVG oficial de WhatsApp
export const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.115.552 4.179 1.6 6.004L.057 24l6.163-1.543a11.97 11.97 0 0 0 5.811 1.575h.005c6.632 0 12.026-5.394 12.026-12.031A12.03 12.03 0 0 0 12.031 0zm0 22.028c-1.815 0-3.593-.487-5.15-1.411l-.37-.22-3.833.96 1.022-3.737-.24-.383A9.972 9.972 0 0 1 2.05 12.03C2.05 6.528 6.528 2.05 12.031 2.05c2.668 0 5.176 1.04 7.06 2.923a9.92 9.92 0 0 1 2.922 7.058c0 5.503-4.478 9.997-9.982 9.997zm5.474-7.48c-.3-.15-1.776-.876-2.052-.976-.275-.1-.476-.15-.676.15-.2.3-.776.976-.951 1.176-.175.2-.35.226-.65.076-.3-.15-1.267-.467-2.414-1.49-.893-.796-1.495-1.78-1.67-2.08-.175-.3-.019-.463.132-.612.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.63-.926-2.23-.243-.585-.49-.506-.675-.515l-.575-.01c-.2 0-.525.075-.8.375s-1.05 1.026-1.05 2.502c0 1.476 1.075 2.902 1.225 3.102.15.2 2.115 3.23 5.125 4.53.716.31 1.275.494 1.711.632.72.23 1.374.197 1.892.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z" />
  </svg>
);
