"use client";

import { useState, useMemo } from "react";
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
  ShieldCheck,
  Wrench,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/ui/stat-card";
import { EntregaGuardiaModal } from "@/app/empleado/asistencia/EntregaGuardiaModal";
import { MarcajeExternoModal } from "@/app/empleado/asistencia/MarcajeExternoModal";
import {
  marcarEntradaSalidaEmpleadoAction,
  type PortalEmpleadoData,
  type EntregaGuardiaInput,
} from "@/lib/actions/personal-portal";
import { CARGO_CONFIG } from "@/app/admin/personal/types";
import { EstadoTarea, EstadoTicket, CargoEmpleado } from "@prisma/client";
import { CATEGORIAS_TICKET } from "@/lib/constants/mantenimiento";
import { formatearHora12 } from "@/lib/date-utils";
import { calcularDistanciaMetros } from "@/lib/geo-utils";

interface Props {
  initialData: PortalEmpleadoData;
}

export function EmpleadoDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<PortalEmpleadoData>(initialData);
  const [isPunching, setIsPunching] = useState(false);
  const [modalRelevoAbierto, setModalRelevoAbierto] = useState(false);
  const [modalExternoAbierto, setModalExternoAbierto] = useState(false);
  const [posicionPendiente, setPosicionPendiente] = useState<{ lat: number; lon: number; dist: number } | null>(null);

  const { empleado, asistenciaHoy, tareas, metricas, compañerosSeguridad } = data;
  const esSeguridad = empleado.cargo === CargoEmpleado.SEGURIDAD || asistenciaHoy?.esGuardia24h;

  const cargoInfo = CARGO_CONFIG[empleado.cargo] || {
    label: empleado.cargoPersonalizado || empleado.cargo,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    iconColor: "text-slate-600",
  };

  // Marcaje rápido (Entrada / Salida / Relevo)
  const handleMarcaje = async (input?: EntregaGuardiaInput): Promise<boolean> => {
    try {
      setIsPunching(true);
      const res = await marcarEntradaSalidaEmpleadoAction(input);

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
              observaciones: esSeguridad ? "Inicio de Guardia de Seguridad (24 Horas)" : null,
              esGuardia24h: Boolean(esSeguridad),
              horasEnCurso: 0,
            },
            metricas: {
              ...prev.metricas,
              asistenciasMes: prev.metricas.asistenciasMes + 1,
            },
          }));
        } else if (res.tipo === "SALIDA") {
          const obsSalida = input?.guardiaRelevoNombre
            ? `Relevo: Entregado a ${input.guardiaRelevoNombre}${input.observacionesEntrega ? ` | ${input.observacionesEntrega}` : ""}`
            : (input?.sinRelevo ? "Fin de turno: Sin relevo presencial" : (asistenciaHoy?.observaciones || null));

          setData((prev) => ({
            ...prev,
            asistenciaHoy: prev.asistenciaHoy
              ? {
                  ...prev.asistenciaHoy,
                  horaSalida: ahora,
                  ubicacionSalida: empleado.propiedadNombre || "Marcaje Móvil",
                  observaciones: obsSalida,
                }
              : null,
          }));
        }
        return true;
      } else {
        toast.error(res.error || "No se pudo registrar la marcación.");
        return false;
      }
    } catch (error: unknown) {
      console.error("Error al marcar asistencia:", error);
      const errStr =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error || "");

      // Detección exhaustiva de desincronización de Server Action o desconexión en desarrollo
      const esDesync =
        errStr.includes("unexpected response") ||
        errStr.includes("Failed to find Server Action") ||
        errStr.includes("Failed to fetch") ||
        errStr.includes("NetworkError") ||
        errStr.includes("Load failed");

      if (esDesync) {
        toast.error("La sesión con el servidor se actualizó por cambios de desarrollo. Recargando para sincronizar...");
        setTimeout(() => window.location.reload(), 1200);
        return false;
      }

      toast.error(errStr || "Error de conexión al marcar asistencia.");
      return false;
    } finally {
      setIsPunching(false);
    }
  };

  // Disparador de marcaje de entrada con comprobación GPS satelital
  const handleBotonEntradaClick = () => {
    const tieneCoords =
      typeof empleado.propiedadLatitud === "number" &&
      typeof empleado.propiedadLongitud === "number";

    if (!tieneCoords || !navigator.geolocation) {
      handleMarcaje();
      return;
    }

    setIsPunching(true);
    toast.info("Validando ubicación con satélite GPS...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const dist = calcularDistanciaMetros(
          lat,
          lon,
          empleado.propiedadLatitud!,
          empleado.propiedadLongitud!
        );
        const radioMaximo = empleado.propiedadRadioMetros || 200;

        if (dist <= radioMaximo) {
          handleMarcaje({ latitud: lat, longitud: lon });
        } else {
          setIsPunching(false);
          setPosicionPendiente({ lat, lon, dist });
          setModalExternoAbierto(true);
        }
      },
      (error) => {
        console.warn("Falla de geolocalización:", error.message);
        toast.warning("No se pudo obtener señal GPS. Registrando marcación estándar...");
        handleMarcaje();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirmarMarcajeExterno = (motivo: string) => {
    setModalExternoAbierto(false);
    handleMarcaje({
      latitud: posicionPendiente?.lat,
      longitud: posicionPendiente?.lon,
      motivoExterno: motivo,
    });
    setPosicionPendiente(null);
  };

  const handleBotonSalidaClick = () => {
    if (esSeguridad) {
      setModalRelevoAbierto(true);
    } else {
      handleMarcaje();
    }
  };

  const prevAsistenciaHoy = (d: PortalEmpleadoData) => d.asistenciaHoy !== null;

  // 1. Tareas: si hay pendientes, todas las pendientes. Si no hay pendientes, la última que completó.
  const tareasActivas = useMemo(() => {
    return (tareas || []).filter(
      (t) => t.estado === EstadoTarea.PENDIENTE || t.estado === EstadoTarea.EN_PROCESO
    );
  }, [tareas]);

  const tareasActivasCount = tareasActivas.length;

  const tareasDestacadas = useMemo(() => {
    if (tareasActivas.length > 0) {
      return tareasActivas;
    }
    const completadas = (tareas || [])
      .filter((t) => t.estado === EstadoTarea.COMPLETADA)
      .sort((a, b) => {
        const fechaA = a.fechaCompletada ? new Date(a.fechaCompletada).getTime() : new Date(a.createdAt).getTime();
        const fechaB = b.fechaCompletada ? new Date(b.fechaCompletada).getTime() : new Date(b.createdAt).getTime();
        return fechaB - fechaA;
      });
    return completadas.slice(0, 1);
  }, [tareas, tareasActivas]);

  // 2. Mantenimiento: si hay pendientes, todas las pendientes. Si no hay pendientes, la última que resolvió.
  const ticketsActivos = useMemo(() => {
    return (data.ticketsMantenimiento || []).filter(
      (t) => t.estado === EstadoTicket.PENDIENTE || t.estado === EstadoTicket.EN_PROCESO
    );
  }, [data.ticketsMantenimiento]);

  const ticketsActivosCount = ticketsActivos.length;

  const ticketsDestacados = useMemo(() => {
    if (ticketsActivos.length > 0) {
      return ticketsActivos;
    }
    const resueltos = (data.ticketsMantenimiento || [])
      .filter((t) => t.estado === EstadoTicket.RESUELTO)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return resueltos.slice(0, 1);
  }, [data.ticketsMantenimiento, ticketsActivos]);

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
          title="Averías Asignadas"
          value={metricas.ticketsActivos || 0}
          icon={Wrench}
          color={(metricas.ticketsActivos || 0) > 0 ? "amber" : "emerald"}
          subtitle={(metricas.ticketsActivos || 0) > 0 ? "Órdenes de mantenimiento" : "Sin averías pendientes"}
          className="shadow-2xs"
        />
        <StatCard
          title="Completadas del Mes"
          value={metricas.tareasCompletadasMes + (metricas.ticketsResueltosMes || 0)}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Labores y averías concluidas"
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

      {/* ACCESO DESTACADO A BITÁCORA DE SEGURIDAD (SOLO VIGILANCIA) */}
      {empleado.cargo === "SEGURIDAD" && (
        <div className="rounded-2xl bg-gradient-to-r from-[#175E38] via-[#155332] to-[#1C2539] text-white p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(23,94,56,0.3)] border border-emerald-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Puesto de Control & Vigilancia
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-heading tracking-tight mt-0.5">
                Bitácora de Seguridad
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Registro de rondas preventivas, inspecciones y reporte de novedades en el inmueble.
              </p>
            </div>
          </div>
          <Link
            href="/empleado/minuta"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-[#175E38] hover:bg-emerald-50 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
          >
            <span>Ir a la Bitácora de Seguridad</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      )}

      {/* 3. CONTROL HORARIO Y JORNADA (CONSOLA STANDALONE ANCHO COMPLETO) */}
      <section className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] transition-all duration-300">
        {/* Sol decorativo ambiental en esquina superior izquierda */}
        <div className="absolute -top-7 -left-7 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none overflow-hidden rounded-full z-0">
          <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/20" />
          <div className="absolute inset-2 rounded-full bg-white/10 border border-emerald-400/30" />
          <div className="absolute inset-5 rounded-full bg-gradient-to-br from-[#175E38]/30 to-transparent transition-transform duration-500 group-hover:scale-125" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mb-4 pb-3 border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-100 shrink-0 shadow-2xs">
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Control Horario y Llegada
              </h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Monitoreo de asistencia y registro de jornada laboral diaria
              </p>
            </div>
          </div>
          <Link
            href="/empleado/asistencia"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#175E38] hover:text-[#124b2d] transition-colors px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-50/70 sm:bg-transparent hover:bg-emerald-100 sm:hover:bg-emerald-50 whitespace-nowrap"
          >
            <span>Ver historial</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>

        <div className="relative z-10">
          {!asistenciaHoy ? (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Jornada no iniciada
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aún no has registrado tu entrada de hoy. Presiona el botón para computar la jornada al iniciar tus labores.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBotonEntradaClick}
                disabled={isPunching}
                className="h-11 px-6 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#124b2d] hover:to-[#0e3a23] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isPunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                    <span>{esSeguridad ? "Iniciar Guardia (24h)" : "Registrar Entrada"}</span>
                  </>
                )}
              </button>
            </div>
          ) : !asistenciaHoy.horaSalida ? (
            <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                      {esSeguridad ? "Guardia 24h en Curso" : "Jornada en curso"}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                    {esSeguridad ? "En Custodia" : "Activo"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200/70">
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
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Estado
                    </span>
                    <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                      {esSeguridad ? `En Servicio (${asistenciaHoy.horasEnCurso || 0}h)` : "Laborando"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBotonSalidaClick}
                disabled={isPunching}
                className="h-11 px-6 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 border-b-[3px] border-b-amber-900 active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(217,119,6,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isPunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : esSeguridad ? (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Entregar Guardia</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 stroke-[2.5]" />
                    <span>Marcar Salida</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 text-[#175E38]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Jornada de Hoy Finalizada
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70">
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
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cumplimiento
                    </span>
                    <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                      Completado
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-10 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#175E38] font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Jornada Finalizada</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal de Relevo y Entrega de Guardia */}
      <EntregaGuardiaModal
        isOpen={modalRelevoAbierto}
        onClose={() => setModalRelevoAbierto(false)}
        onConfirm={handleMarcaje}
        compañerosSeguridad={compañerosSeguridad || []}
        horasEnCurso={asistenciaHoy?.horasEnCurso || 24}
      />

      {/* Modal de Justificación de Marcaje Fuera de Sede */}
      <MarcajeExternoModal
        isOpen={modalExternoAbierto}
        onClose={() => {
          setModalExternoAbierto(false);
          setPosicionPendiente(null);
        }}
        onConfirm={handleConfirmarMarcajeExterno}
        distanciaMetros={posicionPendiente?.dist || null}
        propiedadNombre={empleado.propiedadNombre}
        isSubmitting={isPunching}
      />

      {/* 4. ASIGNACIONES DE TRABAJO (2 COLUMNAS PARALELAS 50/50 CON ALTURAS IDÉNTICAS) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        {/* COLUMNA 1: ÓRDENES DE MANTENIMIENTO */}
        <div className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] transition-all duration-300 h-full flex flex-col justify-between">
          {/* Sol decorativo ambiental en esquina superior izquierda */}
          <div className="absolute -top-7 -left-7 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none overflow-hidden rounded-full z-0">
            <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/20" />
            <div className="absolute inset-2 rounded-full bg-white/10 border border-emerald-400/30" />
            <div className="absolute inset-5 rounded-full bg-gradient-to-br from-[#175E38]/30 to-transparent transition-transform duration-500 group-hover:scale-125" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mb-4 pb-3 border-b border-slate-100 relative z-10 shrink-0">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-100 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                <Wrench className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight leading-snug">
                    Órdenes de Mantenimiento
                  </h3>
                  {ticketsActivosCount > 0 ? (
                    <span className="text-[10.5px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      {ticketsActivosCount} {ticketsActivosCount === 1 ? "pendiente" : "pendientes"}
                    </span>
                  ) : ticketsDestacados.length > 0 ? (
                    <span className="text-[10.5px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#175E38] border border-emerald-200 shrink-0">
                      Al día
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <Link
              href="/empleado/mantenimiento"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#175E38] hover:text-[#124b2d] transition-colors px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-50/70 sm:bg-transparent hover:bg-emerald-100 sm:hover:bg-emerald-50 whitespace-nowrap shrink-0"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-between">
            {ticketsDestacados.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#175E38] flex items-center justify-center mx-auto mb-2.5 border border-emerald-100 shadow-2xs">
                  <Wrench className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">¡Sin averías asignadas!</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No tienes órdenes de mantenimiento asignadas en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {ticketsDestacados.map((ticket) => {
                  const esResuelto = ticket.estado === EstadoTicket.RESUELTO;
                  const esEnProceso = ticket.estado === EstadoTicket.EN_PROCESO;
                  return (
                    <div
                      key={ticket.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/70 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
                    >
                      <div className="space-y-2.5">
                        {/* Cabecera balanceada: Estado a la izquierda, Código a la derecha */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider border shadow-2xs ${
                              esResuelto
                                ? "bg-emerald-50 text-[#175E38] border-emerald-200"
                                : esEnProceso
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {esResuelto ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38]" />
                            ) : (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  esEnProceso ? "bg-blue-500" : "bg-amber-500"
                                } animate-pulse`}
                              />
                            )}
                            <span>{esResuelto ? "Resuelto" : esEnProceso ? "En Proceso" : "Pendiente"}</span>
                          </span>

                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/80">
                            {ticket.codigo}
                          </span>
                        </div>

                        {/* Título de la avería */}
                        <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-2">
                          {ticket.titulo}
                        </h4>

                        {/* Ubicación en 2 niveles (Inmueble y Espacio específico) */}
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{ticket.propiedadNombre}</span>
                          </div>
                          <div className="text-[11.5px] text-slate-500 pl-5">
                            <span className="truncate">
                              {ticket.unidadCodigo ? `Local ${ticket.unidadCodigo}` : "Áreas Comunes"}
                            </span>
                          </div>
                        </div>

                        {/* Categoría y Evidencias */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                          <span className="font-medium text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70">
                            {ticket.categoriaPersonalizada ||
                              CATEGORIAS_TICKET[ticket.categoria]?.label ||
                              ticket.categoria}
                          </span>
                          {ticket.fotosAveriaCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              <Camera className="w-3 h-3 text-slate-400" />
                              <span>
                                {ticket.fotosAveriaCount} {ticket.fotosAveriaCount === 1 ? "foto" : "fotos"}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer de acción de ancho ergonómico */}
                      <div className="pt-2 border-t border-slate-100">
                        <Link
                          href="/empleado/mantenimiento"
                          className={`w-full h-9 sm:h-9.5 px-3 rounded-xl text-xs font-bold border-b-[2px] active:translate-y-0.5 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            esResuelto
                              ? "bg-[#1C2539] text-white hover:bg-[#2a3754] border-b-slate-900"
                              : "bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 border-b-[#0e3a23] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
                          }`}
                        >
                          {esResuelto ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ver Registro de Reparación</span>
                            </>
                          ) : (
                            <>
                              <Wrench className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Atender Avería</span>
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: TAREAS ASIGNADAS (LABORES OPERATIVAS) */}
        <div className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] transition-all duration-300 h-full flex flex-col justify-between">
          {/* Sol decorativo ambiental en esquina superior izquierda */}
          <div className="absolute -top-7 -left-7 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none overflow-hidden rounded-full z-0">
            <div className="absolute inset-0 rounded-full blur-xl bg-emerald-500/20" />
            <div className="absolute inset-2 rounded-full bg-white/10 border border-emerald-400/30" />
            <div className="absolute inset-5 rounded-full bg-gradient-to-br from-[#175E38]/30 to-transparent transition-transform duration-500 group-hover:scale-125" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mb-4 pb-3 border-b border-slate-100 relative z-10 shrink-0">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-100 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                <CheckSquare className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight leading-snug">
                    Tareas Asignadas
                  </h3>
                  {tareasActivasCount > 0 ? (
                    <span className="text-[10.5px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      {tareasActivasCount} {tareasActivasCount === 1 ? "pendiente" : "pendientes"}
                    </span>
                  ) : tareasDestacadas.length > 0 ? (
                    <span className="text-[10.5px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#175E38] border border-emerald-200 shrink-0">
                      Al día
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <Link
              href="/empleado/tareas"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#175E38] hover:text-[#124b2d] transition-colors px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-50/70 sm:bg-transparent hover:bg-emerald-100 sm:hover:bg-emerald-50 whitespace-nowrap shrink-0"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-between">
            {tareasDestacadas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#175E38] flex items-center justify-center mx-auto mb-2.5 border border-emerald-100 shadow-2xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">¡Estás al día con tus labores!</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No tienes tareas pendientes asignadas en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {tareasDestacadas.map((tarea) => {
                  const esCompletada = tarea.estado === EstadoTarea.COMPLETADA;
                  const esEnProceso = tarea.estado === EstadoTarea.EN_PROCESO;
                  return (
                    <div
                      key={tarea.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/70 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
                    >
                      <div className="space-y-2.5">
                        {/* Cabecera balanceada: Estado a la izquierda, Prioridad a la derecha */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider border shadow-2xs ${
                              esCompletada
                                ? "bg-emerald-50 text-[#175E38] border-emerald-200"
                                : esEnProceso
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-amber-50 text-amber-800 border-amber-300/80"
                            }`}
                          >
                            {esCompletada ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38]" />
                            ) : (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  esEnProceso ? "bg-blue-500" : "bg-amber-500"
                                } animate-pulse`}
                              />
                            )}
                            <span>
                              {esCompletada ? "Completada" : esEnProceso ? "En Proceso" : "Pendiente"}
                            </span>
                          </span>

                          {/* Solo si la tarea es urgente o de alta prioridad y está pendiente */}
                          {!esCompletada && (tarea.prioridad === "URGENTE" || tarea.prioridad === "ALTA") && (
                            <span className="text-[10.5px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 uppercase tracking-wider">
                              {tarea.prioridad === "URGENTE" ? "Urgente" : "Alta"}
                            </span>
                          )}
                        </div>

                        {/* Título de la tarea */}
                        <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-2">
                          {tarea.titulo}
                        </h4>

                        {/* Ubicación clara sin cajas pesadas */}
                        {tarea.propiedadNombre && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {tarea.propiedadNombre}
                            </span>
                          </div>
                        )}

                        {/* Evidencias si existen */}
                        {tarea.evidencias && tarea.evidencias.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              <Camera className="w-3 h-3 text-slate-400" />
                              <span>
                                {tarea.evidencias.length} {tarea.evidencias.length === 1 ? "evidencia" : "evidencias"}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <Link
                          href="/empleado/tareas"
                          className={`w-full h-9 sm:h-9.5 px-3 rounded-xl text-xs font-bold border-b-[2px] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            esCompletada
                              ? "bg-[#1C2539] text-white hover:bg-[#2a3754] border-b-slate-900 shadow-xs"
                              : "bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 border-b-[#0e3a23] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
                          }`}
                        >
                          {esCompletada ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ver Registro de Tarea</span>
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Completar Tarea</span>
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
