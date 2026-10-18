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
import { CARGO_CONFIG, ESTADO_ASISTENCIA_CONFIG, type EmpleadoItem } from "./types";

interface EmpleadoCardProps {
  empleado: EmpleadoItem;
  onEditar: (emp: EmpleadoItem) => void;
  onToggleEstado: (emp: EmpleadoItem) => void;
  onVerDetalle: (emp: EmpleadoItem) => void;
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
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

export function EmpleadoCard({
  empleado: emp,
  onEditar,
  onToggleEstado,
  onVerDetalle,
  onAsignarTarea,
  onRegistrarAsistencia,
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
              <span className="truncate max-w-[140px] sm:max-w-[170px]">{cargoConfig.label}</span>
            </span>

            {/* Acciones Rápidas en la esquina superior derecha */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón Editar */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onEditar(emp)}
                  disabled={isPending}
                  title="Editar datos del colaborador"
                  aria-label="Editar colaborador"
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
                  title={emp.activo ? "Desactivar colaborador" : "Reactivar colaborador"}
                  aria-label={emp.activo ? "Desactivar colaborador" : "Reactivar colaborador"}
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

          {/* Nombre y Cédula */}
          <div>
            <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg leading-snug line-clamp-1 group-hover/empcard:text-[#175E38] transition-colors">
              {nombreCompleto}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                {emp.cedula}
              </span>
              {!emp.activo && (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  Inactivo
                </span>
              )}
            </div>
          </div>

          {/* Inmueble Asignado */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/90 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
            <span className="font-bold truncate">
              {emp.propiedad ? emp.propiedad.nombre : "Sede Central / Multipropiedad"}
            </span>
            {emp.propiedad?.ciudad && (
              <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                • {emp.propiedad.ciudad}
              </span>
            )}
          </div>

          {/* Teléfono y WhatsApp */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium truncate">{emp.telefono}</span>
              </div>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {emp.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{emp.email}</span>
              </div>
            )}
          </div>

          {/* Indicadores: Asistencia de Hoy y Tareas Pendientes */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Asistencia Hoy */}
            <div
              onClick={() => onRegistrarAsistencia(emp)}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 cursor-pointer transition-colors"
              title="Clic para registrar o ajustar asistencia"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Hoy</span>
                <Clock className="w-3 h-3 text-slate-400" />
              </div>
              <div className="mt-0.5">
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
                    {emp.asistenciaHoy.estado === EstadoAsistencia.PRESENTE
                      ? "Presente"
                      : emp.asistenciaHoy.estado === EstadoAsistencia.RETARDO
                      ? "Retardo"
                      : "Falta"}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">Sin marcar</span>
                )}
              </div>
            </div>

            {/* Tareas Pendientes */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Tareas</span>
                <AlertTriangle
                  className={`w-3 h-3 ${
                    emp.tareasPendientesCount > 0 ? "text-amber-500" : "text-slate-300"
                  }`}
                />
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`text-xs font-black font-heading ${
                    emp.tareasPendientesCount > 0 ? "text-amber-600" : "text-slate-600"
                  }`}
                >
                  {emp.tareasPendientesCount}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">pendientes</span>
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
