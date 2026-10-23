"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Layers,
  ChevronDown,
  Check,
  FileText,
  Plus,
  Camera,
  Building2,
  Calendar,
  Eye,
} from "lucide-react";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { ESTADO_TAREA_CONFIG, type EmpleadoItem, type TareaEmpleadoItem } from "../types";

export type FiltroTareasTipo = "TODAS" | "ACTIVAS" | "COMPLETADAS" | "CANCELADAS";

const ITEMS_POR_PAGINA = 10;

interface EmpleadoTareasSectionProps {
  emp: EmpleadoItem;
  tareasEmpleado: TareaEmpleadoItem[];
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onSeleccionarTarea: (tarea: TareaEmpleadoItem) => void;
  onClose: () => void;
}

export function EmpleadoTareasSection({
  emp,
  tareasEmpleado,
  onAsignarTarea,
  onSeleccionarTarea,
  onClose,
}: EmpleadoTareasSectionProps) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTareasTipo>("TODAS");
  const [busquedaTarea, setBusquedaTarea] = useState("");
  const [paginaTareas, setPaginaTareas] = useState(1);
  const [dropdownFiltroOpen, setDropdownFiltroOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera o pulsar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownFiltroOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDropdownFiltroOpen(false);
    }
    if (dropdownFiltroOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownFiltroOpen]);

  useEffect(() => {
    setPaginaTareas(1);
  }, [filtroTipo, busquedaTarea]);

  // Conteo de tareas por filtro
  const conteoTareas = useMemo(() => {
    const activas = tareasEmpleado.filter(
      (t) => t.estado === "PENDIENTE" || t.estado === "EN_PROCESO"
    ).length;
    const completadas = tareasEmpleado.filter((t) => t.estado === "COMPLETADA").length;
    const canceladas = tareasEmpleado.filter((t) => t.estado === "CANCELADA").length;
    return {
      TODAS: tareasEmpleado.length,
      ACTIVAS: activas,
      COMPLETADAS: completadas,
      CANCELADAS: canceladas,
    };
  }, [tareasEmpleado]);

  const opcionesFiltro: Array<{ value: FiltroTareasTipo; label: string; count: number }> = [
    { value: "TODAS", label: "Todas las tareas", count: conteoTareas.TODAS },
    { value: "ACTIVAS", label: "En Curso / Pendientes", count: conteoTareas.ACTIVAS },
    { value: "COMPLETADAS", label: "Completadas", count: conteoTareas.COMPLETADAS },
    { value: "CANCELADAS", label: "Canceladas", count: conteoTareas.CANCELADAS },
  ];

  const opcionSeleccionada =
    opcionesFiltro.find((o) => o.value === filtroTipo) || opcionesFiltro[0];

  // Filtrar tareas por tipo y búsqueda
  const tareasFiltradas = useMemo(() => {
    return tareasEmpleado.filter((t) => {
      if (filtroTipo === "ACTIVAS" && t.estado !== "PENDIENTE" && t.estado !== "EN_PROCESO") {
        return false;
      }
      if (filtroTipo === "COMPLETADAS" && t.estado !== "COMPLETADA") {
        return false;
      }
      if (filtroTipo === "CANCELADAS" && t.estado !== "CANCELADA") {
        return false;
      }
      if (busquedaTarea.trim()) {
        const query = busquedaTarea.toLowerCase().trim();
        const matchTitulo = t.titulo.toLowerCase().includes(query);
        const matchDesc = t.descripcion?.toLowerCase().includes(query);
        const matchProp = t.propiedadNombre?.toLowerCase().includes(query);
        return matchTitulo || matchDesc || matchProp;
      }
      return true;
    });
  }, [tareasEmpleado, filtroTipo, busquedaTarea]);

  const totalPaginasTareas = Math.ceil(tareasFiltradas.length / ITEMS_POR_PAGINA);
  const indiceInicioTareas = (paginaTareas - 1) * ITEMS_POR_PAGINA;
  const tareasPaginadas = tareasFiltradas.slice(
    indiceInicioTareas,
    indiceInicioTareas + ITEMS_POR_PAGINA
  );

  return (
    <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
      {/* Cabecera de la sección con Desplegable de Filtro y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
            Órdenes de Trabajo
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#175E38] text-white font-mono shadow-2xs">
            {tareasFiltradas.length}
          </span>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 w-full sm:w-auto">
          {/* Buscador de Tareas */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busquedaTarea}
              onChange={(e) => setBusquedaTarea(e.target.value)}
              placeholder="Buscar orden..."
              className="w-full h-10 sm:h-9.5 pl-8 pr-3 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all shadow-2xs"
            />
          </div>

          {/* Selector Desplegable Híbrido */}
          <div className="relative flex-1 sm:w-52" ref={dropdownRef}>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as FiltroTareasTipo)}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar tareas"
            >
              {opcionesFiltro.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setDropdownFiltroOpen((prev) => !prev)}
              className="w-full h-9.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-between gap-1.5 shadow-2xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{opcionSeleccionada.label}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {opcionSeleccionada.count}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    dropdownFiltroOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {dropdownFiltroOpen && (
              <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                {opcionesFiltro.map((opt) => {
                  const activa = opt.value === filtroTipo;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFiltroTipo(opt.value);
                        setDropdownFiltroOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        activa
                          ? "bg-slate-50 text-slate-900 font-bold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {opt.count}
                        </span>
                        {activa && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listado de Tareas */}
      {tareasFiltradas.length === 0 ? (
        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700">No se encontraron órdenes de trabajo</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {busquedaTarea.trim()
                ? "No hay tareas que coincidan con el término de búsqueda."
                : "No hay tareas registradas para el filtro seleccionado."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onAsignarTarea(emp);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Asignar Nueva Tarea</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tareasPaginadas.map((t) => {
            const estadoCfg = ESTADO_TAREA_CONFIG[t.estado];

            return (
              <div
                key={t.id}
                onClick={() => {
                  onClose();
                  onSeleccionarTarea(t);
                }}
                className="group p-3.5 sm:p-4 bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer select-none hover:-translate-y-0.5"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 tracking-tight truncate group-hover:text-[#175E38] transition-colors">
                      {t.titulo}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${estadoCfg.badgeClass}`}
                    >
                      {estadoCfg.label}
                    </span>
                    {t.evidencias.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                        <Camera className="w-3 h-3" />
                        <span>{t.evidencias.length}</span>
                      </span>
                    ) : t.requiereEvidencia ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-md"
                        title="Requiere foto de evidencia al completar"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Requiere foto</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {t.propiedadNombre || "Sede General"}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Límite:{" "}
                        <strong className="text-slate-700 font-semibold">
                          {t.fechaLimite
                            ? new Date(t.fechaLimite).toLocaleDateString("es-VE", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Sin límite"}
                        </strong>
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onSeleccionarTarea(t);
                    }}
                    className="h-8.5 sm:h-9 px-3 sm:px-3.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] group-hover:bg-[#175E38] transition-all cursor-pointer shadow-2xs active:translate-y-0.5 flex items-center gap-1.5"
                    title="Abrir gestión completa de la orden"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ver Ficha</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación Local */}
      <PaginacionLocal
        paginaActual={paginaTareas}
        totalPaginas={totalPaginasTareas}
        totalItems={tareasFiltradas.length}
        indiceInicio={indiceInicioTareas}
        itemsPorPagina={ITEMS_POR_PAGINA}
        itemLabel="órdenes"
        onCambiarPagina={setPaginaTareas}
      />
    </div>
  );
}
