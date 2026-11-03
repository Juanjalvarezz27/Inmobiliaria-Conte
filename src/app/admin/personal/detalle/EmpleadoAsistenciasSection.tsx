"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import {
  formatearFechaEspanol,
  formatearHora24 as formatearHora,
  getNombreMes,
} from "@/lib/date-utils";
import { EstadoAsistencia } from "@prisma/client";
import { ESTADO_ASISTENCIA_CONFIG, type EmpleadoItem, type RegistroAsistenciaItem } from "../types";

const ITEMS_POR_PAGINA = 25;

export type FiltroAsistenciaTipo = "TODOS" | "ASISTENCIAS" | "FALTAS";

interface EmpleadoAsistenciasSectionProps {
  emp: EmpleadoItem;
  historialCompleto?: RegistroAsistenciaItem[];
  listaAsistencias?: RegistroAsistenciaItem[];
  cargandoHistorial: boolean;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onEditarAsistencia?: (emp: EmpleadoItem, registro: RegistroAsistenciaItem) => void;
}

export function EmpleadoAsistenciasSection({
  emp,
  historialCompleto,
  listaAsistencias,
  cargandoHistorial,
  onRegistrarAsistencia,
  onEditarAsistencia,
}: EmpleadoAsistenciasSectionProps) {
  // Lista base unificada (prioriza historialCompleto; fallback a listaAsistencias)
  const todosLosRegistros = useMemo(() => {
    if (historialCompleto && historialCompleto.length > 0) {
      return historialCompleto;
    }
    return listaAsistencias || [];
  }, [historialCompleto, listaAsistencias]);

  // Determinación del mes y año inicial (a partir del registro más reciente o de la fecha actual)
  const hoy = useMemo(() => new Date(), []);
  const [mesActual, setMesActual] = useState<number>(() => {
    if (todosLosRegistros.length > 0) {
      const d = new Date(todosLosRegistros[0].fecha);
      if (!isNaN(d.getTime())) return d.getMonth() + 1;
    }
    return hoy.getMonth() + 1;
  });

  const [anoActual, setAnoActual] = useState<number>(() => {
    if (todosLosRegistros.length > 0) {
      const d = new Date(todosLosRegistros[0].fecha);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return hoy.getFullYear();
  });

  const [filtroTipo, setFiltroTipo] = useState<FiltroAsistenciaTipo>("TODOS");
  const [paginaActual, setPaginaActual] = useState(1);

  // Sincronizar mes/año cuando cargue el historial si estaba vacío
  useEffect(() => {
    if (todosLosRegistros.length > 0) {
      const d = new Date(todosLosRegistros[0].fecha);
      if (!isNaN(d.getTime())) {
        setMesActual(d.getMonth() + 1);
        setAnoActual(d.getFullYear());
      }
    }
  }, [todosLosRegistros.length]);

  // Navegación mensual (avanzar o retroceder de mes)
  const cambiarMes = (delta: number) => {
    let nuevoMes = mesActual + delta;
    let nuevoAno = anoActual;
    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAno += 1;
    } else if (nuevoMes < 1) {
      nuevoMes = 12;
      nuevoAno -= 1;
    }
    setMesActual(nuevoMes);
    setAnoActual(nuevoAno);
    setPaginaActual(1);
  };

  const irAlMesActual = () => {
    setMesActual(hoy.getMonth() + 1);
    setAnoActual(hoy.getFullYear());
    setPaginaActual(1);
  };

  // 1. Filtrado de jornadas por mes y año seleccionado
  const registrosPeriodo = useMemo(() => {
    return todosLosRegistros.filter((r) => {
      const d = new Date(r.fecha);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === anoActual && d.getMonth() + 1 === mesActual;
    });
  }, [todosLosRegistros, mesActual, anoActual]);

  // 2. Conteos para el mes activo
  const conteos = useMemo(() => {
    let asistencias = 0;
    let faltas = 0;
    for (const r of registrosPeriodo) {
      if (r.estado === EstadoAsistencia.PRESENTE || r.estado === EstadoAsistencia.RETARDO) {
        asistencias++;
      } else {
        faltas++;
      }
    }
    return {
      todos: registrosPeriodo.length,
      asistencias,
      faltas,
    };
  }, [registrosPeriodo]);

  // 3. Filtrado por tipo (Todos / Asistencias / Faltas)
  const registrosFiltrados = useMemo(() => {
    if (filtroTipo === "ASISTENCIAS") {
      return registrosPeriodo.filter(
        (r) => r.estado === EstadoAsistencia.PRESENTE || r.estado === EstadoAsistencia.RETARDO
      );
    }
    if (filtroTipo === "FALTAS") {
      return registrosPeriodo.filter(
        (r) =>
          r.estado === EstadoAsistencia.FALTA_INJUSTIFICADA ||
          r.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
          r.estado === EstadoAsistencia.PERMISO
      );
    }
    return registrosPeriodo;
  }, [registrosPeriodo, filtroTipo]);

  const totalPaginas = Math.ceil(registrosFiltrados.length / ITEMS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const registrosPaginados = registrosFiltrados.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  const esMesActualEnCurso =
    mesActual === hoy.getMonth() + 1 && anoActual === hoy.getFullYear();

  return (
    <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
      {/* Cabecera de la Sección: Título y Conteo */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
          Historial de Jornadas
        </h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#175E38] text-white font-mono shadow-2xs">
          {conteos.todos}
        </span>
      </div>

      {/* Barra Integrada: Selector de Mes a la izquierda + Filtros a la derecha */}
      <div className="p-1 bg-slate-100 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        {/* Selector de Mes con Flechas Integrado */}
        <div className="flex items-center justify-center gap-1 bg-white p-1 rounded-xl border border-slate-200/70 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-all cursor-pointer active:translate-y-0.5 shrink-0"
            title="Mes anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="px-2.5 h-7 flex items-center justify-center min-w-[130px]">
            <span className="text-xs font-black font-heading text-slate-900 tracking-tight">
              {getNombreMes(mesActual)} {anoActual}
            </span>
          </div>

          <button
            type="button"
            onClick={() => cambiarMes(1)}
            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-all cursor-pointer active:translate-y-0.5 shrink-0"
            title="Mes siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {!esMesActualEnCurso && (
            <button
              type="button"
              onClick={irAlMesActual}
              className="px-2 h-7 rounded-lg text-[10px] font-bold text-[#175E38] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 ml-0.5"
              title="Volver al mes en curso"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hoy</span>
            </button>
          )}
        </div>

        {/* Píldoras de Filtro (Jornadas, Asistencias, Faltas) */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setFiltroTipo("TODOS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-1 md:flex-initial justify-center ${
              filtroTipo === "TODOS"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Jornadas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
              {conteos.todos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipo("ASISTENCIAS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-1 md:flex-initial justify-center ${
              filtroTipo === "ASISTENCIAS"
                ? "bg-white text-emerald-900 shadow-2xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
            <span>Asistencias</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800">
              {conteos.asistencias}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipo("FALTAS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-1 md:flex-initial justify-center ${
              filtroTipo === "FALTAS"
                ? "bg-white text-rose-900 shadow-2xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Faltas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                conteos.faltas > 0
                  ? "bg-rose-100 text-rose-800 font-bold"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {conteos.faltas}
            </span>
          </button>
        </div>
      </div>

      {/* Contenido: Loader, Vacío o Lista de Jornadas */}
      {cargandoHistorial ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-[#175E38]" />
          <span className="text-xs font-medium">Cargando historial de jornadas...</span>
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-700">
            Sin jornadas registradas en {getNombreMes(mesActual)} {anoActual}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {!esMesActualEnCurso && (
              <button
                type="button"
                onClick={irAlMesActual}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Ir al Mes Actual</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onRegistrarAsistencia(emp)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Registrar Marcaje</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {registrosPaginados.map((item) => {
              const esAsistencia =
                item.estado === EstadoAsistencia.PRESENTE ||
                item.estado === EstadoAsistencia.RETARDO;
              const cfg = ESTADO_ASISTENCIA_CONFIG[item.estado] || ESTADO_ASISTENCIA_CONFIG.PRESENTE;
              const esOlvido =
                item.ubicacionSalida?.includes("Automático") ||
                item.ubicacionSalida?.includes("Olvido") ||
                item.observaciones?.includes("automático") ||
                item.observaciones?.includes("Cierre automático");
              const esAutomaticaInasistencia = item.observaciones?.includes("Inasistencia automática");

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 ${
                    esOlvido
                      ? "border-amber-200/90 bg-amber-50/20"
                      : !esAsistencia
                      ? "border-slate-200/90 bg-slate-50/40"
                      : "border-slate-200/90"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Fecha y Badges de Estado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black font-heading text-slate-900">
                        {formatearFechaEspanol(item.fecha)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          esAutomaticaInasistencia
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : cfg.badgeClass
                        }`}
                      >
                        {esAutomaticaInasistencia ? "Sin marcar" : cfg.label}
                      </span>
                      {esOlvido && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Olvido de salida</span>
                        </span>
                      )}
                    </div>

                    {/* Detalle Horario o Motivo */}
                    {esAsistencia ? (
                      <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                          <span>Entrada: {formatearHora(item.horaEntrada)}</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        {esOlvido ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded">
                            <span>
                              Salida: {item.horaSalida ? formatearHora(item.horaSalida) : "11:59 p. m."} (Auto)
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {item.horaSalida ? `Salida: ${formatearHora(item.horaSalida)}` : "En curso"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {item.observaciones && !esAutomaticaInasistencia
                          ? item.observaciones
                          : "Jornada sin marcaje de entrada registrado"}
                      </p>
                    )}

                    {esOlvido && (
                      <p className="text-[11px] text-amber-700 italic mt-0.5">
                        Cierre automático: el colaborador no registró marcaje de salida.
                      </p>
                    )}
                  </div>

                  {/* Botón de Ajuste o Regularización */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onEditarAsistencia) {
                        onEditarAsistencia(emp, item);
                      } else {
                        onRegistrarAsistencia(emp);
                      }
                    }}
                    className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 active:translate-y-0.5 ${
                      !esAsistencia
                        ? "text-white bg-[#175E38] hover:bg-[#124b2d] border-b-[2px] border-b-[#0e3a23]"
                        : "text-slate-700 bg-slate-100 hover:bg-slate-200"
                    }`}
                    title={
                      !esAsistencia
                        ? "Registrar marcaje retroactivo para esta fecha"
                        : "Ajustar horas de entrada/salida de esta fecha"
                    }
                  >
                    {!esAsistencia ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Regularizar</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ajustar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Paginación Local: solo se muestra si hay más de 1 página */}
          {totalPaginas > 1 && (
            <PaginacionLocal
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              totalItems={registrosFiltrados.length}
              indiceInicio={indiceInicio}
              itemsPorPagina={ITEMS_POR_PAGINA}
              itemLabel="jornadas"
              onCambiarPagina={setPaginaActual}
            />
          )}
        </>
      )}
    </div>
  );
}
