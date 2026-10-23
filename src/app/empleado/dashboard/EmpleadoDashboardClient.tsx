"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  AlertCircle,
  CheckSquare,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/ui/stat-card";
import {
  marcarEntradaSalidaEmpleadoAction,
  type PortalEmpleadoData,
} from "@/lib/actions/personal-portal";
import { CARGO_CONFIG } from "@/app/admin/personal/types";
import { EstadoTarea } from "@prisma/client";
import { formatearHora12 } from "@/lib/date-utils";

interface Props {
  initialData: PortalEmpleadoData;
}

export function EmpleadoDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<PortalEmpleadoData>(initialData);
  const [isPunching, setIsPunching] = useState(false);

  const { empleado, asistenciaHoy, tareas, metricas } = data;
  const cargoInfo = CARGO_CONFIG[empleado.cargo] || {
    label: empleado.cargoPersonalizado || empleado.cargo,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    iconColor: "text-slate-600",
  };

  // Marcaje rápido (Entrada / Salida)
  const handleMarcaje = async () => {
    try {
      setIsPunching(true);
      const res = await marcarEntradaSalidaEmpleadoAction();

      if (res.success) {
        toast.success(res.message);
        const ahora = new Date().toISOString();
        if (res.tipo === "ENTRADA") {
          setData((prev) => ({
            ...prev,
            asistenciaHoy: {
              id: "temp-" + Date.now(),
              fecha: ahora,
              horaEntrada: ahora,
              horaSalida: null,
              estado: "PRESENTE",
              ubicacionEntrada: empleado.propiedadNombre || "Marcaje Móvil",
              ubicacionSalida: null,
            },
            metricas: {
              ...prev.metricas,
              asistenciasMes: prev.metricas.asistenciasMes + 1,
            },
          }));
        } else if (res.tipo === "SALIDA" && prevAsistenciaHoy(data)) {
          setData((prev) => ({
            ...prev,
            asistenciaHoy: prev.asistenciaHoy
              ? {
                  ...prev.asistenciaHoy,
                  horaSalida: ahora,
                  ubicacionSalida: empleado.propiedadNombre || "Marcaje Móvil",
                }
              : null,
          }));
        }
      } else {
        toast.error(res.error || "No se pudo registrar la marcación.");
      }
    } catch {
      toast.error("Error de conexión al marcar asistencia.");
    } finally {
      setIsPunching(false);
    }
  };

  const prevAsistenciaHoy = (d: PortalEmpleadoData) => d.asistenciaHoy !== null;

  const tareasDestacadas = tareas
    .filter((t) => t.estado !== EstadoTarea.COMPLETADA && t.estado !== EstadoTarea.CANCELADA)
    .slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* 1. BANNER HERO EJECUTIVO (IDÉNTICO AL DEL ADMIN DASHBOARD) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-7 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
              <Image
                src="/Logo.png"
                alt="Inmobiliaria Conté"
                width={64}
                height={64}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="mb-1">
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest font-heading">
                  Inmobiliaria Conté
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black font-heading tracking-tight text-white">
                Bienvenido, {empleado.nombre} {empleado.apellido || ""}
              </h1>
            </div>
          </div>

          {/* Sede Asignada */}
          {empleado.propiedadNombre && (
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[240px] font-semibold">{empleado.propiedadNombre}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 2. STATCARDS OPERATIVAS EN ANCHO COMPLETO */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Tareas Pendientes"
          value={metricas.tareasPendientes}
          icon={AlertCircle}
          color={metricas.tareasPendientes > 0 ? "amber" : "emerald"}
          subtitle={metricas.tareasPendientes > 0 ? "Por resolver" : "Sin pendientes"}
          className="shadow-2xs"
        />
        <StatCard
          title="Completadas del Mes"
          value={metricas.tareasCompletadasMes}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Productividad mensual"
          className="shadow-2xs"
        />
        <StatCard
          title="Total Asignadas"
          value={tareas.length}
          icon={CheckSquare}
          color="indigo"
          subtitle="Órdenes activas"
          className="shadow-2xs"
        />
        <StatCard
          title="Días Laborados"
          value={metricas.asistenciasMes}
          icon={Calendar}
          color="navy"
          subtitle="Jornadas registradas"
          className="shadow-2xs"
        />
      </section>

      {/* 3. SECCIÓN EN 2 COLUMNAS: TAREAS ASIGNADAS Y CONTROL DE LLEGADA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        {/* COLUMNA 1: ÓRDENES DE TRABAJO ASIGNADAS */}
        <div className="rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-100 shrink-0">
                <CheckSquare className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Órdenes de Trabajo Asignadas
              </h3>
            </div>
            <Link
              href="/empleado/tareas"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#175E38] hover:text-[#124b2d] transition-colors px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-50/70 sm:bg-transparent hover:bg-emerald-100 sm:hover:bg-emerald-50 whitespace-nowrap"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          {tareasDestacadas.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#175E38] flex items-center justify-center mx-auto mb-2.5 border border-emerald-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">¡Estás al día con tus labores!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                No tienes tareas pendientes asignadas en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tareasDestacadas.map((tarea) => {
                return (
                  <div
                    key={tarea.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300/80 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Pendiente</span>
                        </span>

                        {tarea.propiedadNombre && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70 truncate max-w-[200px]">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{tarea.propiedadNombre}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                        {tarea.titulo}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/empleado/tareas"
                        className="h-8.5 px-3 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[2px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_6px_rgba(23,94,56,0.3)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Completar</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA 2: CONTROL HORARIO Y MARCAJE DE JORNADA */}
        <div className="rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-5 sm:p-6 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-[#175E38]/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mb-4 pb-3 border-b border-slate-100 relative z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-100 shrink-0">
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Control Horario y Llegada
              </h3>
            </div>
            <Link
              href="/empleado/asistencia"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#175E38] hover:text-[#124b2d] transition-colors px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-50/70 sm:bg-transparent hover:bg-emerald-100 sm:hover:bg-emerald-50 whitespace-nowrap"
            >
              <span>Ver historial</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Estado actual de la jornada */}
            {!asistenciaHoy ? (
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Jornada no iniciada
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aún no has registrado tu entrada de hoy. Presiona el botón verde inferior al iniciar tus labores.
                </p>
              </div>
            ) : !asistenciaHoy.horaSalida ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                      Jornada en curso
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-emerald-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Entrada Registrada
                    </span>
                    <span suppressHydrationWarning className="text-base sm:text-lg font-black text-slate-900 font-heading">
                      {formatearHora12(asistenciaHoy.horaEntrada)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Sede de Marcaje
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                      {asistenciaHoy.ubicacionEntrada || empleado.propiedadNombre || "Marcaje Móvil"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 mb-2 text-[#175E38]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Jornada de Hoy Finalizada
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hora de Entrada
                    </span>
                    <span suppressHydrationWarning className="text-sm sm:text-base font-black text-slate-900 font-heading">
                      {formatearHora12(asistenciaHoy.horaEntrada)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hora de Salida
                    </span>
                    <span suppressHydrationWarning className="text-sm sm:text-base font-black text-slate-900 font-heading">
                      {formatearHora12(asistenciaHoy.horaSalida)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pie de acción con botón refinado y no masivo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                {!asistenciaHoy
                  ? "Registra tu entrada para computar la jornada"
                  : !asistenciaHoy.horaSalida
                  ? "Recuerda marcar al terminar tus labores"
                  : "Marcaje diario completado"}
              </span>

              {!asistenciaHoy ? (
                <button
                  type="button"
                  onClick={handleMarcaje}
                  disabled={isPunching}
                  className="h-10 px-5 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#124b2d] hover:to-[#0e3a23] border-b-[2px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isPunching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 stroke-[2.5]" />
                      <span>Registrar Entrada</span>
                    </>
                  )}
                </button>
              ) : !asistenciaHoy.horaSalida ? (
                <button
                  type="button"
                  onClick={handleMarcaje}
                  disabled={isPunching}
                  className="h-10 px-5 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 border-b-[2px] border-b-amber-900 active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(217,119,6,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isPunching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 stroke-[2.5]" />
                      <span>Marcar Salida</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="h-9 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#175E38] font-bold text-xs flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Jornada Finalizada</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
