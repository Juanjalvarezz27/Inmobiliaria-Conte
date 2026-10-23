"use client";

import React from "react";
import {
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { EstadoAsistencia, CargoEmpleado } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { AsistenciaCard } from "../AsistenciaCard";
import type { EmpleadoItem, RegistroAsistenciaItem } from "../types";
import {
  type GrupoAsistencia,
  PAGE_SIZE_ASISTENCIA,
  getCornerSunConfig,
  getPropiedadBadge,
} from "./tab-helpers";

interface PersonalAsistenciaTabProps {
  gruposAsistencia: GrupoAsistencia[];
  estaDesplegada: (id: string) => boolean;
  onToggleAcordeon: (id: string) => void;
  paginasAsistencia: Record<string, number>;
  onCambiarPagina: (grupoId: string, nuevaPagina: number) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onAjustarMarcaje: (emp: EmpleadoItem, reg?: RegistroAsistenciaItem | null) => void;
  onMarcarSalida: (params: {
    id: string;
    empleadoNombre: string;
    empleadoCargo: CargoEmpleado;
    horaEntrada: string;
  }) => void;
  onVerFicha: (emp: EmpleadoItem) => void;
  isPending: boolean;
}

export function PersonalAsistenciaTab({
  gruposAsistencia,
  estaDesplegada,
  onToggleAcordeon,
  paginasAsistencia,
  onCambiarPagina,
  onRegistrarAsistencia,
  onAjustarMarcaje,
  onMarcarSalida,
  onVerFicha,
  isPending,
}: PersonalAsistenciaTabProps) {
  if (gruposAsistencia.length === 0) {
    return (
      <EmptyState
        title="Sin personal para asistencia"
        description="No hay trabajadores activos en el inmueble seleccionado o según los criterios de búsqueda."
        icon="clock"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {gruposAsistencia.map((grupo) => {
        const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
        const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
        const abierta = estaDesplegada(grupo.id);

        const registradosHoy = grupo.empleados.filter((e) => Boolean(e.asistenciaHoy)).length;
        const presentesHoy = grupo.empleados.filter(
          (e) =>
            e.asistenciaHoy?.estado === EstadoAsistencia.PRESENTE ||
            e.asistenciaHoy?.estado === EstadoAsistencia.RETARDO
        ).length;
        const justificadosHoy = grupo.empleados.filter(
          (e) =>
            e.asistenciaHoy?.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
            e.asistenciaHoy?.estado === EstadoAsistencia.PERMISO
        ).length;
        const ausentesHoy = grupo.empleados.filter(
          (e) => e.asistenciaHoy?.estado === EstadoAsistencia.FALTA_INJUSTIFICADA
        ).length;
        const sinMarcar = grupo.empleados.length - registradosHoy;

        // Paginación local por Inmueble
        const paginaActualAsis = paginasAsistencia[grupo.id] ?? 1;
        const totalPaginasAsis = Math.ceil(grupo.empleados.length / PAGE_SIZE_ASISTENCIA);
        const paginaSeguraAsis =
          totalPaginasAsis > 0 ? Math.min(Math.max(1, paginaActualAsis), totalPaginasAsis) : 1;
        const inicioAsis = (paginaSeguraAsis - 1) * PAGE_SIZE_ASISTENCIA;
        const finAsis = inicioAsis + PAGE_SIZE_ASISTENCIA;
        const empleadosPagina = grupo.empleados.slice(inicioAsis, finAsis);

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
              title={abierta ? "Clic para contraer asistencia" : "Clic para desplegar asistencia"}
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                  <Clock className="w-5 h-5 text-black" />
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

                  {/* Conteo de Asistencia */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                      {grupo.empleados.length} {grupo.empleados.length === 1 ? "trabajador" : "trabajadores"}
                    </span>
                    {presentesHoy > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                        {presentesHoy} {presentesHoy > 1 ? "presentes" : "presente"}
                      </span>
                    )}
                    {justificadosHoy > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/70">
                        {justificadosHoy} {justificadosHoy > 1 ? "justificados" : "justificado"}
                      </span>
                    )}
                    {ausentesHoy > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200/70">
                        {ausentesHoy} {ausentesHoy > 1 ? "ausentes" : "ausente"}
                      </span>
                    )}
                    {sinMarcar > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                        {sinMarcar} sin marcar
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
                    {abierta ? "Cerrar" : <><span className="hidden min-[380px]:inline">Ver </span>Asistencia</>}
                  </span>
                </div>

                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200/90 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
                  {registradosHoy} de {grupo.empleados.length} hoy
                </span>
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
                  {empleadosPagina.map((emp) => (
                    <AsistenciaCard
                      key={emp.id}
                      empleado={emp}
                      onRegistrarAsistencia={onRegistrarAsistencia}
                      onAjustarMarcaje={onAjustarMarcaje}
                      onMarcarSalida={onMarcarSalida}
                      onVerFicha={onVerFicha}
                      isPending={isPending}
                    />
                  ))}
                </div>

                {/* Controles de paginación */}
                {grupo.empleados.length > 0 && (
                  <div className="pt-4 mt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <p className="text-slate-500 font-medium shrink-0">
                      Mostrando{" "}
                      <strong className="text-slate-800 font-bold">{inicioAsis + 1}</strong> a{" "}
                      <strong className="text-slate-800 font-bold">
                        {Math.min(finAsis, grupo.empleados.length)}
                      </strong>{" "}
                      de <strong className="text-slate-800 font-bold">{grupo.empleados.length}</strong>{" "}
                      {grupo.empleados.length === 1 ? "trabajador" : "trabajadores"}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      {/* Anterior */}
                      <button
                        type="button"
                        disabled={paginaSeguraAsis === 1}
                        onClick={() => onCambiarPagina(grupo.id, paginaSeguraAsis - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Números de página */}
                      {Array.from({ length: Math.max(1, totalPaginasAsis) }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPaginasAsis <= 5) return true;
                          return p === 1 || p === totalPaginasAsis || Math.abs(p - paginaSeguraAsis) <= 1;
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
                                paginaSeguraAsis === item
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
                        disabled={paginaSeguraAsis === totalPaginasAsis || totalPaginasAsis <= 1}
                        onClick={() => onCambiarPagina(grupo.id, paginaSeguraAsis + 1)}
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
