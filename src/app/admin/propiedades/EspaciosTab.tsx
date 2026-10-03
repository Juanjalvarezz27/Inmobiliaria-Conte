"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { TipoPropiedad, EstadoUnidad } from "@prisma/client";
import {
  Store,
  Plus,
  Search,
  Building2,
  Tag,
  ChevronDown,
  Check,
  Layers3,
  Maximize2,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  Camera,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  tipoPropiedadBadgeConfig,
  tipoPropiedadCornerSun,
  TIPO_UNIDAD_LABEL,
  formatCurrency,
} from "./constants";
import type { PropiedadConConteo, UnidadConPropiedad } from "./types";

interface GrupoPropiedad {
  propiedad: {
    id: string;
    nombre: string;
    ciudad: string;
    tipo: TipoPropiedad;
    direccion?: string | null;
  };
  unidades: UnidadConPropiedad[];
}

interface EspaciosTabProps {
  unidades: UnidadConPropiedad[];
  unidadesFiltradas: UnidadConPropiedad[];
  propiedades: PropiedadConConteo[];
  gruposPorPropiedad: GrupoPropiedad[];
  busqueda: string;
  filtroPropiedad: string;
  propiedadActivaFiltro: {
    id: string;
    nombre: string;
    ciudad: string;
    tipo: TipoPropiedad;
    count: number;
  } | null;
  propiedadesDesplegadas: Record<string, boolean>;
  propiedadesCargadas: Record<string, boolean>;
  paginasPorPropiedad: Record<string, number>;
  isPending: boolean;
  onToggleDesplieguePropiedad: (propId: string) => void;
  onChangePaginaPropiedad: (propId: string, page: number) => void;
  onSetFiltroPropiedad: (val: string) => void;
  onLimpiarBusqueda: () => void;
  onAbrirCrearUnidad: (propiedadId?: string) => void;
  onAbrirCrearPropiedad: () => void;
  onAbrirDetalleUnidad: (unidad: UnidadConPropiedad) => void;
  onEditarUnidad: (unidad: UnidadConPropiedad) => void;
  onEliminarUnidad: (unidad: UnidadConPropiedad) => void;
  onCambiarEstadoUnidad: (unidad: UnidadConPropiedad, estado: EstadoUnidad) => void;
  onIrAPropiedadesTab: () => void;
}

const PAGE_SIZE = 15;

