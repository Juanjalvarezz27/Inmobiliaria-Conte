"use client";

import { useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { EmpleadoJornadaCard } from "./EmpleadoJornadaCard";
import {
  marcarEntradaSalidaEmpleadoAction,
  type PortalEmpleadoData,
} from "@/lib/actions/personal-portal";
import type { RegistroAsistenciaItem } from "@/app/admin/personal/types";
import { EstadoAsistencia } from "@prisma/client";
import { formatearHora12 } from "@/lib/date-utils";

interface Props {
  initialAsistenciaHoy: PortalEmpleadoData["asistenciaHoy"];
  initialHistorial: RegistroAsistenciaItem[];
  empleadoNombre: string;
  propiedadNombre: string | null;
}

export function EmpleadoAsistenciaClient({
  initialAsistenciaHoy,
  initialHistorial,
  propiedadNombre,
}: Props) {
  const [asistenciaHoy, setAsistenciaHoy] = useState(initialAsistenciaHoy);
  const [historial, setHistorial] = useState(initialHistorial);
  const [isPunching, setIsPunching] = useState(false);
  const [isHistorialAbierto, setIsHistorialAbierto] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 6;

  const totalPaginas = Math.ceil(historial.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const registrosPaginados = historial.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  // Marcaje de jornada
  const handleMarcaje = async () => {
    try {
      setIsPunching(true);
      const res = await marcarEntradaSalidaEmpleadoAction();

      if (res.success) {
        toast.success(res.message);
        const ahora = new Date().toISOString();

        if (res.tipo === "ENTRADA") {
          const nuevoRegistro: RegistroAsistenciaItem = {
            id: "temp-" + Date.now(),
            empleadoId: "me",
            fecha: ahora,
            horaEntrada: ahora,
            horaSalida: null,
            estado: EstadoAsistencia.PRESENTE,
            ubicacionEntrada: propiedadNombre || "Marcaje Móvil",
            ubicacionSalida: null,
            observaciones: null,
            createdAt: ahora,
          };

          setAsistenciaHoy({
            id: nuevoRegistro.id,
            fecha: ahora,
            horaEntrada: ahora,
            horaSalida: null,
            estado: EstadoAsistencia.PRESENTE,
            ubicacionEntrada: nuevoRegistro.ubicacionEntrada,
            ubicacionSalida: null,
          });

          setHistorial((prev) => [nuevoRegistro, ...prev]);
        } else if (res.tipo === "SALIDA" && asistenciaHoy) {
          setAsistenciaHoy((prev) =>
            prev
              ? {
                  ...prev,
                  horaSalida: ahora,
                  ubicacionSalida: propiedadNombre || "Marcaje Móvil",
                }
              : null
          );

          setHistorial((prev) =>
            prev.map((r, i) =>
              i === 0
                ? {
                    ...r,
                    horaSalida: ahora,
                    ubicacionSalida: propiedadNombre || "Marcaje Móvil",
                  }
                : r
            )
          );
        }
      } else {
        toast.error(res.error || "No se pudo registrar asistencia.");
      }
    } catch {
      toast.error("Error al registrar marcación.");
    } finally {
      setIsPunching(false);
    }
  };

  // Métricas del mes actual
  const diasPresente = historial.filter(
    (r) => r.estado === EstadoAsistencia.PRESENTE || r.estado === EstadoAsistencia.RETARDO
  ).length;
  const diasInasistencia = historial.filter(
    (r) =>
      r.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
      r.estado === EstadoAsistencia.FALTA_INJUSTIFICADA
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* Cabecera institucional */}
      <PageHeader
        title="Marcaje de Asistencia y Jornadas"
        icon={<Clock className="w-6 h-6 text-white" />}
      />

      {/* TARJETA CENTRAL DE CONTROL DE HOY */}
      <div className="rounded-2xl bg-gradient-to-b from-white via-white to-slate-50/80 p-5 sm:p-7 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-sm relative overflow-hidden">
        {/* Efecto sol ambiental */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-44 h-44 rounded-full bg-[#175E38]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#175E38]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#175E38]">
                Jornada Laboral de Hoy
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Hora de Entrada
                </span>
                <span suppressHydrationWarning className="font-heading font-black text-lg sm:text-xl text-slate-900 mt-0.5 block">
                  {asistenciaHoy ? formatearHora12(asistenciaHoy.horaEntrada) : "--:--"}
                </span>
                <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                  {asistenciaHoy?.ubicacionEntrada || "Pendiente"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Hora de Salida
                </span>
                <span suppressHydrationWarning className="font-heading font-black text-lg sm:text-xl text-slate-900 mt-0.5 block">
                  {asistenciaHoy?.horaSalida ? formatearHora12(asistenciaHoy.horaSalida) : "--:--"}
                </span>
                <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                  {asistenciaHoy?.horaSalida ? asistenciaHoy.ubicacionSalida || "Registrada" : "En curso..."}
                </span>
              </div>
            </div>
          </div>

          {/* Botón de acción principal grande */}
          <div className="shrink-0 w-full md:w-auto">
            {!asistenciaHoy ? (
              <button
                type="button"
                onClick={handleMarcaje}
                disabled={isPunching}
                className="w-full md:min-w-[240px] h-14 px-6 rounded-2xl font-heading font-black text-sm text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#124b2d] hover:to-[#0e3a23] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_4px_16px_rgba(23,94,56,0.35)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isPunching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 stroke-[2.5]" />
                    <span>Registrar Entrada Ahora</span>
                  </>
                )}
              </button>
            ) : !asistenciaHoy.horaSalida ? (
              <button
                type="button"
                onClick={handleMarcaje}
                disabled={isPunching}
                className="w-full md:min-w-[240px] h-14 px-6 rounded-2xl font-heading font-black text-sm text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 border-b-[3px] border-b-amber-900 active:translate-y-0.5 transition-all shadow-[0_4px_16px_rgba(217,119,6,0.3)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isPunching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-5 h-5 stroke-[2.5]" />
                    <span>Marcar Salida de Jornada</span>
                  </>
                )}
              </button>
            ) : (
              <div className="h-13 px-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-[#175E38]" />
                <span>Jornada Completada Hoy</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MÉTRICAS DE ASISTENCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <StatCard
          title="Asistencias Cumplidas"
          value={diasPresente}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Jornadas efectivas"
          className="shadow-2xs"
        />
        <StatCard
          title="Inasistencias / Ausencias"
          value={diasInasistencia}
          icon={AlertCircle}
          color="rose"
          subtitle="Faltas justificadas o no"
          className="shadow-2xs"
        />
        <StatCard
          title="Total Registros"
          value={historial.length}
          icon={CalendarDays}
          color="navy"
          subtitle="Registros evaluados"
          className="shadow-2xs"
        />
      </div>

      {/* SECCIÓN DESPLEGABLE: HISTORIAL DE JORNADAS (ACORDEÓN SUAVE + CARDS INDIVIDUALES) */}
      <div className="rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-2xs relative overflow-hidden transition-all">
        {/* Efecto Sol ambiental en la cabecera */}
        <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Cabecera interactiva del Acordeón */}
        <div
          onClick={() => setIsHistorialAbierto((prev) => !prev)}
          className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/70 transition-colors relative z-10"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/95 border border-slate-200/90 text-[#1C2539] flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarDays className="w-5 h-5 text-[#175E38]" />
            </div>

            <div className="min-w-0">
              <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Historial de Jornadas Anteriores
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">
                  {historial.length} {historial.length === 1 ? "jornada registrada" : "jornadas registradas"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/90">
                  {diasPresente} Asistencias
                </span>
                {diasInasistencia > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/90">
                    {diasInasistencia} Ausencias
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-xs font-bold text-[#175E38]">
              {isHistorialAbierto ? "Ocultar historial" : "Ver historial"}
            </span>
            <div
              className={`w-9 h-9 rounded-xl border border-slate-200/90 bg-white text-slate-600 flex items-center justify-center shadow-2xs transition-transform duration-300 ${
                isHistorialAbierto ? "rotate-180 bg-slate-100 text-slate-900" : ""
              }`}
            >
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Contenedor colapsable con animación CSS Grid ultra fluida */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isHistorialAbierto
              ? "grid-rows-[1fr] opacity-100 border-t border-slate-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 sm:p-5 space-y-3.5 bg-slate-50/40">
              {historial.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/80 p-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">Sin historial registrado</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Aún no cuentas con registros de asistencia de días anteriores.
                  </p>
                </div>
              ) : (
                <>
                  {/* Listado de días en Cuadrícula de 3 Columnas con Tarjeta Reutilizable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {registrosPaginados.map((reg) => (
                      <EmpleadoJornadaCard
                        key={reg.id}
                        registro={reg}
                        propiedadNombre={propiedadNombre}
                      />
                    ))}
                  </div>

                  {/* Paginación Local Reutilizable */}
                  <PaginacionLocal
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    totalItems={historial.length}
                    indiceInicio={indiceInicio}
                    itemsPorPagina={ITEMS_POR_PAGINA}
                    itemLabel="jornadas"
                    onCambiarPagina={(pag) => setPaginaActual(pag)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
