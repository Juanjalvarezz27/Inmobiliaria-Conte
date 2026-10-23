"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { formatearFechaEspanol } from "@/lib/date-utils";
import { ESTADO_ASISTENCIA_CONFIG, type EmpleadoItem, type RegistroAsistenciaItem } from "../types";

const ITEMS_POR_PAGINA = 10;

interface EmpleadoInasistenciasSectionProps {
  emp: EmpleadoItem;
  listaInasistencias: RegistroAsistenciaItem[];
  cargandoHistorial: boolean;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onEditarAsistencia?: (emp: EmpleadoItem, registro: RegistroAsistenciaItem) => void;
}

export function EmpleadoInasistenciasSection({
  emp,
  listaInasistencias,
  cargandoHistorial,
  onRegistrarAsistencia,
  onEditarAsistencia,
}: EmpleadoInasistenciasSectionProps) {
  const [paginaInasistencias, setPaginaInasistencias] = useState(1);

  const totalPaginasInasistencias = Math.ceil(listaInasistencias.length / ITEMS_POR_PAGINA);
  const indiceInicioInasistencias = (paginaInasistencias - 1) * ITEMS_POR_PAGINA;
  const inasistenciasPaginadas = listaInasistencias.slice(
    indiceInicioInasistencias,
    indiceInicioInasistencias + ITEMS_POR_PAGINA
  );

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
            Inasistencias
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white font-mono shadow-2xs">
            {listaInasistencias.length}
          </span>
        </div>
      </div>

      {cargandoHistorial ? (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
          <span className="text-xs font-medium">Cargando...</span>
        </div>
      ) : listaInasistencias.length === 0 ? (
        <div className="p-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#175E38] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-emerald-950">Sin inasistencias registradas</h4>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {inasistenciasPaginadas.map((inasist) => {
              const esAutomatica = inasist.observaciones?.includes("Inasistencia automática");
              const cfg = ESTADO_ASISTENCIA_CONFIG[inasist.estado] || ESTADO_ASISTENCIA_CONFIG.FALTA_INJUSTIFICADA;

              return (
                <div
                  key={inasist.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black font-heading text-slate-900">
                        {formatearFechaEspanol(inasist.fecha)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          esAutomatica
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : cfg.badgeClass
                        }`}
                      >
                        {esAutomatica ? "Sin marcar" : cfg.label}
                      </span>
                    </div>

                    {!esAutomatica && inasist.observaciones ? (
                      <p className="text-xs text-slate-500 line-clamp-1">{inasist.observaciones}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Jornada sin registro de entrada</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onEditarAsistencia) {
                        onEditarAsistencia(emp, inasist);
                      } else {
                        onRegistrarAsistencia(emp);
                      }
                    }}
                    className="h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-white bg-[#175E38] hover:bg-[#124b2d] border-b-[2px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Registrar marcaje si el colaborador asistió este día"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>
                      <span className="hidden min-[380px]:inline">Regularizar</span>
                      <span className="min-[380px]:hidden">Ajustar</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <PaginacionLocal
            paginaActual={paginaInasistencias}
            totalPaginas={totalPaginasInasistencias}
            totalItems={listaInasistencias.length}
            indiceInicio={indiceInicioInasistencias}
            itemsPorPagina={ITEMS_POR_PAGINA}
            itemLabel="inasistencias"
            onCambiarPagina={setPaginaInasistencias}
          />
        </>
      )}
    </div>
  );
}
