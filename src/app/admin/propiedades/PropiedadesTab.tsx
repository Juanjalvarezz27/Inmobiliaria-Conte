"use client";

import React from "react";
import { TipoPropiedad } from "@prisma/client";
import {
  Building2,
  Store,
  Home,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  UserCheck,
} from "lucide-react";
import {
  tipoPropiedadBadgeConfig,
  tipoPropiedadCornerSun,
  getWhatsAppUrl,
  WhatsAppIcon,
} from "./constants";
import type { PropiedadConConteo } from "./types";

interface PropiedadesTabProps {
  propiedades: PropiedadConConteo[];
  propiedadesFiltradas: PropiedadConConteo[];
  isPending: boolean;
  onAbrirCrearPropiedad: (tipo?: TipoPropiedad) => void;
  onEditarPropiedad: (prop: PropiedadConConteo) => void;
  onEliminarPropiedad: (prop: PropiedadConConteo) => void;
  onIrAEspacios: (propiedadId: string) => void;
  onAbrirCrearUnidad: (propiedadId: string) => void;
  onLimpiarFiltros: () => void;
}

// Vista de inmuebles y edificios registrados con sus respectivas tarjetas
export function PropiedadesTab({
  propiedades,
  propiedadesFiltradas,
  isPending,
  onAbrirCrearPropiedad,
  onEditarPropiedad,
  onEliminarPropiedad,
  onIrAEspacios,
  onAbrirCrearUnidad,
  onLimpiarFiltros,
}: PropiedadesTabProps) {
  // Empty State: Accesos rápidos cuando no hay propiedades
  if (propiedades.length === 0) {
    return (
      <div className="bg-gradient-to-b from-white to-slate-50/70 rounded-2xl p-4 sm:p-8 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.06)]">
        <p className="text-sm sm:text-base font-bold text-slate-900 mb-3.5 sm:mb-5 text-center">
          ¿Qué tipo de inmueble vas a registrar?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[
            {
              tipo: TipoPropiedad.CENTRO_COMERCIAL,
              label: "Centro Comercial",
              desc: "Complejo comercial con múltiples locales y tiendas",
              icon: Store,
              color: "bg-blue-50 text-blue-700 border-blue-200",
              sunGlow: "bg-blue-500/20",
              sunRing: "bg-blue-500/[0.08] border-blue-400/25",
              sunCenter: "from-blue-600/25 to-blue-400/5",
            },
            {
              tipo: TipoPropiedad.EDIFICIO,
              label: "Edificio",
              desc: "Torre o complejo de oficinas y departamentos",
              icon: Building2,
              color: "bg-indigo-50 text-indigo-700 border-indigo-200",
              sunGlow: "bg-indigo-500/20",
              sunRing: "bg-indigo-500/[0.08] border-indigo-400/25",
              sunCenter: "from-indigo-600/25 to-indigo-400/5",
            },
            {
              tipo: TipoPropiedad.CASA,
              label: "Casa Sola",
              desc: "Vivienda o residencia unifamiliar independiente",
              icon: Home,
              color: "bg-emerald-50 text-[#175E38] border-emerald-200",
              sunGlow: "bg-emerald-500/20",
              sunRing: "bg-emerald-500/[0.08] border-emerald-400/25",
              sunCenter: "from-[#175E38]/30 to-emerald-400/5",
            },
            {
              tipo: TipoPropiedad.LOCAL,
              label: "Local Solo",
              desc: "Local a pie de calle o establecimiento comercial",
              icon: Store,
              color: "bg-amber-50 text-amber-700 border-amber-200",
              sunGlow: "bg-amber-500/20",
              sunRing: "bg-amber-500/[0.08] border-amber-400/25",
              sunCenter: "from-amber-600/25 to-amber-400/5",
            },
          ].map(({ tipo, label, desc, icon: Icon, color, sunGlow, sunRing, sunCenter }) => (
            <button
              key={tipo}
              onClick={() => onAbrirCrearPropiedad(tipo)}
              className="group relative overflow-hidden flex flex-row sm:flex-col items-center sm:justify-between min-h-[76px] sm:min-h-[260px] p-3.5 sm:p-7 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300 bg-gradient-to-b from-white via-white to-slate-50/70 shadow-[0_4px_16px_-2px_rgba(28,37,57,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,37,57,0.12)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 cursor-pointer text-left sm:text-center w-full gap-3 sm:gap-0"
            >
              {/* Sol decorativo en esquina superior izquierda */}
              <div className="absolute -top-7 -left-7 sm:-top-8 sm:-left-8 w-20 h-20 sm:w-28 sm:h-28 pointer-events-none overflow-hidden rounded-full">
                <div className={`absolute inset-0 rounded-full ${sunGlow} blur-xl`} />
                <div className={`absolute inset-3 rounded-full ${sunRing} border`} />
                <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${sunCenter} transition-transform duration-500 group-hover:scale-125`} />
              </div>

              {/* Icono Principal */}
              <div className={`w-12 h-12 sm:w-16 sm:h-18 rounded-xl sm:rounded-2xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs border relative z-10 sm:mt-2 ${color.split(" ").slice(0, 2).join(" ")} ${color.split(" ")[2]}`}>
                <Icon className="w-6 h-6 sm:w-8 sm:h-9" />
              </div>

              {/* Textos: Título y Descripción */}
              <div className="space-y-0.5 sm:space-y-1.5 relative z-10 flex-1 sm:flex-initial sm:px-1 sm:my-auto">
                <span className="text-sm sm:text-lg font-extrabold text-slate-900 group-hover:text-black block transition-colors leading-tight">
                  {label}
                </span>
                <p className="hidden sm:block text-xs text-slate-500 leading-relaxed font-normal sm:line-clamp-2">
                  {desc}
                </p>
              </div>

              {/* Botón de acción inferior */}
              <div className="shrink-0 sm:w-full sm:pt-3 sm:border-t sm:border-slate-100 flex items-center justify-center gap-1 text-xs font-bold text-slate-700 sm:text-slate-600 group-hover:text-[#175E38] relative z-10 transition-colors bg-slate-100/90 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg sm:rounded-none">
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Registrar {label}</span>
                <span className="sm:hidden">Registrar</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Sin coincidencias de búsqueda o filtro
  if (propiedadesFiltradas.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/90 shadow-2xs text-center space-y-2.5">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Search className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800">No se encontraron inmuebles</h4>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          No hay resultados para los criterios seleccionados. Prueba limpiando el buscador o cambiando el filtro de tipología.
        </p>
        <button
          type="button"
          onClick={onLimpiarFiltros}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100/80 rounded-lg border border-emerald-200/70 transition-all cursor-pointer mt-1"
        >
          Limpiar filtros
        </button>
      </div>
    );
  }

  // Grilla de Tarjetas Inmobiliarias
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {propiedadesFiltradas.map((propiedad) => {
        const badgeInfo = tipoPropiedadBadgeConfig(propiedad.tipo);
        const cornerSun = tipoPropiedadCornerSun(propiedad.tipo);
        const Icon = badgeInfo.icon;

        return (
          <div
            key={propiedad.id}
            className="group/propcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Sol decorativo en esquina superior izquierda */}
            <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
              <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
              <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
              <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/propcard:scale-125`} />
            </div>

            <div className="p-5 sm:p-6 space-y-4 relative z-10 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {/* Cabecera con Badge de Tipo y Acciones */}
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border shadow-xs ${badgeInfo.bg}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {badgeInfo.label}
                  </span>

                  {/* Acciones de Inmueble (Editar / Eliminar) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Editar propiedad */}
                    <div className="relative group/btn">
                      <button
                        type="button"
                        onClick={() => onEditarPropiedad(propiedad)}
                        disabled={isPending}
                        title="Editar inmueble"
                        aria-label="Editar inmueble"
                        className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                        <span>Editar</span>
                      </div>
                    </div>

                    {/* Eliminar propiedad */}
                    <div className="relative group/btn">
                      <button
                        type="button"
                        onClick={() => onEliminarPropiedad(propiedad)}
                        disabled={isPending}
                        title="Eliminar inmueble"
                        aria-label="Eliminar inmueble"
                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                        <span>Eliminar</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Título y Ubicación */}
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xl leading-snug line-clamp-1 group-hover/propcard:text-slate-950 transition-colors">
                    {propiedad.nombre}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1.5 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {propiedad.ciudad} · {propiedad.direccion}
                    </span>
                  </p>
                </div>

                {/* Propietario y WhatsApp */}
                {(propiedad.propietario || propiedad.telefonoContacto) && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {propiedad.propietario && (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C2539] bg-blue-50/90 px-2.5 py-1 rounded-lg border border-blue-200/90 shadow-2xs"
                        title={`Propietario: ${propiedad.propietario}`}
                      >
                        <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>{propiedad.propietario}</span>
                      </span>
                    )}
                    {propiedad.telefonoContacto && (
                      <a
                        href={getWhatsAppUrl(propiedad.telefonoContacto)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar mensaje por WhatsApp"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer group/ws"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                        <span className="underline decoration-emerald-300 underline-offset-2 group-hover/ws:decoration-emerald-600">
                          {propiedad.telefonoContacto}
                        </span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                {/* Métricas de Espacios */}
                <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Espacios registrados</span>
                    <button
                      type="button"
                      onClick={() => onIrAEspacios(propiedad.id)}
                      title="Ver los espacios de este inmueble"
                      className="font-bold text-[#175E38] hover:text-[#124b2d] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>
                        {propiedad._count.unidades} {propiedad._count.unidades === 1 ? "espacio" : "espacios"}
                      </span>
                      <span className="text-[11px]">→</span>
                    </button>
                  </div>
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#175E38] h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, propiedad._count.unidades * 20))}%`,
                      }}
                    />
                  </div>
                </div>

                {propiedad.descripcion && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {propiedad.descripcion}
                  </p>
                )}
              </div>
            </div>

            {/* Footer de Acciones: Ver Espacios y Añadir Espacio (50/50) */}
            <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
              {/* Botón Ver Espacios */}
              <button
                type="button"
                onClick={() => onIrAEspacios(propiedad.id)}
                className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                title="Ver espacios en alquiler de este inmueble"
              >
                <Store className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                <span className="truncate">Ver Espacios ({propiedad._count.unidades})</span>
              </button>

              {/* Botón Añadir Espacio */}
              <button
                type="button"
                onClick={() => onAbrirCrearUnidad(propiedad.id)}
                className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
                title="Añadir nuevo espacio a este inmueble"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                <span className="truncate">Añadir Espacio</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
