"use client";

import React, { useMemo } from "react";
import {
  Building2,
  Store,
  Search,
  X,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { TipoPropiedad, EstadoUnidad } from "@prisma/client";
import { tipoPropiedadBadgeConfig } from "./constants";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import type { Tab } from "./types";

interface PropiedadesFiltrosBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  totalPropiedades: number;
  totalUnidades: number;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  // Filtro Tipo (Tab Propiedades)
  filtroTipo: string;
  onFiltroTipoChange: (val: string) => void;
  tiposDisponibles: Array<{
    tipo: TipoPropiedad;
    label: string;
    count: number;
  }>;
  // Filtros Espacios (Tab Unidades)
  filtroPropiedad: string;
  onFiltroPropiedadChange: (val: string) => void;
  propiedadesParaSelector: Array<{
    id: string;
    nombre: string;
    ciudad: string;
    tipo: TipoPropiedad;
    count: number;
  }>;
  propiedadActivaFiltro: {
    id: string;
    nombre: string;
  } | null;
  filtroEstadoUnidad: string;
  onFiltroEstadoUnidadChange: (val: string) => void;
  estadosUnidadDisponibles: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }>;
}

export function PropiedadesFiltrosBar({
  activeTab,
  onTabChange,
  totalPropiedades,
  totalUnidades,
  busqueda,
  onBusquedaChange,
  filtroTipo,
  onFiltroTipoChange,
  tiposDisponibles,
  filtroPropiedad,
  onFiltroPropiedadChange,
  propiedadesParaSelector,
  filtroEstadoUnidad,
  onFiltroEstadoUnidadChange,
  estadosUnidadDisponibles,
}: PropiedadesFiltrosBarProps) {
  // Opciones para el selector de Tipología (Tab Propiedades)
  const opcionesTipo = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODOS",
        label: "Todos los tipos",
        icon: Layers,
        count: totalPropiedades,
        isGlobal: true,
      },
      ...tiposDisponibles.map((t) => ({
        value: t.tipo,
        label: t.label,
        icon: tipoPropiedadBadgeConfig(t.tipo).icon,
        count: t.count,
      })),
    ];
  }, [tiposDisponibles, totalPropiedades]);

  // Opciones para el selector de Inmuebles (Tab Espacios)
  const opcionesPropiedad = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODAS",
        label: "Todos los inmuebles",
        icon: Building2,
        count: totalUnidades,
        isGlobal: true,
      },
      ...propiedadesParaSelector.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        icon: tipoPropiedadBadgeConfig(p.tipo).icon,
        count: p.count,
      })),
    ];
  }, [propiedadesParaSelector, totalUnidades]);

  // Opciones para el selector de Estado de Espacio (Tab Espacios)
  const opcionesEstadoUnidad = useMemo((): FilterDropdownOption[] => {
    const primerEstado = estadosUnidadDisponibles[0];
    const restoEstados = estadosUnidadDisponibles.slice(1);

    const base: FilterDropdownOption[] = [];

    if (primerEstado) {
      base.push({
        value: primerEstado.value,
        label: primerEstado.label,
        icon: CheckCircle2,
        iconClassName: "text-[#175E38]",
        count: primerEstado.count,
        countBadgeClassName: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
      });
    }

    restoEstados.forEach((opt) => {
      const esInactivo = opt.value === EstadoUnidad.INACTIVO;
      base.push({
        value: opt.value,
        label: opt.label,
        icon: opt.icon,
        iconClassName: esInactivo ? "text-rose-500" : "text-slate-400",
        count: opt.count,
        countBadgeClassName:
          esInactivo && opt.count > 0
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : undefined,
      });
    });

    base.push({
      value: "TODOS",
      label: "Todos los estados",
      icon: Layers,
      count: totalUnidades,
      isGlobal: true,
    });

    return base;
  }, [estadosUnidadDisponibles, totalUnidades]);

  return (
    <div className="bg-[#1C2539]/[0.03] rounded-2xl p-3 sm:p-4 border border-[#1C2539]/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
      {/* Pestañas Principales */}
      <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 bg-white/70 p-1 rounded-xl border border-slate-200/50 w-full md:w-auto">
        <button
          type="button"
          onClick={() => onTabChange("propiedades")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "propiedades"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline">Inmuebles y Edificios</span>
            <span className="sm:hidden">Inmuebles</span>
          </span>
          <span
            className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
              activeTab === "propiedades"
                ? "bg-[#1C2539] text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {totalPropiedades}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("unidades")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "unidades"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline">Espacios en Alquiler</span>
            <span className="sm:hidden">Espacios</span>
          </span>
          <span
            className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
              activeTab === "unidades"
                ? "bg-[#1C2539] text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {totalUnidades}
          </span>
        </button>
      </div>

      {/* Buscador y Dropdowns de Filtro */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
        {/* Input de Búsqueda */}
        <div className="relative w-full sm:w-[220px] md:w-[260px] lg:w-[320px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder={
              activeTab === "propiedades"
                ? "Buscar por nombre o ciudad..."
                : "Buscar espacio o propiedad..."
            }
            className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusquedaChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Filtro por tipo (Pestaña Propiedades) */}
          {activeTab === "propiedades" && (
            <FilterDropdown
              value={filtroTipo}
              onChange={(val) => onFiltroTipoChange(val)}
              options={opcionesTipo}
              size="sm"
              className="w-full sm:w-auto"
              menuWidth="w-60"
              ariaLabel="Filtrar por tipo"
            />
          )}

          {/* Filtros para pestaña Espacios (Selector de Inmueble y Selector de Estado) */}
          {activeTab === "unidades" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* 1. Selector de Inmueble */}
              <FilterDropdown
                value={filtroPropiedad}
                onChange={(val) => onFiltroPropiedadChange(val)}
                options={opcionesPropiedad}
                size="sm"
                className="w-full sm:w-auto"
                menuWidth="w-72"
                ariaLabel="Filtrar por inmueble"
              />

              {/* 2. Selector de Estado de Espacio */}
              <FilterDropdown
                value={filtroEstadoUnidad}
                onChange={(val) => onFiltroEstadoUnidadChange(val)}
                options={opcionesEstadoUnidad}
                size="sm"
                className="w-full sm:w-auto"
                menuWidth="w-64"
                ariaLabel="Filtrar por estado del espacio"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
