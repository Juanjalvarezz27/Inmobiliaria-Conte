"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Store,
  ChevronDown,
  Search,
  ArrowLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { EstadoUnidad, TipoPropiedad } from "@prisma/client";
import type { UnidadDisponible } from "./types";
import { tipoPropiedadBadgeConfig } from "../propiedades/constants";

interface EspacioSelectorMultiNivelProps {
  unidades: UnidadDisponible[];
  value: string;
  onChange: (unidadId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface GrupoPropiedad {
  id: string;
  nombre: string;
  ciudad: string;
  tipo: TipoPropiedad;
  espacios: UnidadDisponible[];
}

export function EspacioSelectorMultiNivel({
  unidades,
  value,
  onChange,
  placeholder = "Selecciona un espacio libre...",
  disabled = false,
}: EspacioSelectorMultiNivelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [propiedadActivaId, setPropiedadActivaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const contenedorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Espacio seleccionado actualmente
  const unidadSeleccionada = useMemo(
    () => unidades.find((u) => u.id === value),
    [unidades, value]
  );

  // Agrupar unidades disponibles por propiedad
  const gruposPropiedades = useMemo(() => {
    const mapa = new Map<string, GrupoPropiedad>();

    for (const u of unidades) {
      const propId = u.propiedad.id;
      if (!mapa.has(propId)) {
        mapa.set(propId, {
          id: propId,
          nombre: u.propiedad.nombre,
          ciudad: u.propiedad.ciudad,
          tipo: u.propiedad.tipo,
          espacios: [],
        });
      }
      mapa.get(propId)!.espacios.push(u);
    }

    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [unidades]);

  // Manejo de clic exterior y tecla Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      // Foco en input de búsqueda al abrir
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Propiedad activa seleccionada en el nivel 2
  const propiedadActiva = useMemo(
    () => gruposPropiedades.find((g) => g.id === propiedadActivaId) || null,
    [gruposPropiedades, propiedadActivaId]
  );

  // Filtrado de propiedades o espacios según el término de búsqueda
  const q = busqueda.toLowerCase().trim();

  // En nivel 1: filtrar propiedades por su nombre, ciudad o si contienen un espacio que coincida
  const propiedadesFiltradas = useMemo(() => {
    if (!q) return gruposPropiedades;
    return gruposPropiedades.filter((g) => {
      const coincidePropiedad =
        g.nombre.toLowerCase().includes(q) || g.ciudad.toLowerCase().includes(q);
      const coincideEspacio = g.espacios.some(
        (e) =>
          e.codigo.toLowerCase().includes(q) ||
          (e.piso && e.piso.toLowerCase().includes(q))
      );
      return coincidePropiedad || coincideEspacio;
    });
  }, [gruposPropiedades, q]);

  // En nivel 2: filtrar espacios de la propiedad activa
  const espaciosFiltrados = useMemo(() => {
    if (!propiedadActiva) return [];
    if (!q) return propiedadActiva.espacios;
    return propiedadActiva.espacios.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        (e.piso && e.piso.toLowerCase().includes(q)) ||
        (e.areaMt2 && String(e.areaMt2).includes(q))
    );
  }, [propiedadActiva, q]);

  const handleSeleccionarEspacio = (espacioId: string) => {
    onChange(espacioId);
    setIsOpen(false);
  };

  return (
    <div ref={contenedorRef} className="relative w-full">
      {/* Botón Disparador (Trigger) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl text-left border transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-[#175E38] ring-2 ring-[#175E38]/20 shadow-sm"
            : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              unidadSeleccionada
                ? "bg-emerald-50 text-[#175E38] border border-emerald-200"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Store className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            {unidadSeleccionada ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm font-heading truncate">
                    {unidadSeleccionada.codigo}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 text-[#175E38] border border-emerald-200 shrink-0">
                    {unidadSeleccionada.estado === EstadoUnidad.DISPONIBLE
                      ? "Disponible"
                      : "Mantenimiento"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  {unidadSeleccionada.propiedad.nombre} · {unidadSeleccionada.propiedad.ciudad}
                </span>
              </div>
            ) : (
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {unidadSeleccionada?.precioAlquiler && (
            <span className="text-xs font-bold text-[#175E38] bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/80 hidden sm:inline">
              ${unidadSeleccionada.precioAlquiler} / mes
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-slate-700" : ""
            }`}
          />
        </div>
      </button>

      {/* Menú Flotante Multinivel Ampliado en Desktop */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 sm:left-auto sm:right-0 sm:w-[560px] md:w-[600px] mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Cabecera con Buscador */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={
                  propiedadActiva
                    ? `Buscar espacio en ${propiedadActiva.nombre}...`
                    : "Buscar propiedad o espacio..."
                }
                className="w-full pl-9 pr-8 h-9 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] text-slate-800 placeholder:text-slate-400 font-medium"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* VISTA NIVEL 2: Espacios de la Propiedad Seleccionada */}
          {propiedadActiva ? (
            <div>
              {/* Barra de navegación superior con botón para volver al Nivel 1 */}
              <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPropiedadActivaId(null);
                    setBusqueda("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#175E38] transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>Volver a propiedades</span>
                </button>

                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Paso 2: Elegir Espacio
                </span>
              </div>

              {/* Título de la propiedad activa */}
              <div className="px-3.5 py-2.5 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center justify-between">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#175E38] truncate font-heading">
                    {propiedadActiva.nombre}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {propiedadActiva.ciudad} · {propiedadActiva.espacios.length}{" "}
                    {propiedadActiva.espacios.length === 1 ? "espacio libre" : "espacios libres"}
                  </p>
                </div>
              </div>

              {/* Lista de Espacios con altura ampliada */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1.5">
                {espaciosFiltrados.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No se encontraron espacios que coincidan con la búsqueda.
                  </div>
                ) : (
                  espaciosFiltrados.map((espacio) => {
                    const isSelected = espacio.id === value;
                    const detalles = [
                      espacio.tipo.charAt(0) + espacio.tipo.slice(1).toLowerCase(),
                      espacio.piso ? `Piso ${espacio.piso}` : null,
                      espacio.areaMt2 ? `${espacio.areaMt2} m²` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        key={espacio.id}
                        type="button"
                        onClick={() => handleSeleccionarEspacio(espacio.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50/90 text-[#175E38]"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm font-heading">
                              {espacio.codigo}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                espacio.estado === EstadoUnidad.DISPONIBLE
                                  ? "bg-emerald-100/70 text-[#175E38]"
                                  : "bg-amber-100/70 text-amber-800"
                              }`}
                            >
                              {espacio.estado === EstadoUnidad.DISPONIBLE
                                ? "Disponible"
                                : "Mantenimiento"}
                            </span>
                          </div>
                          {detalles && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {detalles}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {espacio.precioAlquiler ? (
                            <span className="text-xs font-bold font-mono text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                              ${espacio.precioAlquiler}
                              <span className="text-[10px] font-normal text-slate-500 ml-0.5">
                                /mes
                              </span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Sin mensualidad
                            </span>
                          )}

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#175E38] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* VISTA NIVEL 1: Lista de Propiedades / Inmuebles */
            <div>
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <span>Paso 1: Selecciona el Inmueble</span>
                <span className="text-slate-400 font-normal normal-case">
                  {propiedadesFiltradas.length} inmuebles con espacios
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1.5">
                {propiedadesFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No hay propiedades con espacios disponibles.
                  </div>
                ) : (
                  propiedadesFiltradas.map((prop) => {
                    const badgeConfig = tipoPropiedadBadgeConfig(prop.tipo);
                    const IconComponent = badgeConfig.icon;

                    return (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => {
                          setPropiedadActivaId(prop.id);
                          setBusqueda("");
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-[#175E38] flex items-center justify-center shrink-0 transition-colors border border-slate-200/60">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#175E38] transition-colors truncate font-heading">
                              {prop.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {badgeConfig.label} · {prop.ciudad}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-[#175E38] border border-emerald-200/80">
                            {prop.espacios.length}{" "}
                            {prop.espacios.length === 1 ? "libre" : "libres"}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#175E38] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