// Vista de espacios y locales agrupados por inmueble con acordeón suave
export function EspaciosTab({
  unidades,
  unidadesFiltradas,
  propiedades,
  gruposPorPropiedad,
  busqueda,
  filtroPropiedad,
  propiedadActivaFiltro,
  propiedadesDesplegadas,
  propiedadesCargadas,
  paginasPorPropiedad,
  isPending,
  onToggleDesplieguePropiedad,
  onChangePaginaPropiedad,
  onSetFiltroPropiedad,
  onLimpiarBusqueda,
  onAbrirCrearUnidad,
  onAbrirCrearPropiedad,
  onAbrirDetalleUnidad,
  onEditarUnidad,
  onEliminarUnidad,
  onCambiarEstadoUnidad,
  onIrAPropiedadesTab,
}: EspaciosTabProps) {
  // Menú rápido de estado de espacio
  const [menuEstadoUnidadId, setMenuEstadoUnidadId] = useState<string | null>(null);

  // Cerrar menú rápido al hacer click afuera o presionar Escape
  useEffect(() => {
    if (!menuEstadoUnidadId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-menu-estado]")) {
        setMenuEstadoUnidadId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuEstadoUnidadId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuEstadoUnidadId]);

  // Sin espacios registrados en total
  if (unidades.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-12 border border-slate-200/90 shadow-sm text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <Store className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 font-heading">
          Sin espacios registrados
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          {propiedades.length === 0
            ? "Para registrar espacios o locales, primero necesitas dar de alta al menos una propiedad o complejo."
            : "Comienza registrando los locales, apartamentos u oficinas de tus propiedades para poder gestionar sus contratos y fotografías."}
        </p>
        <div className="pt-2">
          {propiedades.length > 0 ? (
            <button
              onClick={() => onAbrirCrearUnidad()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Primer Espacio
            </button>
          ) : (
            <button
              onClick={() => {
                onIrAPropiedadesTab();
                onAbrirCrearPropiedad();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C2539] text-white text-sm font-semibold hover:bg-[#2a3754] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Primera Propiedad
            </button>
          )}
        </div>
      </div>
    );
  }

  // Helper para renderizar cada tarjeta de espacio
  const renderUnidadCard = (unidad: UnidadConPropiedad) => (
    <div
      key={unidad.id}
      className="group/unitcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Header Visual: Foto Principal o Cabecera Decorativa */}
      {unidad.imagenes && unidad.imagenes.length > 0 ? (
        <div
          onClick={() => onAbrirDetalleUnidad(unidad)}
          className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 border-b border-slate-100 cursor-pointer group/img"
          title="Clic para ver detalle y fotos"
        >
          <Image
            src={unidad.imagenes[0]}
            alt={`Foto de ${unidad.codigo}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            loading="lazy"
            className="object-cover group-hover/unitcard:scale-105 transition-transform duration-300"
          />

          {/* Overlay sutil al pasar el mouse */}
          <div className="absolute inset-0 bg-slate-950/0 group-hover/img:bg-slate-950/25 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover/img:opacity-100 transition-opacity px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 shadow-md">
              <Eye className="w-3.5 h-3.5" />
              Ver detalle y fotos
            </span>
          </div>

          {/* Badge de Tipo en esquina superior izquierda */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-white/95 text-slate-800 shadow-md backdrop-blur-xs border border-slate-200/60">
              <Tag className="w-3 h-3 text-[#175E38]" />
              {TIPO_UNIDAD_LABEL[unidad.tipo]}
            </span>
          </div>

          {/* Badge de Estado en esquina superior derecha */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <Badge variant={unidad.estado} dot size="sm" className="shadow-md backdrop-blur-xs bg-white/95">
              {unidad.estado === "DISPONIBLE"
                ? "Disponible"
                : unidad.estado === "OCUPADO"
                ? "Ocupado"
                : unidad.estado === "MANTENIMIENTO"
                ? "Mantenimiento"
                : "Inactivo"}
            </Badge>
          </div>

          {/* Indicador de fotos múltiples */}
          {unidad.imagenes.length > 1 && (
            <div className="absolute bottom-2 right-2 z-10 bg-slate-950/75 group-hover/img:bg-[#175E38] text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs transition-colors">
              <Camera className="w-3 h-3" />
              <span>{unidad.imagenes.length}</span>
            </div>
          )}
        </div>
      ) : (
        /* Header alternativo sin foto pero con estética premium */
        <div
          onClick={() => onAbrirDetalleUnidad(unidad)}
          className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-200/40 border-b border-slate-100 flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
          title="Clic para ver detalle"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs">
              <Store className="w-5 h-5 text-slate-500" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-slate-800 shadow-2xs border border-slate-200/60">
              <Tag className="w-3.5 h-3.5 text-[#175E38]" />
              {TIPO_UNIDAD_LABEL[unidad.tipo]}
            </span>
          </div>
          <Badge variant={unidad.estado} dot size="sm">
            {unidad.estado === "DISPONIBLE"
              ? "Disponible"
              : unidad.estado === "OCUPADO"
              ? "Ocupado"
              : unidad.estado === "MANTENIMIENTO"
              ? "Mantenimiento"
              : "Inactivo"}
          </Badge>
        </div>
      )}

      {/* Cuerpo de la Tarjeta */}
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight group-hover:text-slate-950 transition-colors">
              {unidad.codigo}
            </h3>
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1 truncate">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{unidad.propiedad.nombre} · {unidad.propiedad.ciudad}</span>
            </p>
          </div>

          {/* Chips de especificaciones (Piso y Área) */}
          {(unidad.piso || unidad.areaMt2) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {unidad.piso && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70">
                  <Layers3 className="w-3 h-3 text-slate-400 shrink-0" />
                  {unidad.piso}
                </span>
              )}
              {unidad.areaMt2 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70">
                  <Maximize2 className="w-3 h-3 text-slate-400 shrink-0" />
                  {unidad.areaMt2} m²
                </span>
              )}
            </div>
          )}

          {unidad.descripcion && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
              {unidad.descripcion}
            </p>
          )}
        </div>

        {/* Caja destacada de Precio Mensual */}
        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs text-slate-500 font-medium">Precio Mensual</span>
          <span className="text-base sm:text-lg font-black text-slate-900 font-heading">
            {formatCurrency(unidad.precioAlquiler)}
          </span>
        </div>
      </div>

      {/* Footer de Acciones */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 flex items-center justify-between gap-2 relative z-10">
        {/* Menú rápido para cambiar estado */}
        {(() => {
          const estaMenuAbierto = menuEstadoUnidadId === unidad.id;
          return (
            <div className="relative" data-menu-estado>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuEstadoUnidadId(estaMenuAbierto ? null : unidad.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none ${
                  estaMenuAbierto
                    ? "bg-slate-900 text-white border border-slate-900 shadow-xs"
                    : "text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span>Estado</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    estaMenuAbierto ? "rotate-180 text-white" : "text-slate-400"
                  }`}
                />
              </button>

              {estaMenuAbierto && (
                <div className="absolute left-0 bottom-full pb-1.5 z-40 animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="bg-white border border-slate-200/95 rounded-xl shadow-xl min-w-[155px] p-1.5 space-y-0.5">
                    {(["DISPONIBLE", "OCUPADO", "MANTENIMIENTO", "INACTIVO"] as EstadoUnidad[]).map((est) => (
                      <button
                        key={est}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCambiarEstadoUnidad(unidad, est);
                          setMenuEstadoUnidadId(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                          unidad.estado === est
                            ? "bg-emerald-50 text-[#175E38] font-bold"
                            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                        }`}
                      >
                        <span>
                          {est === "DISPONIBLE"
                            ? "Disponible"
                            : est === "OCUPADO"
                            ? "Ocupado"
                            : est === "MANTENIMIENTO"
                            ? "Mantenimiento"
                            : "Inactivo"}
                        </span>
                        {unidad.estado === est && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Botones Ver Detalle, Editar y Eliminar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ver detalle de espacio */}
          <div className="relative group/btn">
            <button
              type="button"
              onClick={() => onAbrirDetalleUnidad(unidad)}
              title="Ver detalle y fotos"
              aria-label="Ver detalle y fotos"
              className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1C2539] text-white text-[10px] font-semibold rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
              <span>Ver detalle</span>
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C2539]" />
            </div>
          </div>

          {/* Editar espacio */}
          <div className="relative group/btn">
            <button
              type="button"
              onClick={() => onEditarUnidad(unidad)}
              disabled={isPending}
              title="Editar espacio"
              aria-label="Editar espacio"
              className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1C2539] text-white text-[10px] font-semibold rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
              <span>Editar</span>
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C2539]" />
            </div>
          </div>

          {/* Eliminar espacio */}
          <div className="relative group/btn">
            <button
              type="button"
              onClick={() => onEliminarUnidad(unidad)}
              disabled={isPending}
              title="Eliminar espacio"
              aria-label="Eliminar espacio"
              className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1C2539] text-white text-[10px] font-semibold rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
              <span>Eliminar</span>
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C2539]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Sin coincidencias de búsqueda o filtro
  if (unidadesFiltradas.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/90 shadow-2xs text-center space-y-2.5">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Search className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800">No se encontraron espacios</h4>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          {busqueda
            ? `No hay espacios que coincidan con "${busqueda}". Prueba limpiando el buscador.`
            : "No hay espacios registrados en el inmueble seleccionado."}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
          {busqueda && (
            <button
              type="button"
              onClick={onLimpiarBusqueda}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100/80 rounded-lg border border-emerald-200/70 transition-all cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          )}
          {filtroPropiedad !== "TODAS" && (
            <button
              type="button"
              onClick={() => onSetFiltroPropiedad("TODAS")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#1C2539] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all cursor-pointer"
            >
              Ver todos los inmuebles
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner sutil cuando se está filtrando por un inmueble específico */}
      {filtroPropiedad !== "TODAS" && propiedadActivaFiltro && (
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50/70 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1C2539] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Filtrando por inmueble</p>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                {propiedadActivaFiltro.nombre} · <span className="text-slate-500 font-normal">{propiedadActivaFiltro.ciudad}</span>
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAbrirCrearUnidad(propiedadActivaFiltro.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-semibold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir espacio aquí</span>
            </button>
            <button
              type="button"
              onClick={() => onSetFiltroPropiedad("TODAS")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ver todos</span>
            </button>
          </div>
        </div>
      )}

      {/* Vista Agrupada por Inmueble con Acordeón Suave */}
      <div className="space-y-4 sm:space-y-5">
        {gruposPorPropiedad.map((grupo) => {
          const prop = grupo.propiedad;
          const badgeConfig = tipoPropiedadBadgeConfig(prop.tipo);
          const cornerSun = tipoPropiedadCornerSun(prop.tipo);
          const IconComp = badgeConfig.icon;
          const dispCount = grupo.unidades.filter((u) => u.estado === "DISPONIBLE").length;
          const ocupCount = grupo.unidades.filter((u) => u.estado === "OCUPADO").length;

          // Si hay búsqueda activa o filtro por inmueble, forzar visual abierto
          const estaDesplegada =
            busqueda.trim() !== "" ||
            filtroPropiedad !== "TODAS" ||
            !!propiedadesDesplegadas[prop.id];

          // Solo monta el DOM si el usuario hizo clic al menos una vez manualmente
          const haSidoMontada = !!propiedadesCargadas[prop.id];

          return (
            <section
              key={prop.id}
              className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300 ${
                estaDesplegada ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
              }`}
            >
              {/* Sol decorativo en esquina superior izquierda */}
              <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
                <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/acordeon:scale-125`} />
              </div>

              {/* Cabecera del Inmueble (Clickeable) */}
              <div
                onClick={() => onToggleDesplieguePropiedad(prop.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleDesplieguePropiedad(prop.id);
                  }
                }}
                className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
                title={estaDesplegada ? "Clic para cerrar espacios" : "Clic para desplegar espacios y fotos"}
              >
                {/* Información Principal */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                    <IconComp className="w-5 h-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                        {prop.nombre}
                      </h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeConfig.bg}`}>
                        {badgeConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{prop.ciudad}</span>
                      {prop.direccion && <span className="text-slate-400">· {prop.direccion}</span>}
                    </p>

                    {/* Conteo de Espacios */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                        {grupo.unidades.length} {grupo.unidades.length === 1 ? "espacio" : "espacios"}
                      </span>
                      {dispCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                          {dispCount} disp.
                        </span>
                      )}
                      {ocupCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/70">
                          {ocupCount} alquilado{ocupCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones: Desplegar a la izquierda y Agregar espacio a la derecha */}
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Botón Desplegable */}
                  <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                        estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 select-none">
                      {estaDesplegada ? "Cerrar" : "Ver espacios"}
                    </span>
                  </div>

                  {/* Botón Agregar espacio */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbrirCrearUnidad(prop.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Agregar espacio</span>
                  </button>
                </div>
              </div>

              {/* Contenedor Animado con CSS Grid */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  estaDesplegada
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  {haSidoMontada ? (() => {
                    const paginaActual = paginasPorPropiedad[prop.id] ?? 1;
                    const totalPaginas = Math.ceil(grupo.unidades.length / PAGE_SIZE);
                    const inicio = (paginaActual - 1) * PAGE_SIZE;
                    const fin = inicio + PAGE_SIZE;
                    const unidadesPagina = grupo.unidades.slice(inicio, fin);

                    return (
                      <div className="border-t border-slate-100">
                        {/* Grid de espacios de la página actual */}
                        <div className="p-4 sm:p-6 pt-2 sm:pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                            {unidadesPagina.map((unidad) => renderUnidadCard(unidad))}
                          </div>
                        </div>

                        {/* Controles de paginación */}
                        {totalPaginas > 1 && (
                          <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400 font-medium shrink-0">
                              {inicio + 1}–{Math.min(fin, grupo.unidades.length)} de{" "}
                              <span className="font-bold text-slate-600">{grupo.unidades.length}</span> espacios
                            </p>

                            <div className="flex items-center gap-1.5">
                              {/* Anterior */}
                              <button
                                type="button"
                                disabled={paginaActual === 1}
                                onClick={() => onChangePaginaPropiedad(prop.id, paginaActual - 1)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                aria-label="Página anterior"
                              >
                                <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                              </button>

                              {/* Números de página */}
                              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                .filter((p) => {
                                  if (totalPaginas <= 5) return true;
                                  return p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1;
                                })
                                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                                  if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                                    acc.push("...");
                                  }
                                  acc.push(p);
                                  return acc;
                                }, [])
                                .map((item, idx) =>
                                  item === "..." ? (
                                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">
                                      ···
                                    </span>
                                  ) : (
                                    <button
                                      key={item}
                                      type="button"
                                      onClick={() => onChangePaginaPropiedad(prop.id, item as number)}
                                      className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                                        item === paginaActual
                                          ? "bg-[#175E38] border-[#175E38] text-white shadow-sm"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                      }`}
                                      aria-label={`Ir a página ${item}`}
                                      aria-current={item === paginaActual ? "page" : undefined}
                                    >
                                      {item}
                                    </button>
                                  )
                                )}

                              {/* Siguiente */}
                              <button
                                type="button"
                                disabled={paginaActual === totalPaginas}
                                onClick={() => onChangePaginaPropiedad(prop.id, paginaActual + 1)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                aria-label="Página siguiente"
                              >
                                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })() : estaDesplegada ? (
                    <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center gap-3 text-slate-400">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center shrink-0">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-sm">
                        Haz clic en el inmueble para cargar sus{" "}
                        <span className="font-semibold">{grupo.unidades.length} {grupo.unidades.length === 1 ? "espacio" : "espacios"}</span>
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
