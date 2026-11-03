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
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { EstadoAsistencia, CargoEmpleado } from "@prisma/client";
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

type VistaFicha = "TAREAS" | "ASISTENCIAS";

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
  // Pestaña activa dentro de la ficha del colaborador (solo 2 pestañas naturales)
  const [vistaActiva, setVistaActiva] = useState<VistaFicha>("TAREAS");

  // Historial dinámico de asistencias y faltas
  const [historialCompleto, setHistorialCompleto] = useState<RegistroAsistenciaItem[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const seccionTabsRef = useRef<HTMLDivElement>(null);

  // Cargar historial de asistencias al abrir la ficha del empleado
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

  // Conteos de asistencia para las StatCards
  const totalAsistenciasCount = useMemo(() => {
    if (historialCompleto.length > 0) {
      return historialCompleto.filter(
        (r) => r.estado === EstadoAsistencia.PRESENTE || r.estado === EstadoAsistencia.RETARDO
      ).length;
    }
    return emp?.asistenciasCount ?? emp?._count.asistencias ?? 0;
  }, [historialCompleto, emp]);

  const totalInasistenciasCount = useMemo(() => {
    if (historialCompleto.length > 0) {
      return historialCompleto.filter(
        (r) =>
          r.estado === EstadoAsistencia.FALTA_INJUSTIFICADA ||
          r.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
          r.estado === EstadoAsistencia.PERMISO
      ).length;
    }
    return emp?.inasistenciasCount ?? 0;
  }, [historialCompleto, emp]);

  const totalTareasPendientes = useMemo(() => {
    return tareasEmpleado.filter(
      (t) => t.estado === "PENDIENTE" || t.estado === "EN_PROCESO"
    ).length;
  }, [tareasEmpleado]);

  // Limpieza al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setVistaActiva("TAREAS");
    }
  }, [isOpen, emp?.id]);

  // Auto-scroll suave a la sección solicitada si viene por prop
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
    if (isOpen && scrollToSeccion === "ASISTENCIAS") {
      setVistaActiva("ASISTENCIAS");
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
      <div className="space-y-4 sm:space-y-5">
        {/* Cabecera Principal de Identidad Reorganizada */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-2xs space-y-4">
          {/* Identidad Principal: Iniciales compactas, Nombre y Cédula */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-heading font-black text-xs sm:text-sm shrink-0 border shadow-2xs ${getCargoAvatarColors(
                emp.cargo
              )}`}
            >
              {getInitials(emp.nombre, emp.apellido)}
            </div>

            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black font-heading text-slate-900 tracking-tight truncate">
                {nombreCompleto}
              </h2>

              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                C.I. {emp.cedula}
              </span>

              {!emp.activo && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                  Inactivo
                </span>
              )}
            </div>
          </div>

          {/* 3 Cajas de Datos Contextuales: Asignación, Contacto y Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-100">
            {/* 1. Asignación Laboral */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Inmueble Asignado</span>
              </div>
              <p
                className="text-xs font-semibold text-slate-800 truncate"
                title={emp.propiedad ? emp.propiedad.nombre : "Sede Central / Multipropiedad"}
              >
                {emp.propiedad ? emp.propiedad.nombre : "Sede Central / Multipropiedad"}
              </p>
              <p className="text-xs text-slate-600 truncate">
                {emp.propiedad?.ciudad ? `Ciudad: ${emp.propiedad.ciudad}` : "Sin ciudad asignada"}
                {emp.direccion ? ` • ${emp.direccion}` : ""}
              </p>
            </div>

            {/* 2. Contacto Directo */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                <Phone className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                <span>Contacto</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate select-all">
                  {emp.telefono}
                </span>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#25D366]/15 text-[#0d7340] hover:bg-[#25D366]/25 font-bold text-[10px] transition-all shrink-0 border border-[#25D366]/30 hover:scale-105 active:scale-95"
                    title="Contactar vía WhatsApp"
                  >
                    <WhatsAppIcon className="w-2.5 h-2.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
              <p
                className="text-xs text-slate-600 truncate"
                title={emp.email || "Sin correo corporativo"}
              >
                {emp.email ? emp.email : "Sin correo adicional"}
              </p>
            </div>

            {/* 3. Condiciones Laborales */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>Honorarios & Ingreso</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-[#175E38] font-mono">
                  {emp.salarioMensual ? `$${emp.salarioMensual.toFixed(2)} USD` : "Sin honorarios"}
                  <span className="text-xs font-medium text-slate-600 ml-0.5">/mes</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate">
                Ingreso:{" "}
                <span className="text-slate-800 font-semibold">
                  {new Date(emp.fechaIngreso).toLocaleDateString("es-VE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Notas Internas (solo si existen) */}
          {emp.notas && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed line-clamp-2">{emp.notas}</p>
            </div>
          )}
        </div>

        {/* 4 StatCards Oficiales con Efecto Sol y Relieve 3D */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Total Tareas"
            value={emp._count.tareas}
            icon={Briefcase}
            color="navy"
            className={`transition-all ${
              vistaActiva === "TAREAS"
                ? "ring-2 ring-[#1C2539]/30 border-slate-400 shadow-md"
                : ""
            }`}
            onClick={() => setVistaActiva("TAREAS")}
          />

          <StatCard
            title="Activas"
            value={totalTareasPendientes}
            icon={AlertTriangle}
            color="amber"
            className={`transition-all ${
              vistaActiva === "TAREAS" && totalTareasPendientes > 0
                ? "ring-2 ring-amber-400/40 border-amber-300 shadow-md"
                : ""
            }`}
            onClick={() => setVistaActiva("TAREAS")}
          />

          <StatCard
            title="Asistencias"
            value={totalAsistenciasCount}
            icon={CheckCircle2}
            color="emerald"
            className={`transition-all ${
              vistaActiva === "ASISTENCIAS"
                ? "ring-2 ring-[#175E38]/40 border-emerald-400 shadow-md"
                : ""
            }`}
            onClick={() => setVistaActiva("ASISTENCIAS")}
          />

          <StatCard
            title="Faltas"
            value={totalInasistenciasCount}
            icon={UserX}
            color="rose"
            className={`transition-all ${
              vistaActiva === "ASISTENCIAS" && totalInasistenciasCount > 0
                ? "ring-2 ring-rose-400/40 border-rose-300 shadow-md"
                : ""
            }`}
            onClick={() => setVistaActiva("ASISTENCIAS")}
          />
        </div>

        {/* Pestañas de Vista Unificadas (Solo 2 pestañas naturales) */}
        <div
          ref={seccionTabsRef}
          className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full scroll-mt-3"
        >
          <button
            type="button"
            onClick={() => setVistaActiva("TAREAS")}
            className={`h-10 sm:h-9.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vistaActiva === "TAREAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-[#1C2539] shrink-0" />
            <span>Tareas Asignadas</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-200/90 text-slate-700">
              {tareasEmpleado.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaActiva("ASISTENCIAS")}
            className={`h-10 sm:h-9.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vistaActiva === "ASISTENCIAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
            <span>Historial de Asistencia</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800">
              {historialCompleto.length > 0
                ? historialCompleto.length
                : emp.asistenciasCount + emp.inasistenciasCount}
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

        {/* Sección 2: Historial Unificado de Asistencia y Faltas */}
        {vistaActiva === "ASISTENCIAS" && (
          <EmpleadoAsistenciasSection
            emp={emp}
            historialCompleto={historialCompleto}
            cargandoHistorial={cargandoHistorial}
            onRegistrarAsistencia={onRegistrarAsistencia}
            onEditarAsistencia={onEditarAsistencia}
          />
        )}

        {/* Footer Institucional de la Ficha Contextual */}
        <div className="pt-3 border-t border-slate-200/90 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 h-10 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center"
          >
            Cerrar Ficha
          </button>

          <div className="w-full sm:w-auto flex items-center justify-end">
            {vistaActiva === "TAREAS" ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAsignarTarea(emp);
                }}
                className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Asignar Tarea</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegistrarAsistencia(emp);
                }}
                className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Registrar Marcaje</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
