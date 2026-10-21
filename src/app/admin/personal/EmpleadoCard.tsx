"use client";

import React from "react";
import {
  User,
  Wrench,
  Zap,
  Droplets,
  Shield,
  Briefcase,
  FileText,
  Pencil,
  Power,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Building2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { CargoEmpleado, EstadoAsistencia } from "@prisma/client";
import { CARGO_CONFIG, ESTADO_ASISTENCIA_CONFIG, getCargoLabel, type EmpleadoItem } from "./types";

interface EmpleadoCardProps {
  empleado: EmpleadoItem;
  onEditar: (emp: EmpleadoItem) => void;
  onToggleEstado: (emp: EmpleadoItem) => void;
  onVerDetalle: (emp: EmpleadoItem) => void;
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onVerTareas: (emp: EmpleadoItem) => void;
  isPending?: boolean;
}

// Icono temático según el cargo operativo
function getCargoIcon(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.CONSERJE:
      return <Briefcase className="w-3.5 h-3.5" />;
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
      return <Wrench className="w-3.5 h-3.5" />;
    case CargoEmpleado.ELECTRICISTA:
      return <Zap className="w-3.5 h-3.5" />;
    case CargoEmpleado.PLOMERO:
      return <Droplets className="w-3.5 h-3.5" />;
    case CargoEmpleado.SEGURIDAD:
      return <Shield className="w-3.5 h-3.5" />;
    case CargoEmpleado.SUPERVISOR:
      return <User className="w-3.5 h-3.5" />;
    case CargoEmpleado.ADMINISTRATIVO:
      return <FileText className="w-3.5 h-3.5" />;
    default:
      return <Briefcase className="w-3.5 h-3.5" />;
  }
}

// Colores del efecto sol ambiental según el cargo
function getCargoSunColors(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.ELECTRICISTA:
      return {
        glow: "bg-amber-500/20",
        ring: "bg-amber-500/[0.08] border-amber-400/25",
        sun: "from-amber-600/25 to-amber-400/5",
      };
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
    case CargoEmpleado.PLOMERO:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    case CargoEmpleado.SUPERVISOR:
      return {
        glow: "bg-indigo-500/20",
        ring: "bg-indigo-500/[0.08] border-indigo-400/25",
        sun: "from-indigo-600/25 to-indigo-400/5",
      };
    default:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
  }
}

// Colores del avatar según el cargo del trabajador
function getCargoAvatarColors(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.ELECTRICISTA:
      return "bg-amber-100 text-amber-900 border-amber-200/90";
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
    case CargoEmpleado.PLOMERO:
      return "bg-blue-100 text-blue-900 border-blue-200/90";
    case CargoEmpleado.SUPERVISOR:
      return "bg-indigo-100 text-indigo-900 border-indigo-200/90";
    case CargoEmpleado.ADMINISTRATIVO:
      return "bg-purple-100 text-purple-900 border-purple-200/90";
    case CargoEmpleado.SEGURIDAD:
      return "bg-slate-200 text-slate-800 border-slate-300";
    case CargoEmpleado.CONSERJE:
    default:
      return "bg-emerald-100 text-[#175E38] border-emerald-200/90";
  }
}

// Extrae las iniciales del trabajador
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

