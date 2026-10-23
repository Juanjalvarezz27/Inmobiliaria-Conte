"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Building2,
  FileText,
  Briefcase,
  UserX,
  Wrench,
  Zap,
  Droplets,
  Shield,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { EstadoTarea, EstadoAsistencia, CargoEmpleado } from "@prisma/client";
import { obtenerHistorialAsistenciaEmpleadoAction } from "@/lib/actions/personal";
import {
  CARGO_CONFIG,
  ESTADO_ASISTENCIA_CONFIG,
  getCargoLabel,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";
import { EmpleadoTareasSection } from "./detalle/EmpleadoTareasSection";
import { EmpleadoAsistenciasSection } from "./detalle/EmpleadoAsistenciasSection";
import { EmpleadoInasistenciasSection } from "./detalle/EmpleadoInasistenciasSection";

interface EmpleadoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoItem | null;
  tareasEmpleado: TareaEmpleadoItem[];
  asistenciasEmpleado?: RegistroAsistenciaItem[];
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onEditarAsistencia?: (emp: EmpleadoItem, registro: RegistroAsistenciaItem) => void;
  onSeleccionarTarea: (tarea: TareaEmpleadoItem) => void;
  onVerFoto?: (url: string) => void;
  scrollToSeccion?: "TAREAS" | "ASISTENCIAS" | null;
}

type VistaFicha = "TAREAS" | "ASISTENCIAS" | "INASISTENCIAS";

// Icono temático según el cargo operativo
function getCargoIcon(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.CONSERJE:
      return <Briefcase className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
      return <Wrench className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.ELECTRICISTA:
      return <Zap className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.PLOMERO:
      return <Droplets className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.SEGURIDAD:
      return <Shield className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.SUPERVISOR:
      return <User className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.ADMINISTRATIVO:
      return <FileText className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Briefcase className="w-3.5 h-3.5 shrink-0" />;
  }
}

