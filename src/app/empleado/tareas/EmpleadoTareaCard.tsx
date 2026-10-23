"use client";

import {
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Eye,
} from "lucide-react";
import type { PortalEmpleadoData } from "@/lib/actions/personal-portal";
import { EstadoTarea } from "@prisma/client";
import { formatearFechaNumerica } from "@/lib/date-utils";

interface EmpleadoTareaCardProps {
  tarea: PortalEmpleadoData["tareas"][0];
  onCompletar: (tarea: PortalEmpleadoData["tareas"][0]) => void;
  onVerFicha: (tarea: PortalEmpleadoData["tareas"][0]) => void;
}

// Tarjeta individual de orden de trabajo para el portal del empleado
export function EmpleadoTareaCard({
  tarea,
  onCompletar,
  onVerFicha,
}: EmpleadoTareaCardProps) {
  const isCompletada = tarea.estado === EstadoTarea.COMPLETADA;

  return (
    <div className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between min-h-[260px]">
      {/* Sol decorativo en esquina superior izquierda */}
      <div className="absolute -top-7 -left-7 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none overflow-hidden rounded-full">
        <div
          className={`absolute inset-0 blur-xl ${
            isCompletada ? "bg-emerald-500/25" : "bg-amber-500/25"
          }`}
        />
        <div
          className={`absolute inset-2 rounded-full border ${
            isCompletada
              ? "border-emerald-400/30 bg-emerald-500/[0.08]"
              : "border-amber-400/30 bg-amber-500/[0.08]"
          }`}
        />
        <div
          className={`absolute inset-4 rounded-full bg-gradient-to-br to-transparent transition-transform duration-500 group-hover:scale-125 ${
            isCompletada ? "from-[#175E38]/30" : "from-amber-600/30"
          }`}
        />
      </div>

      {/* Contenido Superior de la Tarjeta */}
      <div className="p-4 sm:p-5 relative z-10 space-y-3">
        <div>
          {/* Badge de Estado y Exigencia de Foto */}
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            {isCompletada ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38]" />
                <span>Completada</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Pendiente</span>
              </span>
            )}

            {tarea.requiereEvidencia && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Camera className="w-3 h-3 text-amber-600" />
                <span>Requiere foto</span>
              </span>
            )}
          </div>

          {/* Título de la labor */}
          <h3
            onClick={() => onVerFicha(tarea)}
            className="font-heading font-black text-slate-900 text-base tracking-tight leading-snug line-clamp-2 hover:text-[#175E38] transition-colors cursor-pointer"
          >
            {tarea.titulo}
          </h3>

          {/* Descripción */}
          {tarea.descripcion && (
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
              {tarea.descripcion}
            </p>
          )}
        </div>

        {/* Metadatos y detalles de ubicación / fechas */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {tarea.propiedadNombre && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold truncate">{tarea.propiedadNombre}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            {tarea.fechaLimite && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Límite:{" "}
                  <strong className="text-slate-800 font-bold">
                    {formatearFechaNumerica(tarea.fechaLimite)}
                  </strong>
                </span>
              </div>
            )}

            {tarea.fechaCompletada && (
              <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Listo {formatearFechaNumerica(tarea.fechaCompletada)}</span>
              </div>
            )}
          </div>

          {/* Resumen liviano de evidencias y resolución */}
          <div className="space-y-1.5 pt-1">
            {tarea.evidencias && tarea.evidencias.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <Camera className="w-3 h-3 text-[#175E38] shrink-0" />
                  <span>
                    {tarea.evidencias.length}{" "}
                    {tarea.evidencias.length === 1 ? "evidencia adjunta" : "evidencias adjuntas"}
                  </span>
                </span>
              </div>
            )}

            {tarea.notasResolucion && (
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                <strong className="font-bold text-slate-900 block">Resolución:</strong>
                <p className="line-clamp-2 mt-0.5 text-slate-600">{tarea.notasResolucion}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer de Acciones táctiles 3D */}
      {!isCompletada ? (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 relative z-10">
          <button
            type="button"
            onClick={() => onCompletar(tarea)}
            className="w-full h-11 px-4 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#124b2d] hover:to-[#0e3a23] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{tarea.requiereEvidencia ? "Completar con Evidencia" : "Completar Labor"}</span>
          </button>
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 relative z-10">
          <button
            type="button"
            onClick={() => onVerFicha(tarea)}
            className="w-full h-11 px-4 rounded-xl font-heading font-black text-xs text-white bg-[#1C2539] hover:bg-[#2a3754] border-b-[3px] border-b-[#0f1624] active:translate-y-0.5 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-300" />
            <span>Ver Ficha y Evidencias</span>
          </button>
        </div>
      )}
    </div>
  );
}
