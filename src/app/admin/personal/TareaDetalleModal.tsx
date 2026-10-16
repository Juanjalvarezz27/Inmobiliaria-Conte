"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  User,
  Calendar,
  Trash2,
  UploadCloud,
  FileCheck2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { EstadoTarea } from "@prisma/client";
import { OperacionesUploadDropzone } from "@/lib/uploadthing";
import {
  ESTADO_TAREA_CONFIG,
  PRIORIDAD_TAREA_CONFIG,
  CARGO_CONFIG,
  type TareaEmpleadoItem,
} from "./types";

interface TareaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarea: TareaEmpleadoItem | null;
  onActualizarEstado: (
    tareaId: string,
    estado: EstadoTarea,
    notasResolucion?: string | null,
    nuevasEvidencias?: string[]
  ) => Promise<boolean>;
  onEliminarTarea: (tareaId: string) => Promise<boolean>;
  onVerFoto: (url: string) => void;
  isLoading?: boolean;
}

const OPCIONES_ESTADO = Object.entries(ESTADO_TAREA_CONFIG).map(([key, config]) => ({
  value: key,
  label: config.label,
}));

export function TareaDetalleModal({
  isOpen,
  onClose,
  tarea,
  onActualizarEstado,
  onEliminarTarea,
  onVerFoto,
  isLoading = false,
}: TareaDetalleModalProps) {
  const [estado, setEstado] = useState<EstadoTarea>(
    tarea?.estado || EstadoTarea.PENDIENTE
  );
  const [notasResolucion, setNotasResolucion] = useState(
    tarea?.notasResolucion || ""
  );
  const [nuevasEvidencias, setNuevasEvidencias] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  // Sincronizar al abrir
  const [prevTarget, setPrevTarget] = useState<{ id?: string; isOpen: boolean }>({
    id: tarea?.id,
    isOpen,
  });

  if (prevTarget.id !== tarea?.id || prevTarget.isOpen !== isOpen) {
    setPrevTarget({ id: tarea?.id, isOpen });
    if (tarea) {
      setEstado(tarea.estado);
      setNotasResolucion(tarea.notasResolucion || "");
      setNuevasEvidencias([]);
      setConfirmarEliminar(false);
    }
  }

  if (!tarea) return null;

  const prioridadConfig = PRIORIDAD_TAREA_CONFIG[tarea.prioridad];
  const cargoConfig = CARGO_CONFIG[tarea.empleadoCargo];

  const handleGuardarCambios = async () => {
    setIsSubmitting(true);
    const exito = await onActualizarEstado(
      tarea.id,
      estado,
      notasResolucion.trim() || null,
      nuevasEvidencias.length > 0 ? nuevasEvidencias : undefined
    );
    setIsSubmitting(false);
    if (exito) {
      onClose();
    }
  };

  const handleEliminar = async () => {
    setIsSubmitting(true);
    const exito = await onEliminarTarea(tarea.id);
    setIsSubmitting(false);
    if (exito) {
      onClose();
    }
  };

  const todasLasEvidencias = [...tarea.evidencias, ...nuevasEvidencias];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha de Tarea Operativa"
      subtitle={`Orden #${tarea.id.slice(-6).toUpperCase()} • ${tarea.empleadoNombre}`}
      icon={FileCheck2}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Cabecera de la tarea: Título, Estado y Prioridad */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg">
              {tarea.titulo}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${prioridadConfig.badgeClass}`}
            >
              {prioridadConfig.label}
            </span>
          </div>

          {tarea.descripcion && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {tarea.descripcion}
            </p>
          )}

          {/* Cajas de Metadatos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-xs">
            {/* Responsable */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Responsable
              </span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {tarea.empleadoNombre}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {cargoConfig.label}
              </span>
            </div>

            {/* Inmueble */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Ubicación
              </span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {tarea.propiedadNombre || "Sede General"}
              </span>
            </div>

            {/* Fecha Límite */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Límite
              </span>
              <span className="font-bold text-slate-800">
                {tarea.fechaLimite
                  ? new Date(tarea.fechaLimite).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "Sin fecha"}
              </span>
            </div>

            {/* Estado Actual */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Estatus
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold mt-0.5 ${
                  ESTADO_TAREA_CONFIG[tarea.estado].badgeClass
                }`}
              >
                {ESTADO_TAREA_CONFIG[tarea.estado].label}
              </span>
            </div>
          </div>
        </div>

        {/* Sección: Actualizar Estado */}
        <div className="space-y-4">
          <FormSectionHeader step={1} title="Actualizar Estatus de la Labor" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cambiar Estado de la Tarea
              </label>
              <Select
                value={estado}
                onChange={(val) => setEstado(val as EstadoTarea)}
                options={OPCIONES_ESTADO}
                placeholder="Seleccionar estado"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Notas de Resolución / Observaciones
              </label>
              <textarea
                value={notasResolucion}
                onChange={(e) => setNotasResolucion(e.target.value)}
                placeholder="Ej: Se cambiaron los sellos de la bomba y se purgaron las tuberías. Todo operativo."
                rows={2}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sección: Evidencias Fotográficas */}
        <div className="space-y-4">
          <FormSectionHeader step={2} title="Evidencias Fotográficas del Trabajo" />

          {/* Galería de fotos existentes */}
          {todasLasEvidencias.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Fotos adjuntas ({todasLasEvidencias.length})
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {todasLasEvidencias.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => onVerFoto(url)}
                    className="group/photo relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-xs hover:border-[#175E38] transition-all"
                  >
                    <img
                      src={url}
                      alt={`Evidencia ${idx + 1}`}
                      className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Ver
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dropzone para agregar más fotos */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
            <OperacionesUploadDropzone
              endpoint="fotoTarea"
              onClientUploadComplete={(res) => {
                if (res && res.length > 0) {
                  const urls = res.map((item) => item.url).filter(Boolean);
                  setNuevasEvidencias((prev) => [...prev, ...urls]);
                }
              }}
              onUploadError={(err) => {
                console.error("Error al subir foto:", err);
              }}
              appearance={{
                container: "border-none p-2 bg-transparent",
                button:
                  "bg-[#175E38] text-white text-xs font-bold px-4 py-2 rounded-xl border-b-[3px] border-b-[#0e3a23] cursor-pointer",
                label: "text-xs font-semibold text-slate-600",
                allowedContent: "text-[11px] text-slate-400",
              }}
            />
          </div>
        </div>

        {/* Zona Destructiva (Eliminar Tarea) */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
          {!confirmarEliminar ? (
            <button
              type="button"
              onClick={() => setConfirmarEliminar(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar esta orden</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-600">¿Estás seguro?</span>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmarEliminar(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Botones de Guardar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleGuardarCambios}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