// Colores del avatar según el cargo del trabajador
function getCargoAvatarColors(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.ELECTRICISTA:
      return "bg-amber-100 text-amber-900 border-amber-200/90";
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
      return "bg-blue-100 text-blue-900 border-blue-200/90";
    case CargoEmpleado.CONSERJE:
      return "bg-emerald-100 text-emerald-900 border-emerald-200/90";
    case CargoEmpleado.PLOMERO:
      return "bg-cyan-100 text-cyan-900 border-cyan-200/90";
    case CargoEmpleado.SEGURIDAD:
      return "bg-slate-200 text-slate-900 border-slate-300";
    case CargoEmpleado.SUPERVISOR:
      return "bg-indigo-100 text-indigo-900 border-indigo-200/90";
    case CargoEmpleado.ADMINISTRATIVO:
      return "bg-purple-100 text-purple-900 border-purple-200/90";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

// Iniciales del trabajador para el avatar
function getInitials(nombre: string, apellido?: string | null): string {
  const n = (nombre || "").trim();
  const a = (apellido || "").trim();
  if (n && a) {
    return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
  }
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return "TR";
}

export function EmpleadoDetalleModal({
  isOpen,
  onClose,
  empleado: emp,
  tareasEmpleado,
  onAsignarTarea,
  onRegistrarAsistencia,
  onEditarAsistencia,
  onSeleccionarTarea,
  scrollToSeccion,
}: EmpleadoDetalleModalProps) {
  // Pestaña activa dentro de la ficha del colaborador
  const [vistaActiva, setVistaActiva] = useState<VistaFicha>("TAREAS");

  // Historial dinámico de asistencias e inasistencias
  const [historialCompleto, setHistorialCompleto] = useState<RegistroAsistenciaItem[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const seccionTabsRef = useRef<HTMLDivElement>(null);

  // Cargar historial de asistencias e inasistencias al abrir la ficha del empleado
  useEffect(() => {
    if (isOpen && emp?.id) {
      let isMounted = true;
      setCargandoHistorial(true);
      obtenerHistorialAsistenciaEmpleadoAction(emp.id)
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setHistorialCompleto(res.data);
          }
        })
        .finally(() => {
          if (isMounted) setCargandoHistorial(false);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setHistorialCompleto([]);
    }
  }, [isOpen, emp?.id]);

  // Clasificación de jornadas
  const listaAsistencias = useMemo(() => {
    return historialCompleto.filter(
      (r) => r.estado === EstadoAsistencia.PRESENTE || r.estado === EstadoAsistencia.RETARDO
    );
  }, [historialCompleto]);

  const listaInasistencias = useMemo(() => {
    return historialCompleto.filter(
      (r) =>
        r.estado === EstadoAsistencia.FALTA_INJUSTIFICADA ||
        r.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
        r.estado === EstadoAsistencia.PERMISO
    );
  }, [historialCompleto]);

  const totalAsistenciasCount = historialCompleto.length > 0
    ? listaAsistencias.length
    : (emp?.asistenciasCount ?? emp?._count.asistencias ?? 0);

  const totalInasistenciasCount = historialCompleto.length > 0
    ? listaInasistencias.length
    : (emp?.inasistenciasCount ?? 0);

  // Limpieza al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setVistaActiva("TAREAS");
    }
  }, [isOpen, emp?.id]);

  // Auto-scroll suave a la sección solicitada
  useEffect(() => {
    if (isOpen && scrollToSeccion === "TAREAS") {
      setVistaActiva("TAREAS");
      const timer = setTimeout(() => {
        seccionTabsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToSeccion, emp?.id]);

  if (!emp) return null;

  const cargoConfig = CARGO_CONFIG[emp.cargo] || CARGO_CONFIG.OTRO;
  const cargoNombre = getCargoLabel(emp.cargo, emp.cargoPersonalizado);
  const nombreCompleto = `${emp.nombre} ${emp.apellido || ""}`.trim();
  const cleanPhone = emp.telefono.replace(/[^\d+]/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.replace("+", "")}` : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha Integral del Trabajador"
      subtitle={`${nombreCompleto} • ${cargoNombre}`}
      icon={User}
      headerVariant="green"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Cabecera Principal de Identidad */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-heading font-black text-sm sm:text-base shrink-0 border shadow-2xs ${getCargoAvatarColors(
                  emp.cargo
                )}`}
              >
                {getInitials(emp.nombre, emp.apellido)}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-lg sm:text-xl font-black font-heading text-slate-900 tracking-tight truncate">
                  {nombreCompleto}
                </h2>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-lg border shadow-2xs ${cargoConfig.badgeClass}`}
                  >
                    {getCargoIcon(emp.cargo)}
                    <span>{cargoNombre}</span>
                  </span>

                  <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-mono shadow-2xs">
                    {emp.cedula}
                  </span>

                  {!emp.activo && (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                      Inactivo
                    </span>
                  )}

                  {emp.asistenciaHoy ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${
                        ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].badgeClass
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].dotColor
                        }`}
                      />
                      Hoy: {ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Hoy: Sin marcar
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones Rápidas en Desktop */}
            <div className="hidden sm:flex sm:items-center sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegistrarAsistencia(emp);
                }}
                className="h-9.5 px-3.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
                title="Registrar o verificar asistencia del día"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Asistencia</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAsignarTarea(emp);
                }}
                className="h-9.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span>Asignar Tarea</span>
              </button>
            </div>
          </div>

          {/* Datos del Colaborador */}
          <div className="pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            {/* Teléfono & WhatsApp */}
            <div className="flex items-center gap-2 min-w-0 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#175E38] flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-slate-800 truncate select-all">
                  {emp.telefono}
                </span>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] hover:scale-105 active:scale-95 transition-all shrink-0 border border-[#25D366]/20"
                    title="Contactar vía WhatsApp"
                  >
                    <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Inmueble Asignado */}
            <div className="flex items-center gap-2 min-w-0 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 truncate">
                <span className="font-semibold text-slate-800">
                  {emp.propiedad ? emp.propiedad.nombre : "Sede Central / Multipropiedad"}
                </span>
                {emp.propiedad?.ciudad && (
                  <span className="text-slate-400 font-normal ml-1">
                    • {emp.propiedad.ciudad}
                  </span>
                )}
              </div>
            </div>

            {/* Correo Electrónico */}
            <div className="flex items-center gap-2 min-w-0 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span
                className="font-semibold text-slate-800 truncate"
                title={emp.email || "Sin correo corporativo"}
              >
                {emp.email || "Sin correo corporativo"}
              </span>
            </div>

            {/* Ingreso y Honorarios */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 text-slate-700">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-600">
                  Ingreso:{" "}
                  <strong className="text-slate-800 font-semibold">
                    {new Date(emp.fechaIngreso).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>
              {emp.salarioMensual ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#175E38]/10 text-[#175E38] font-black text-xs font-mono shrink-0">
                  ${emp.salarioMensual.toFixed(2)} USD/mes
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 italic shrink-0">Sin honorarios</span>
              )}
            </div>

            {/* Dirección */}
            {emp.direccion && (
              <div className="sm:col-span-2 flex items-center gap-2 min-w-0 text-slate-600 pt-1.5 border-t border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{emp.direccion}</span>
              </div>
            )}
          </div>

          {/* Notas Internas */}
          {emp.notas && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed line-clamp-2">{emp.notas}</p>
            </div>
          )}
        </div>

        {/* StatCards de Desempeño */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Total Tareas"
            value={emp._count.tareas}
            icon={Briefcase}
            color="navy"
            subtitle="Asignadas en total"
            onClick={() => setVistaActiva("TAREAS")}
          />

          <StatCard
            title="Pendientes"
            value={emp.tareasPendientesCount}
            icon={AlertTriangle}
            color="amber"
            subtitle={
              emp.tareasPendientesCount === 1 ? "1 orden activa" : `${emp.tareasPendientesCount} órdenes activas`
            }
            onClick={() => setVistaActiva("TAREAS")}
          />

          <StatCard
            title="Asistencias"
            value={totalAsistenciasCount}
            icon={CheckCircle2}
            color="emerald"
            subtitle="Ver jornadas efectivas"
            onClick={() => setVistaActiva("ASISTENCIAS")}
          />

          <StatCard
            title="Inasistencias"
            value={totalInasistenciasCount}
            icon={UserX}
            color="rose"
            subtitle={
              totalInasistenciasCount === 0
                ? "Sin faltas registradas"
                : `${totalInasistenciasCount} faltas (Ver detalle)`
            }
            onClick={() => setVistaActiva("INASISTENCIAS")}
          />
        </div>

        {/* Pestañas de Vista */}
        <div
          ref={seccionTabsRef}
          className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full scroll-mt-3"
        >
          <button
            type="button"
            onClick={() => setVistaActiva("TAREAS")}
            className={`h-13 sm:h-9.5 px-1 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer flex-1 ${
              vistaActiva === "TAREAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 shrink-0">
              <Briefcase className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#1C2539] shrink-0" />
              <span className="sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none bg-slate-200/90 text-slate-700">
                {tareasEmpleado.length}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
              <span className="sm:hidden">Tareas</span>
              <span className="hidden sm:inline">Órdenes de Trabajo</span>
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700 shrink-0">
              {tareasEmpleado.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaActiva("ASISTENCIAS")}
            className={`h-13 sm:h-9.5 px-1 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer flex-1 ${
              vistaActiva === "ASISTENCIAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#175E38] shrink-0" />
              <span className="sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none bg-emerald-100 text-emerald-800">
                {totalAsistenciasCount}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
              <span className="sm:hidden">Asistencia</span>
              <span className="hidden sm:inline">Historial de Asistencias</span>
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 shrink-0">
              {totalAsistenciasCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaActiva("INASISTENCIAS")}
            className={`h-13 sm:h-9.5 px-1 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer flex-1 ${
              vistaActiva === "INASISTENCIAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 shrink-0">
              <UserX className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
              <span
                className={`sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none ${
                  totalInasistenciasCount > 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-200/90 text-slate-600"
                }`}
              >
                {totalInasistenciasCount}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
              <span className="sm:hidden">Faltas</span>
              <span className="hidden sm:inline">Inasistencias y Faltas</span>
            </span>
            <span
              className={`hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                totalInasistenciasCount > 0
                  ? "bg-rose-100 text-rose-800 font-bold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalInasistenciasCount}
            </span>
          </button>
        </div>

        {/* Sección 1: Tareas */}
        {vistaActiva === "TAREAS" && (
          <EmpleadoTareasSection
            emp={emp}
            tareasEmpleado={tareasEmpleado}
            onAsignarTarea={onAsignarTarea}
            onSeleccionarTarea={onSeleccionarTarea}
            onClose={onClose}
          />
        )}

        {/* Sección 2: Asistencias */}
        {vistaActiva === "ASISTENCIAS" && (
          <EmpleadoAsistenciasSection
            emp={emp}
            listaAsistencias={listaAsistencias}
            cargandoHistorial={cargandoHistorial}
            onRegistrarAsistencia={onRegistrarAsistencia}
            onEditarAsistencia={onEditarAsistencia}
          />
        )}

        {/* Sección 3: Inasistencias */}
        {vistaActiva === "INASISTENCIAS" && (
          <EmpleadoInasistenciasSection
            emp={emp}
            listaInasistencias={listaInasistencias}
            cargandoHistorial={cargandoHistorial}
            onRegistrarAsistencia={onRegistrarAsistencia}
            onEditarAsistencia={onEditarAsistencia}
          />
        )}

        {/* Footer Institucional de la Ficha */}
        <div className="pt-3 border-t border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 h-10 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center"
          >
            Cerrar Ficha
          </button>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRegistrarAsistencia(emp);
              }}
              className="h-10 px-3.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
              title="Registrar o verificar asistencia del día"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Asistencia</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAsignarTarea(emp);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span>Asignar Tarea</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
