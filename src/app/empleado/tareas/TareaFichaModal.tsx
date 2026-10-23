"use client";

import Image from "next/image";
import {
  FileCheck2,
  CheckCircle2,
  Maximize2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import type { PortalEmpleadoData } from "@/lib/actions/personal-portal";
import { EstadoTarea } from "@prisma/client";
import { formatearFechaNumerica } from "@/lib/date-utils";

interface TareaFichaModalProps {
  tarea: PortalEmpleadoData["tareas"][0] | null;
  empleadoNombre: string;
  onClose: () => void;
  onCompletar: (tarea: PortalEmpleadoData["tareas"][0]) => void;
  onVerImagen: (url: string) => void;
}

// Modal de Ficha Técnica y Consulta de Evidencias bajo demanda
export function TareaFichaModal({
  tarea,
  empleadoNombre,
  onClose,
  onCompletar,
  onVerImagen,
}: TareaFichaModalProps) {
  if (!tarea) return null;

  return (
    <Modal
      isOpen={!!tarea}
      onClose={onClose}
      title="Ficha de Orden de Trabajo"
      subtitle={`Orden #${tarea.id.slice(-6).toUpperCase()} • ${empleadoNombre}`}
      icon={FileCheck2}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Tarjeta de Resumen de la Labor */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Labor Asignada
              </span>

              {tarea.estado === EstadoTarea.COMPLETADA ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38]" />
                  <span>Completada</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300/80 shadow-2xs shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Pendiente</span>
                </span>
              )}
            </div>

            <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg leading-snug">
              {tarea.titulo}
            </h3>
          </div>

          {tarea.descripcion && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {tarea.descripcion}
            </p>
          )}

          {/* Cajas de Metadatos Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-200/70 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Responsable
              </span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {empleadoNombre}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Ubicación
              </span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {tarea.propiedadNombre || "Sede General"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Límite
              </span>
              <span className="font-bold text-slate-800">
                {tarea.fechaLimite
                  ? formatearFechaNumerica(tarea.fechaLimite)
                  : "Sin fecha"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Prioridad
              </span>
              <span className="font-bold text-slate-800">
                {tarea.prioridad || "NORMAL"}
              </span>
            </div>
          </div>
        </div>

        {/* Resolución / Observaciones registradas */}
        {tarea.notasResolucion && (
          <div className="space-y-2">
            <FormSectionHeader step={1} title="Resolución Registrada" />
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {tarea.notasResolucion}
            </div>
          </div>
        )}

        {/* Evidencias fotográficas (cargadas exclusivamente bajo demanda al abrir este modal) */}
        {tarea.evidencias && tarea.evidencias.length > 0 && (
          <div className="space-y-3">
            <FormSectionHeader
              step={tarea.notasResolucion ? 2 : 1}
              title="Evidencias Fotográficas Adjuntas"
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <span className="text-xs font-bold text-slate-700">
                Fotografías de Comprobante ({tarea.evidencias.length})
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Haz clic para ampliar en pantalla completa
              </span>
            </div>

            <div
              className={`grid ${
                tarea.evidencias.length === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"
              } gap-3`}
            >
              {tarea.evidencias.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => onVerImagen(url)}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Image
                    src={url}
                    alt={`Evidencia ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#175E38]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Evidencia {idx + 1}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center shadow-xs">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center"
          >
            Cerrar
          </button>

          {tarea.estado !== EstadoTarea.COMPLETADA && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCompletar(tarea);
              }}
              className="w-full sm:w-auto h-11 px-6 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#124b2d] hover:to-[#0e3a23] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Completar Labor</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