export function EmpleadoCard({
  empleado: emp,
  onEditar,
  onToggleEstado,
  onVerDetalle,
  onAsignarTarea,
  onRegistrarAsistencia,
  onVerTareas,
  isPending = false,
}: EmpleadoCardProps) {
  const cargoConfig = CARGO_CONFIG[emp.cargo] || CARGO_CONFIG.OTRO;
  const sunColors = getCargoSunColors(emp.cargo);
  const nombreCompleto = `${emp.nombre} ${emp.apellido || ""}`.trim();

  // Limpieza del número para enlace de WhatsApp
  const cleanPhone = emp.telefono.replace(/[^\d+]/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.replace("+", "")}` : null;

  return (
    <div className="group/empcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
      {/* Efecto Sol ambiental en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${sunColors.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${sunColors.ring} border`} />
        <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${sunColors.sun} transition-transform duration-500 group-hover/empcard:scale-125`} />
      </div>

      <div className="p-4 sm:p-5 space-y-3.5 relative z-10 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Cabecera de la tarjeta: Badge de Cargo y Acciones Rápidas */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs ${cargoConfig.badgeClass}`}
            >
              {getCargoIcon(emp.cargo)}
              <span className="truncate max-w-[140px] sm:max-w-[170px]">{getCargoLabel(emp.cargo, emp.cargoPersonalizado)}</span>
            </span>

            {/* Acciones Rápidas en la esquina superior derecha */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón Editar */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onEditar(emp)}
                  disabled={isPending}
                  title="Editar datos del trabajador"
                  aria-label="Editar trabajador"
                  className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-md whitespace-nowrap z-50">
                  Editar
                </span>
              </div>

              {/* Botón Activar / Suspender */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onToggleEstado(emp)}
                  disabled={isPending}
                  title={emp.activo ? "Desactivar trabajador" : "Reactivar trabajador"}
                  aria-label={emp.activo ? "Desactivar trabajador" : "Reactivar trabajador"}
                  className={`w-8 h-8 rounded-xl border hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                    emp.activo
                      ? "bg-rose-50 text-rose-600 border-rose-200/90 hover:bg-rose-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-md whitespace-nowrap z-50">
                  {emp.activo ? "Desactivar" : "Reactivar"}
                </span>
              </div>
            </div>
          </div>

          {/* Bloque de Identidad con Avatar y Datos Principales */}
          <div className="flex items-center gap-3 pt-0.5">
            {/* Avatar con Iniciales Temáticas */}
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-heading font-black text-xs shrink-0 border shadow-2xs ${getCargoAvatarColors(
                emp.cargo
              )}`}
            >
              {getInitials(emp.nombre, emp.apellido)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-black text-slate-900 text-base leading-tight truncate group-hover/empcard:text-[#175E38] transition-colors">
                {nombreCompleto}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                  {emp.cedula}
                </span>
                {!emp.activo && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                    Inactivo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inmueble Asignado: Compacto y Armónico */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50/90 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
            <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
            <span className="font-bold truncate">
              {emp.propiedad ? emp.propiedad.nombre : "Sede Central / Asignación General"}
            </span>
            {emp.propiedad?.ciudad && (
              <span className="text-[11px] text-slate-400 shrink-0 font-normal">
                • {emp.propiedad.ciudad}
              </span>
            )}
          </div>

          {/* Información de Contacto: Agrupada y Limpia */}
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{emp.telefono}</span>
              </div>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Contactar vía WhatsApp"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {emp.email && (
              <div className="flex items-center gap-1.5 text-slate-500 truncate pt-1 border-t border-slate-200/50">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate text-[11px]">{emp.email}</span>
              </div>
            )}
          </div>

          {/* Indicadores Operativos: Asistencia de Hoy y Órdenes de Trabajo */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {/* Asistencia Hoy */}
            <div
              onClick={() => onRegistrarAsistencia(emp)}
              className={`p-2.5 rounded-xl bg-white border cursor-pointer transition-all shadow-2xs group/asis flex flex-col justify-between ${
                emp.asistenciaHoy
                  ? "border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60"
                  : "border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/20"
              }`}
              title="Clic para registrar o ajustar asistencia"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                <span>Asistencia</span>
                <Clock
                  className={`w-3 h-3 transition-colors ${
                    emp.asistenciaHoy
                      ? "text-slate-400 group-hover/asis:text-[#175E38]"
                      : "text-amber-500 group-hover/asis:text-amber-600"
                  }`}
                />
              </div>
              <div>
                {emp.asistenciaHoy ? (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].badgeClass
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].dotColor
                      }`}
                    />
                    {ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado]?.label || "Presente"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Sin marcar
                  </span>
                )}
              </div>
            </div>

            {/* Órdenes / Tareas (Botón interactivo) */}
            <div
              onClick={() => onVerTareas(emp)}
              className="p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/20 shadow-2xs hover:shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
              title="Clic para ver o gestionar órdenes de trabajo asignadas"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-1">
                <span>Tareas</span>
                {emp.tareasPendientesCount > 0 ? (
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {emp.tareasPendientesCount > 0 ? (
                  <>
                    <span className="text-xs font-black font-heading text-amber-600">
                      {emp.tareasPendientesCount}
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">
                      {emp.tareasPendientesCount === 1 ? "pendiente" : "pendientes"}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/70">
                    Al día
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Acciones (Grid 50/50 de 2 Columnas Obligatorio) */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
        <button
          type="button"
          onClick={() => onVerDetalle(emp)}
          className="w-full h-10 px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Ver Ficha</span>
        </button>

        <button
          type="button"
          onClick={() => onAsignarTarea(emp)}
          className="w-full h-10 px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
        >
          <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          <span className="truncate">Asignar Tarea</span>
        </button>
      </div>
    </div>
  );
}
