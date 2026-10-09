"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Building2,
  Store,
  Search,
  ChevronDown,
  Check,
  X,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { TipoPropiedad, EstadoUnidad } from "@prisma/client";
import { tipoPropiedadBadgeConfig } from "./constants";
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
  propiedadActivaFiltro,
  filtroEstadoUnidad,
  onFiltroEstadoUnidadChange,
  estadosUnidadDisponibles,
}: PropiedadesFiltrosBarProps) {
  const [isDropdownTipoOpen, setIsDropdownTipoOpen] = useState(false);
  const [isDropdownPropiedadOpen, setIsDropdownPropiedadOpen] = useState(false);
  const [isDropdownEstadoUnidadOpen, setIsDropdownEstadoUnidadOpen] = useState(false);

  const dropdownTipoRef = useRef<HTMLDivElement>(null);
  const dropdownPropiedadRef = useRef<HTMLDivElement>(null);
  const dropdownEstadoUnidadRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdowns con clic exterior o tecla Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownTipoRef.current && !dropdownTipoRef.current.contains(e.target as Node)) {
        setIsDropdownTipoOpen(false);
      }
      if (dropdownPropiedadRef.current && !dropdownPropiedadRef.current.contains(e.target as Node)) {
        setIsDropdownPropiedadOpen(false);
      }
      if (dropdownEstadoUnidadRef.current && !dropdownEstadoUnidadRef.current.contains(e.target as Node)) {
        setIsDropdownEstadoUnidadOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownTipoOpen(false);
        setIsDropdownPropiedadOpen(false);
        setIsDropdownEstadoUnidadOpen(false);
      }
    };

    if (isDropdownTipoOpen || isDropdownPropiedadOpen || isDropdownEstadoUnidadOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownTipoOpen, isDropdownPropiedadOpen, isDropdownEstadoUnidadOpen]);

  // Icono y etiqueta activa para el selector de tipo
  const activeFiltroConfig = useMemo(() => {
    if (filtroTipo === "TODOS") {
      return {
        label: "Todos los tipos",
        icon: Layers,
      };
    }
    const item = tiposDisponibles.find((t) => t.tipo === filtroTipo);
    return {
      label: item ? item.label : filtroTipo,
      icon: tipoPropiedadBadgeConfig(filtroTipo as TipoPropiedad).icon,
    };
  }, [filtroTipo, tiposDisponibles]);

  // Icono y etiqueta activa para el selector de estado de unidad
  const estadoUnidadActivoConfig = useMemo(() => {
    if (filtroEstadoUnidad === "TODOS") {
      return {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: totalUnidades,
      };
    }
    return (
      estadosUnidadDisponibles.find((o) => o.value === filtroEstadoUnidad) || {
        value: "ACTIVOS",
        label: "Activos / Operativos",
        icon: CheckCircle2,
        count: estadosUnidadDisponibles[0]?.count ?? 0,
      }
    );
  }, [filtroEstadoUnidad, estadosUnidadDisponibles, totalUnidades]);

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
            <div ref={dropdownTipoRef} className="relative w-full sm:w-auto">
              <select
                value={filtroTipo}
                onChange={(e) => onFiltroTipoChange(e.target.value)}
                className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Filtrar por tipo"
              >
                <option value="TODOS">
                  Todos los tipos {totalPropiedades > 0 ? `(${totalPropiedades})` : ""}
                </option>
                {tiposDisponibles.map((t) => (
                  <option key={t.tipo} value={t.tipo}>
                    {t.label} ({t.count})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownTipoOpen((prev) => !prev);
                  setIsDropdownPropiedadOpen(false);
                  setIsDropdownEstadoUnidadOpen(false);
                }}
                className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
              >
                <div className="flex items-center gap-2 truncate">
                  {React.createElement(activeFiltroConfig.icon, {
                    className: "w-4 h-4 text-slate-500 shrink-0",
                  })}
                  <span className="truncate">{activeFiltroConfig.label}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                    isDropdownTipoOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDropdownTipoOpen && (
                <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      onFiltroTipoChange("TODOS");
                      setIsDropdownTipoOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                      filtroTipo === "TODOS"
                        ? "bg-slate-50 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">Todos los tipos</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                        {totalPropiedades}
                      </span>
                      {filtroTipo === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                    </div>
                  </button>

                  {tiposDisponibles.length > 0 && (
                    <div className="my-1 border-t border-slate-100" />
                  )}

                  {tiposDisponibles.map((t) => {
                    const IconComponent = tipoPropiedadBadgeConfig(t.tipo).icon;
                    const isSelected = filtroTipo === t.tipo;
                    return (
                      <button
                        key={t.tipo}
                        type="button"
                        onClick={() => {
                          onFiltroTipoChange(t.tipo);
                          setIsDropdownTipoOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-slate-50 text-slate-900 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <IconComponent className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {t.count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Filtros para pestaña Espacios (Selector de Inmueble y Selector de Estado) */}
          {activeTab === "unidades" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* 1. Selector de Inmueble */}
              <div ref={dropdownPropiedadRef} className="relative w-full sm:w-auto">
                <select
                  value={filtroPropiedad}
                  onChange={(e) => onFiltroPropiedadChange(e.target.value)}
                  className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Filtrar por inmueble"
                >
                  <option value="TODAS">
                    Todos los inmuebles ({totalUnidades})
                  </option>
                  {propiedadesParaSelector.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.count})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownPropiedadOpen((prev) => !prev);
                    setIsDropdownEstadoUnidadOpen(false);
                    setIsDropdownTipoOpen(false);
                  }}
                  className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
                >
                  <div className="flex items-center gap-2 truncate sm:max-w-[180px]">
                    <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {propiedadActivaFiltro ? propiedadActivaFiltro.nombre : "Todos los inmuebles"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                      isDropdownPropiedadOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownPropiedadOpen && (
                  <div className="hidden md:block absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        onFiltroPropiedadChange("TODAS");
                        setIsDropdownPropiedadOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                        filtroPropiedad === "TODAS"
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">Todos los inmuebles</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {totalUnidades}
                        </span>
                        {filtroPropiedad === "TODAS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>

                    {propiedadesParaSelector.length > 0 && (
                      <div className="my-1 border-t border-slate-100" />
                    )}

                    {propiedadesParaSelector.map((p) => {
                      const isSelected = filtroPropiedad === p.id;
                      const IconComp = tipoPropiedadBadgeConfig(p.tipo).icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onFiltroPropiedadChange(p.id);
                            setIsDropdownPropiedadOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-slate-50 text-slate-900 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <IconComp className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="truncate text-left">
                              <p className="truncate font-medium">{p.nombre}</p>
                              <p className="text-[10px] text-slate-400 truncate">{p.ciudad}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                              {p.count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Selector de Estado de Espacio */}
              <div ref={dropdownEstadoUnidadRef} className="relative w-full sm:w-auto">
                <select
                  value={filtroEstadoUnidad}
                  onChange={(e) => onFiltroEstadoUnidadChange(e.target.value)}
                  className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Filtrar por estado del espacio"
                >
                  <option value="ACTIVOS">
                    Activos / Operativos ({estadosUnidadDisponibles[0]?.count ?? 0})
                  </option>
                  <option value="TODOS">
                    Todos los estados ({totalUnidades})
                  </option>
                  {estadosUnidadDisponibles.slice(1).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.count})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownEstadoUnidadOpen((prev) => !prev);
                    setIsDropdownPropiedadOpen(false);
                    setIsDropdownTipoOpen(false);
                  }}
                  className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
                >
                  <div className="flex items-center gap-2 truncate">
                    {React.createElement(estadoUnidadActivoConfig.icon, {
                      className: "w-4 h-4 text-slate-500 shrink-0",
                    })}
                    <span className="truncate">{estadoUnidadActivoConfig.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                      isDropdownEstadoUnidadOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownEstadoUnidadOpen && (
                  <div className="hidden md:block absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        onFiltroEstadoUnidadChange("ACTIVOS");
                        setIsDropdownEstadoUnidadOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                        filtroEstadoUnidad === "ACTIVOS"
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-[#175E38] shrink-0" />
                        <span className="truncate">Activos / Operativos</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded-full">
                          {estadosUnidadDisponibles[0]?.count ?? 0}
                        </span>
                        {filtroEstadoUnidad === "ACTIVOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {estadosUnidadDisponibles.slice(1).map((opt) => {
                      const isSelected = filtroEstadoUnidad === opt.value;
                      const IconComponent = opt.icon;
                      const esInactivoOpt = opt.value === EstadoUnidad.INACTIVO;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onFiltroEstadoUnidadChange(opt.value);
                            setIsDropdownEstadoUnidadOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-slate-50 text-slate-900 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <IconComponent className={`w-4 h-4 shrink-0 ${esInactivoOpt ? "text-rose-500" : "text-slate-400"}`} />
                            <span className={`truncate ${esInactivoOpt ? "text-rose-950 font-medium" : ""}`}>{opt.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                              esInactivoOpt && opt.count > 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {opt.count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                          </div>
                        </button>
                      );
                    })}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        onFiltroEstadoUnidadChange("TODOS");
                        setIsDropdownEstadoUnidadOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                        filtroEstadoUnidad === "TODOS"
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">Todos los estados</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {totalUnidades}
                        </span>
                        {filtroEstadoUnidad === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
