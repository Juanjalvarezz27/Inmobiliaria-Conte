"use client";

import React, { useState } from "react";
import { Plus, Loader2, Clock, AlertTriangle } from "lucide-react";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { formatearFechaEspanol, formatearHora24 as formatearHora } from "@/lib/date-utils";
import { ESTADO_ASISTENCIA_CONFIG, type EmpleadoItem, type RegistroAsistenciaItem } from "../types";

const ITEMS_POR_PAGINA = 10;

interface EmpleadoAsistenciasSectionProps {
  emp: EmpleadoItem;
  listaAsistencias: RegistroAsistenciaItem[];
  cargandoHistorial: boolean;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onEditarAsistencia?: (emp: EmpleadoItem, registro: RegistroAsistenciaItem) => void;
}

export function EmpleadoAsistenciasSection({
  emp,
  listaAsistencias,
  cargandoHistorial,
  onRegistrarAsistencia,
  onEditarAsistencia,
}: EmpleadoAsistenciasSectionProps) {
  const [paginaAsistencias, setPaginaAsistencias] = useState(1);

  const totalPaginasAsistencias = Math.ceil(listaAsistencias.length / ITEMS_POR_PAGINA);
  const indiceInicioAsistencias = (paginaAsistencias - 1) * ITEMS_POR_PAGINA;
  const asistenciasPaginadas = listaAsistencias.slice(
    indiceInicioAsistencias,
    indiceInicioAsistencias + ITEMS_POR_PAGINA
  );

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
            Asistencias
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#175E38] text-white font-mono shadow-2xs">
            {listaAsistencias.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRegistrarAsistencia(emp)}
          className="h-8.5 px-3 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[2px] border-b-[#0e3a23] shadow-xs active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Registrar</span>
        </button>
      </div>

      {cargandoHistorial ? (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-[#175E38]" />
          <span className="text-xs font-medium">Cargando...</span>
        </div>
      ) : listaAsistencias.length === 0 ? (
        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
          <p className="text-xs font-bold text-slate-600">Sin asistencias registradas</p>
          <button
            type="button"
            onClick={() => onRegistrarAsistencia(emp)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Registrar Marcaje</span>
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {asistenciasPaginadas.map((asist) => {
              const cfg = ESTADO_ASISTENCIA_CONFIG[asist.estado] || ESTADO_ASISTENCIA_CONFIG.PRESENTE;
              const esOlvido =
                asist.ubicacionSalida?.includes("Automático") ||
                asist.ubicacionSalida?.includes("Olvido") ||
                asist.observaciones?.includes("automático") ||
                asist.observaciones?.includes("Cierre automático");

              return (
                <div
                  key={asist.id}
                  className={`bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 ${
                    esOlvido ? "border-amber-200/90 bg-amber-50/20" : "border-slate-200/90"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black font-heading text-slate-900">
                        {formatearFechaEspanol(asist.fecha)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                      {esOlvido && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Olvido de salida</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                        <span>Entrada: {formatearHora(asist.horaEntrada)}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      {esOlvido ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded">
                          <span>Salida: {asist.horaSalida ? formatearHora(asist.horaSalida) : "11:59 p. m."} (Auto)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {asist.horaSalida ? `Salida: ${formatearHora(asist.horaSalida)}` : "En curso"}
                        </span>
                      )}
                    </div>

                    {esOlvido && (
                      <p className="text-[11px] text-amber-700 italic mt-0.5">
                        Cierre automático a medianoche: el colaborador no registró marcaje de salida.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onEditarAsistencia) {
                        onEditarAsistencia(emp, asist);
                      } else {
                        onRegistrarAsistencia(emp);
                      }
                    }}
                    className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1 shrink-0 active:translate-y-0.5"
                    title="Ajustar marcaje de esta fecha"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ajustar</span>
                  </button>
                </div>
              );
            })}
          </div>

          <PaginacionLocal
            paginaActual={paginaAsistencias}
            totalPaginas={totalPaginasAsistencias}
            totalItems={listaAsistencias.length}
            indiceInicio={indiceInicioAsistencias}
            itemsPorPagina={ITEMS_POR_PAGINA}
            itemLabel="asistencias"
            onCambiarPagina={setPaginaAsistencias}
          />
        </>
      )}
    </div>
  );
}
