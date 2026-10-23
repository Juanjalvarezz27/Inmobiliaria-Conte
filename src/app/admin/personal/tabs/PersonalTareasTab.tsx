"use client";

import React from "react";
import {
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
} from "lucide-react";
import { EstadoTarea } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { TareaCard } from "../TareaCard";
import type { TareaEmpleadoItem } from "../types";
import {
  type GrupoTareas,
  PAGE_SIZE_TAREAS,
  getCornerSunConfig,
  getPropiedadBadge,
} from "./tab-helpers";

interface PersonalTareasTabProps {
  gruposTareas: GrupoTareas[];
  estaDesplegada: (id: string) => boolean;
  onToggleAcordeon: (id: string) => void;
  paginasTareas: Record<string, number>;
  onCambiarPagina: (grupoId: string, nuevaPagina: number) => void;
  onNuevaTarea: (propiedadId?: string | null) => void;
  onVerDetalleTarea: (tarea: TareaEmpleadoItem) => void;
}

export function PersonalTareasTab({
  gruposTareas,
  estaDesplegada,
  onToggleAcordeon,
  paginasTareas,
  onCambiarPagina,
  onNuevaTarea,
  onVerDetalleTarea,
}: PersonalTareasTabProps) {
  if (gruposTareas.length === 0) {
    return (
      <EmptyState
        title="No hay tareas asignadas"
        description="No hay labores operativas con el filtro seleccionado. Puedes crear una nueva orden de trabajo con responsable y fecha límite."
        icon="wrench"
        action={{
          label: "Asignar Nueva Tarea",
          onClick: () => onNuevaTarea(null),
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {gruposTareas.map((grupo) => {
        const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
        const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
        const abierta = estaDesplegada(grupo.id);

        const pendientesCount = grupo.tareas.filter((t) => t.estado === EstadoTarea.PENDIENTE).length;
        const completadasCount = grupo.tareas.filter((t) => t.estado === EstadoTarea.COMPLETADA).length;

        // Paginación local por Inmueble
        const paginaActual = paginasTareas[grupo.id] ?? 1;
        const totalPaginas = Math.ceil(grupo.tareas.length / PAGE_SIZE_TAREAS);
        const paginaSegura =
          totalPaginas > 0 ? Math.min(Math.max(1, paginaActual), totalPaginas) : 1;
        const inicio = (paginaSegura - 1) * PAGE_SIZE_TAREAS;
        const fin = inicio + PAGE_SIZE_TAREAS;
        const tareasPagina = grupo.tareas.slice(inicio, fin);

        return (
          <section
            key={grupo.id}
            className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-shadow duration-200 ${
              abierta ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
            }`}
          >
            {/* Sol decorativo */}
            <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
              <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
              <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
              <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/acordeon:scale-125`} />
            </div>

            {/* Cabecera del Inmueble */}
            <div
              onClick={() => onToggleAcordeon(grupo.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleAcordeon(grupo.id);
                }
              }}
              className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
              title={abierta ? "Clic para contraer órdenes de trabajo" : "Clic para desplegar órdenes de trabajo"}
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                  <Wrench className="w-5 h-5 text-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                      {grupo.propiedad.nombre}
                    </h3>
                    {badgeConfig && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeConfig.bg}`}>
                        {badgeConfig.label}
                      </span>
                    )}
                  </div>
                  {grupo.propiedad.ciudad && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{grupo.propiedad.ciudad}</span>
                    </p>
                  )}

                  {/* Conteo de Tareas */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                      {grupo.tareas.length} {grupo.tareas.length === 1 ? "orden" : "órdenes"}
                    </span>
                    {pendientesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/70">
                        {pendientesCount} pendiente{pendientesCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {completadasCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                        {completadasCount} completada{completadasCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors shrink-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-transform duration-200 ease-out shadow-2xs ${
                      abierta ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 select-none">
                    {abierta ? "Cerrar" : <><span className="hidden min-[380px]:inline">Ver </span>Órdenes</>}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNuevaTarea(grupo.id === "GENERAL" ? null : grupo.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span><span className="hidden min-[400px]:inline">Asignar </span>Tarea</span>
                </button>
              </div>
            </div>

            {/* Contenedor Animado con CSS Grid */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                abierta
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden min-h-0 border-t border-slate-100 p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tareasPagina.map((t) => (
                    <TareaCard
                      key={t.id}
                      tarea={t}
                      onVerDetalle={onVerDetalleTarea}
                    />
                  ))}
                </div>

                {/* Controles de paginación */}
                {grupo.tareas.length > 0 && (
                  <div className="pt-4 mt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <p className="text-slate-500 font-medium shrink-0">
                      Mostrando{" "}
                      <strong className="text-slate-800 font-bold">{inicio + 1}</strong> a{" "}
                      <strong className="text-slate-800 font-bold">
                        {Math.min(fin, grupo.tareas.length)}
                      </strong>{" "}
                      de <strong className="text-slate-800 font-bold">{grupo.tareas.length}</strong>{" "}
                      {grupo.tareas.length === 1 ? "orden" : "órdenes"}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      {/* Anterior */}
                      <button
                        type="button"
                        disabled={paginaSegura === 1}
                        onClick={() => onCambiarPagina(grupo.id, paginaSegura - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Números de página */}
                      {Array.from({ length: Math.max(1, totalPaginas) }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPaginas <= 5) return true;
                          return p === 1 || p === totalPaginas || Math.abs(p - paginaSegura) <= 1;
                        })
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (
                            idx > 0 &&
                            typeof arr[idx - 1] === "number" &&
                            (p as number) - (arr[idx - 1] as number) > 1
                          ) {
                            acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === "..." ? (
                            <span
                              key={`ellipsis-${idx}`}
                              className="w-8 h-8 flex items-center justify-center text-xs text-slate-400"
                            >
                              ···
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => onCambiarPagina(grupo.id, item as number)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                paginaSegura === item
                                  ? "bg-[#175E38] text-white shadow-xs"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              {item}
                            </button>
                          )
                        )}

                      {/* Siguiente */}
                      <button
                        type="button"
                        disabled={paginaSegura === totalPaginas || totalPaginas <= 1}
                        onClick={() => onCambiarPagina(grupo.id, paginaSegura + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
