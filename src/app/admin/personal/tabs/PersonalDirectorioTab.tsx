"use client";

import React from "react";
import { Building2, ChevronDown, Plus, Users, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmpleadoCard } from "../EmpleadoCard";
import type { EmpleadoItem } from "../types";
import {
  type GrupoDirectorio,
  getCornerSunConfig,
  getPropiedadBadge,
} from "./tab-helpers";

interface PersonalDirectorioTabProps {
  gruposDirectorio: GrupoDirectorio[];
  estaDesplegada: (id: string) => boolean;
  onToggleAcordeon: (id: string) => void;
  onNuevoEmpleado: (propiedadId?: string | null) => void;
  onEditarEmpleado: (emp: EmpleadoItem) => void;
  onToggleEstadoEmpleado: (emp: EmpleadoItem) => void;
  onVerDetalleEmpleado: (emp: EmpleadoItem) => void;
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onVerTareasEmpleado: (emp: EmpleadoItem) => void;
  isPending: boolean;
}

export function PersonalDirectorioTab({
  gruposDirectorio,
  estaDesplegada,
  onToggleAcordeon,
  onNuevoEmpleado,
  onEditarEmpleado,
  onToggleEstadoEmpleado,
  onVerDetalleEmpleado,
  onAsignarTarea,
  onRegistrarAsistencia,
  onVerTareasEmpleado,
  isPending,
}: PersonalDirectorioTabProps) {
  if (gruposDirectorio.length === 0) {
    return (
      <EmptyState
        title="No se encontraron trabajadores"
        description="No hay personal que coincida con los filtros seleccionados o la nómina aún está vacía."
        icon="users"
        action={{
          label: "Registrar Trabajador",
          onClick: () => onNuevoEmpleado(null),
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {gruposDirectorio.map((grupo) => {
        const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
        const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
        const abierta = estaDesplegada(grupo.id);
        const activosCount = grupo.empleados.filter((e) => e.activo).length;
        const inactivosCount = grupo.empleados.length - activosCount;

        return (
          <section
            key={grupo.id}
            className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-shadow duration-200 ${
              abierta ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
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
              title={abierta ? "Clic para contraer trabajadores" : "Clic para desplegar trabajadores"}
            >
              {/* Información Principal del Inmueble */}
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                  <Building2 className="w-5 h-5 text-black" />
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
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    {grupo.propiedad.ciudad && (
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{grupo.propiedad.ciudad}</span>
                        <span className="text-slate-300">·</span>
                      </span>
                    )}
                    <span className="font-extrabold text-[#175E38] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                      {activosCount} activo{activosCount !== 1 ? "s" : ""}
                    </span>
                    {inactivosCount > 0 && (
                      <span className="font-medium text-slate-400">
                        {inactivosCount} inactivo{inactivosCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-slate-700">
                      Total: {grupo.empleados.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones de la Cabecera */}
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
                    {abierta ? "Cerrar" : <><span className="hidden min-[380px]:inline">Ver </span>Trabajadores</>}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNuevoEmpleado(grupo.id === "GENERAL" ? null : grupo.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span><span className="hidden min-[400px]:inline">Registrar </span>Trabajador</span>
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
              <div className="overflow-hidden min-h-0 border-t border-slate-100">
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {grupo.empleados.map((emp) => (
                      <EmpleadoCard
                        key={emp.id}
                        empleado={emp}
                        onEditar={onEditarEmpleado}
                        onToggleEstado={onToggleEstadoEmpleado}
                        onVerDetalle={onVerDetalleEmpleado}
                        onAsignarTarea={onAsignarTarea}
                        onRegistrarAsistencia={onRegistrarAsistencia}
                        onVerTareas={onVerTareasEmpleado}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
