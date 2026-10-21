"use client";

import React from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Eye,
  Play,
  XCircle,
  Building2,
} from "lucide-react";
import { EstadoTarea, CargoEmpleado } from "@prisma/client";
import {
  ESTADO_TAREA_CONFIG,
  CARGO_CONFIG,
  type TareaEmpleadoItem,
} from "./types";

interface TareaCardProps {
  tarea: TareaEmpleadoItem;
  onVerDetalle: (tarea: TareaEmpleadoItem) => void;
  onGestionar?: (tarea: TareaEmpleadoItem) => void;
  onVerFoto?: (url: string) => void;
}

// Colores del efecto sol ambiental según estado de la tarea
function getTareaSunColors(tarea: TareaEmpleadoItem) {
  if (tarea.estado === EstadoTarea.COMPLETADA) {
    return {
      glow: "bg-emerald-500/20",
      ring: "bg-emerald-500/[0.08] border-emerald-400/25",
      sun: "from-[#175E38]/25 to-emerald-400/5",
    };
  }
  if (tarea.estado === EstadoTarea.CANCELADA) {
    return {
      glow: "bg-rose-500/20",
      ring: "bg-rose-500/[0.08] border-rose-400/25",
      sun: "from-rose-600/25 to-rose-400/5",
    };
  }
  if (tarea.estado === EstadoTarea.EN_PROCESO) {
    return {
      glow: "bg-amber-500/20",
      ring: "bg-amber-500/[0.08] border-amber-400/25",
      sun: "from-amber-600/25 to-amber-400/5",
    };
  }
  return {
    glow: "bg-blue-500/15",
    ring: "bg-blue-500/[0.06] border-blue-400/20",
    sun: "from-blue-600/20 to-transparent",
  };
}

// Iniciales del responsable de la tarea
function getInitials(nombre: string): string {
  const n = (nombre || "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return "TR";
}

// Color temático para avatar del responsable
function getCargoAvatarColors(cargo?: CargoEmpleado | null) {
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

// Icono temático según el estado de la tarea
function getEstadoIcon(estado: EstadoTarea) {
  switch (estado) {
    case EstadoTarea.COMPLETADA:
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case EstadoTarea.EN_PROCESO:
      return <Play className="w-3.5 h-3.5 fill-current" />;
    case EstadoTarea.CANCELADA:
      return <XCircle className="w-3.5 h-3.5" />;
    case EstadoTarea.PENDIENTE:
    default:
      return <Clock className="w-3.5 h-3.5" />;
  }
}

export function TareaCard({
  tarea: t,
  onVerDetalle,
}: TareaCardProps) {
  const estadoConfig = ESTADO_TAREA_CONFIG[t.estado];
  const cargoConfig = CARGO_CONFIG[t.empleadoCargo] || CARGO_CONFIG.OTRO;
  const sunColors = getTareaSunColors(t);

  // Verificación de vencimiento de fecha límite
  const fechaLimiteDate = t.fechaLimite ? new Date(t.fechaLimite) : null;
  const esVencida =
    fechaLimiteDate &&
    t.estado !== EstadoTarea.COMPLETADA &&
    t.estado !== EstadoTarea.CANCELADA &&
    fechaLimiteDate.getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="group/tcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
      {/* Efecto Sol ambiental en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${sunColors.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${sunColors.ring} border`} />
        <div
          className={`absolute inset-7 rounded-full bg-gradient-to-br ${sunColors.sun} transition-transform duration-500 group-hover/tcard:scale-125`}
        />
      </div>

      <div className="p-4 sm:p-5 space-y-3.5 relative z-10 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Cabecera: Estado de la Orden y Badges de Evidencias */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Badge de Estado */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${estadoConfig.badgeClass}`}
            >
              {getEstadoIcon(t.estado)}
              <span>{estadoConfig.label}</span>
            </span>

            {/* Conteo de fotos adjuntas sin cargar recursos */}
            {t.evidencias.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                <Camera className="w-3 h-3 text-[#175E38]" />
                <span>{t.evidencias.length}</span>
              </span>
            ) : t.requiereEvidencia ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md shrink-0"
                title="Se requerirá fotografía de evidencia al completar esta labor"
              >
                <Camera className="w-3 h-3 text-amber-600" />
                <span>Foto req.</span>
              </span>
            ) : null}
          </div>

          {/* Título y Descripción de la labor */}
          <div className="space-y-1">
            <h4
              onClick={() => onVerDetalle(t)}
              className="font-heading font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover/tcard:text-[#175E38] transition-colors cursor-pointer"
              title={t.titulo}
            >
              {t.titulo}
            </h4>
            {t.descripcion ? (
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {t.descripcion}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Sin descripción adicional</p>
            )}
          </div>

          {/* Ficha de Asignación Operativa: Responsable y Metadatos */}
          <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 text-xs">
            {/* Responsable con avatar más amplio y nombre con espacio libre */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading font-black text-xs shrink-0 border shadow-2xs ${getCargoAvatarColors(
                  t.empleadoCargo
                )}`}
              >
                {getInitials(t.empleadoNombre)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-black text-slate-900 text-sm truncate leading-tight">
                  {t.empleadoNombre}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                    {cargoConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadatos operativos: Propiedad arriba y Fecha límite abajo */}
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-[11px]">
              {/* Propiedad con ancho total */}
              <div
                className="flex items-center gap-1.5 text-slate-600"
                title={t.propiedadNombre || "Sede General"}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-medium text-slate-700">
                  {t.propiedadNombre || "Sede General"}
                </span>
              </div>

              {/* Fecha Límite */}
              <div className="flex items-center justify-between gap-2 text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Límite:{" "}
                    <strong className={esVencida ? "text-rose-600 font-bold" : "text-slate-800 font-semibold"}>
                      {t.fechaLimite
                        ? new Date(t.fechaLimite).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "Sin fecha fija"}
                    </strong>
                  </span>
                </div>

                {esVencida && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80 shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    Vencida
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Acción Unificada */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 relative z-10">
        <button
          type="button"
          onClick={() => onVerDetalle(t)}
          className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] border-b-[3px] border-b-[#121927] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>Ver Detalle</span>
        </button>
      </div>
    </div>
  );
}
