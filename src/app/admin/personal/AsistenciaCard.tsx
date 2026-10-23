"use client";

import React from "react";
import {
  Clock,
  LogOut,
  User,
  Briefcase,
  Wrench,
  Zap,
  Droplets,
  Shield,
  FileText,
} from "lucide-react";
import { CargoEmpleado, EstadoAsistencia } from "@prisma/client";
import {
  CARGO_CONFIG,
  ESTADO_ASISTENCIA_CONFIG,
  getCargoLabel,
  type EmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";

interface AsistenciaCardProps {
  empleado: EmpleadoItem;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onAjustarMarcaje: (emp: EmpleadoItem, reg?: RegistroAsistenciaItem | null) => void;
  onMarcarSalida: (params: {
    id: string;
    empleadoNombre: string;
    empleadoCargo: CargoEmpleado;
    horaEntrada: string;
  }) => void;
  onVerFicha: (emp: EmpleadoItem) => void;
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

// Efecto sol ambiental según estado de asistencia
function getAsistenciaSunColors(asist: RegistroAsistenciaItem | null | undefined) {
  if (!asist) {
    return {
      glow: "bg-amber-400/20",
      ring: "bg-amber-400/[0.08] border-amber-300/25",
      sun: "from-amber-500/20 to-transparent",
    };
  }

  switch (asist.estado) {
    case EstadoAsistencia.PRESENTE:
    case EstadoAsistencia.RETARDO:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/25 to-emerald-400/5",
      };
    case EstadoAsistencia.FALTA_JUSTIFICADA:
    case EstadoAsistencia.PERMISO:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    case EstadoAsistencia.FALTA_INJUSTIFICADA:
      return {
        glow: "bg-rose-500/20",
        ring: "bg-rose-500/[0.08] border-rose-400/25",
        sun: "from-rose-600/25 to-rose-400/5",
      };
    default:
      return {
        glow: "bg-slate-400/20",
        ring: "bg-slate-400/[0.08] border-slate-300/25",
        sun: "from-slate-500/20 to-transparent",
      };
  }
}

// Color temático para avatar
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

// Iniciales de empleado
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

export function AsistenciaCard({
  empleado: emp,
  onRegistrarAsistencia,
  onAjustarMarcaje,
  onMarcarSalida,
  onVerFicha,
  isPending = false,
}: AsistenciaCardProps) {
  const asist = emp.asistenciaHoy;
  const cargoConfig = CARGO_CONFIG[emp.cargo] || CARGO_CONFIG.OTRO;
  const sunColors = getAsistenciaSunColors(asist);
  const nombreCompleto = `${emp.nombre} ${emp.apellido || ""}`.trim();
  const estadoConfig = asist ? ESTADO_ASISTENCIA_CONFIG[asist.estado] : null;

  // Formato de horas de entrada y salida
  const horaEntrada = asist
    ? new Date(asist.horaEntrada).toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const horaSalida = asist?.horaSalida
    ? new Date(asist.horaSalida).toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="group/asiscard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
      {/* Efecto Sol ambiental en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${sunColors.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${sunColors.ring} border`} />
        <div
          className={`absolute inset-7 rounded-full bg-gradient-to-br ${sunColors.sun} transition-transform duration-500 group-hover/asiscard:scale-125`}
        />
      </div>

      <div className="p-4 sm:p-5 space-y-3.5 relative z-10 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Cabecera: Cargo operativo y estado de asistencia */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs ${cargoConfig.badgeClass}`}
            >
              {getCargoIcon(emp.cargo)}
              <span className="truncate max-w-[130px] sm:max-w-[150px]">
                {getCargoLabel(emp.cargo, emp.cargoPersonalizado)}
              </span>
            </span>

            {/* Badge de estado diario */}
            {asist && estadoConfig ? (
              <span
                className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-lg border shadow-2xs ${estadoConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${estadoConfig.dotColor}`} />
                <span>{estadoConfig.label}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Sin marcar</span>
              </span>
            )}
          </div>

          {/* Identidad del colaborador */}
          <div className="flex items-center gap-3 pt-0.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-heading font-black text-xs shrink-0 border shadow-2xs ${getCargoAvatarColors(
                emp.cargo
              )}`}
            >
              {getInitials(emp.nombre, emp.apellido)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base leading-tight truncate group-hover/asiscard:text-[#175E38] transition-colors">
                {nombreCompleto}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-semibold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                  {emp.cedula}
                </span>
              </div>
            </div>
          </div>

          {/* Caja de Registro de Horarios de Hoy */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Entrada */}
              <div className="p-1.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  <Clock className="w-3 h-3 text-[#175E38]" />
                  <span>Entrada</span>
                </div>
                <span
                  className={`font-mono text-xs sm:text-sm font-black ${
                    horaEntrada ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {horaEntrada || "--:--"}
                </span>
              </div>

              {/* Salida */}
              <div className="p-1.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  <LogOut className="w-3 h-3 text-slate-400" />
                  <span>Salida</span>
                </div>
                {horaSalida ? (
                  <span className="font-mono text-xs sm:text-sm font-black text-slate-900">
                    {horaSalida}
                  </span>
                ) : asist ? (
                  <span className="inline-flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En curso
                  </span>
                ) : (
                  <span className="font-mono text-xs sm:text-sm font-black text-slate-400">
                    --:--
                  </span>
                )}
              </div>
            </div>

            {/* Observaciones si existen */}
            {asist?.observaciones && (
              <p
                className="text-[11px] text-slate-500 italic truncate pt-1 border-t border-slate-200/60 text-center"
                title={asist.observaciones}
              >
                {asist.observaciones}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer de Acciones (1 Columna en Móvil, 2 Columnas en Desktop) */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-10">
        {/* Botón 1: Marcar Salida (si jornada en curso) o Ver Ficha */}
        {asist && !asist.horaSalida ? (
          <button
            type="button"
            onClick={() =>
              onMarcarSalida({
                id: asist.id,
                empleadoNombre: nombreCompleto,
                empleadoCargo: emp.cargo,
                horaEntrada: asist.horaEntrada,
              })
            }
            disabled={isPending}
            className="w-full h-10 px-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border-b-[3px] border-b-amber-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 order-1 sm:order-1"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Marcar Salida</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onVerFicha(emp)}
            disabled={isPending}
            className={`w-full h-10 px-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 ${
              !asist ? "order-2 sm:order-1" : "order-1 sm:order-1"
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ver Ficha</span>
          </button>
        )}

        {/* Botón 2: Registrar Entrada o Ajustar Marcaje */}
        <button
          type="button"
          onClick={() => {
            if (asist) {
              onAjustarMarcaje(emp, asist);
            } else {
              onRegistrarAsistencia(emp);
            }
          }}
          disabled={isPending}
          className={`w-full h-10 px-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5 ${
            !asist ? "order-1 sm:order-2" : "order-2 sm:order-2"
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          <span className="truncate">{asist ? "Ajustar Marcaje" : "Registrar Entrada"}</span>
        </button>
      </div>
    </div>
  );
}
