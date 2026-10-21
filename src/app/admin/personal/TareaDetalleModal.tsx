"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Trash2,
  UploadCloud,
  FileCheck2,
  Loader2,
  Maximize2,
  ImagePlus,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { EstadoTarea } from "@prisma/client";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { eliminarImagenUploadThingAction } from "@/lib/actions/unidades";
import { comprimirImagenes, formatearBytes } from "@/lib/file-compressor";
import {
  ESTADO_TAREA_CONFIG,
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

const MAX_FOTOS = 2;

const OPCIONES_ESTADO = Object.entries(ESTADO_TAREA_CONFIG)
  .filter(([key]) => key !== EstadoTarea.EN_PROCESO)
  .map(([key, config]) => ({
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
    tarea?.estado === EstadoTarea.EN_PROCESO
      ? EstadoTarea.PENDIENTE
      : tarea?.estado || EstadoTarea.PENDIENTE
  );
  const [notasResolucion, setNotasResolucion] = useState(
    tarea?.notasResolucion || ""
  );
  const [evidencias, setEvidencias] = useState<string[]>(
    tarea?.evidencias || []
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook directo de UploadThing para operaciones diarias
  const { startUpload, isUploading } = useOperacionesUploadThing("fotoTarea", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const newUrls = res.map((r) => r.ufsUrl || r.url).filter(Boolean);
        setEvidencias((prev) => {
          const combinadas = [...prev, ...newUrls];
          return combinadas.slice(0, MAX_FOTOS);
        });
        toast.success(
          res.length === 1
            ? "Evidencia cargada exitosamente"
            : `${res.length} evidencias cargadas`
        );
      }
    },
    onUploadError: (error) => {
      toast.error(`Error al subir imagen: ${error.message}`);
    },
  });

  // Sincronizar al abrir o cambiar de tarea
  const [prevTarget, setPrevTarget] = useState<{ id?: string; isOpen: boolean }>({
    id: tarea?.id,
    isOpen,
  });

  if (prevTarget.id !== tarea?.id || prevTarget.isOpen !== isOpen) {
    setPrevTarget({ id: tarea?.id, isOpen });
    if (tarea) {
      setEstado(
        tarea.estado === EstadoTarea.EN_PROCESO ? EstadoTarea.PENDIENTE : tarea.estado
      );
      setNotasResolucion(tarea.notasResolucion || "");
      setEvidencias(tarea.evidencias || []);
      setConfirmarEliminar(false);
      setIsDragOver(false);
    }
  }

  if (!tarea) return null;

  const cargoConfig = CARGO_CONFIG[tarea.empleadoCargo];

  // Manejador de selección de archivos con compresión previa
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const espacioDisponible = MAX_FOTOS - evidencias.length;
    if (espacioDisponible <= 0) {
      toast.error(`Límite alcanzado: solo puedes subir hasta ${MAX_FOTOS} fotografías.`);
      return;
    }

    const imagenesValidas = fileArray.filter((f) => f.type.startsWith("image/"));
    if (imagenesValidas.length === 0) {
      toast.error("Solo se permiten archivos de imagen (JPG, PNG, WebP).");
      return;
    }

    const archivosSeleccionados = imagenesValidas.slice(0, espacioDisponible);

    setIsCompressing(true);
    let archivosASubir: File[];
    try {
      const resultados = await comprimirImagenes(archivosSeleccionados);
      archivosASubir = resultados.map((r) => r.file);

      const pesoOriginal = resultados.reduce((s, r) => s + r.pesoOriginal, 0);
      const pesoFinal = resultados.reduce((s, r) => s + r.pesoFinal, 0);
      const ahorroPct = Math.round((1 - pesoFinal / pesoOriginal) * 100);
      if (ahorroPct >= 5) {
        toast.info(
          `Imágenes optimizadas: ${formatearBytes(pesoOriginal)} → ${formatearBytes(pesoFinal)} (−${ahorroPct}%)`
        );
      }
    } finally {
      setIsCompressing(false);
    }

    await startUpload(archivosASubir);
  };

  // Eliminar fotografía individual
  const removeImagen = (indexToRemove: number) => {
    const urlAEliminar = evidencias[indexToRemove];
    setEvidencias((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (urlAEliminar) {
      eliminarImagenUploadThingAction(urlAEliminar).catch(() => {});
    }
  };

  const handleGuardarCambios = async () => {
    if (
      estado === EstadoTarea.COMPLETADA &&
      tarea.requiereEvidencia &&
      evidencias.length === 0
    ) {
      toast.error(
        "Esta labor requiere al menos una fotografía de evidencia para poder marcarse como completada."
      );
      return;
    }

    setIsSubmitting(true);
    const exito = await onActualizarEstado(
      tarea.id,
      estado,
      notasResolucion.trim() || null,
      evidencias
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha de Tarea Operativa"
      subtitle={`Orden #${tarea.id.slice(-6).toUpperCase()} • ${tarea.empleadoNombre}`}
      icon={FileCheck2}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Cabecera de la tarea: Título y Descripción */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg">
            {tarea.titulo}
          </h3>

          {tarea.descripcion && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {tarea.descripcion}
            </p>
          )}

          {/* Cajas de Metadatos */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/70 text-xs">
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

            {/* Exigencia de Fotos */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Fotos
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded border ${
                  tarea.requiereEvidencia
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <Camera className="w-3 h-3 shrink-0" />
                <span>{tarea.requiereEvidencia ? "Requeridas" : "Opcional"}</span>
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
                placeholder="Notas o detalles de resolución..."
                rows={3}
                className="w-full p-3 min-h-[84px] rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sección: Evidencias Fotográficas (Solo si la orden las requiere o si ya se cargaron fotos previamente) */}
        {(tarea.requiereEvidencia || evidencias.length > 0) && (
          <div className="space-y-3">
            <FormSectionHeader step={2} title="Evidencias Fotográficas del Trabajo" />

          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Fotografías de Evidencia
            </label>
            <span className="text-[11px] font-semibold text-slate-400">
              {evidencias.length} de {MAX_FOTOS} permitidas
            </span>
          </div>

          {/* Input oculto gestionado vía ref */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            disabled={isUploading || isCompressing || evidencias.length >= MAX_FOTOS}
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
                e.target.value = "";
              }
            }}
          />

          {/* Caso 1: Aún no hay evidencias cargadas */}
          {evidencias.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) {
                  handleFileSelect(e.dataTransfer.files);
                }
              }}
              onClick={() => !isUploading && !isCompressing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer ${
                isDragOver
                  ? "border-[#175E38] bg-emerald-50/40"
                  : "border-slate-200/90 bg-slate-50/50 hover:bg-emerald-50/20 hover:border-[#175E38]/50"
              } ${isUploading || isCompressing ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isCompressing ? (
                <div className="flex flex-col items-center gap-2 text-amber-600 py-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-bold">Comprimiendo imagen...</span>
                  <span className="text-[11px] text-amber-500/80">Optimizando peso antes de subir</span>
                </div>
              ) : isUploading ? (
                <div className="flex flex-col items-center gap-2 text-[#175E38] py-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-bold">Subiendo fotografía...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 text-slate-500 flex items-center justify-center shadow-2xs group-hover:text-[#175E38]">
                    <UploadCloud className="w-5 h-5 text-[#175E38]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">
                      Haz clic para agregar fotos o arrástralas aquí
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Máximo 2 evidencias en PNG, JPG o WebP (hasta 4MB)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Caso 2: Ya hay fotos cargadas */}
          {evidencias.length > 0 && (
            <div className="space-y-3">
              {/* 1 foto: centrada en medio */}
              {evidencias.length === 1 && (
                <div className="flex justify-center">
                  <div className="w-60 sm:w-64 max-w-full">
                    <div className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/90 bg-slate-100 shadow-2xs hover:shadow-md transition-all">
                      <Image
                        src={evidencias[0]}
                        alt="Evidencia 1"
                        fill
                        sizes="(max-width: 640px) 100vw, 260px"
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-[#175E38]/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Evidencia 1</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onVerFoto(evidencias[0])}
                        title="Ver fotografía ampliada"
                        className="absolute bottom-1.5 left-1.5 z-10 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImagen(0);
                        }}
                        title="Eliminar fotografía"
                        className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-lg bg-white/95 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center shadow-md transition-all opacity-100 sm:opacity-90 sm:group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2 fotos: una al lado de la otra */}
              {evidencias.length === 2 && (
                <div className="grid grid-cols-2 gap-3 max-w-md sm:max-w-lg mx-auto">
                  {evidencias.map((url, idx) => (
                    <div
                      key={url}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/90 bg-slate-100 shadow-2xs hover:shadow-md transition-all"
                    >
                      <Image
                        src={url}
                        alt={`Evidencia ${idx + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 240px"
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-[#175E38]/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Evidencia {idx + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onVerFoto(url)}
                        title="Ver fotografía ampliada"
                        className="absolute bottom-1.5 left-1.5 z-10 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImagen(idx);
                        }}
                        title="Eliminar fotografía"
                        className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-lg bg-white/95 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center shadow-md transition-all opacity-100 sm:opacity-90 sm:group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón para agregar otra foto si hay menos de 2 */}
              {evidencias.length < MAX_FOTOS && (
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    disabled={isUploading || isCompressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#175E38] bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/90 hover:border-emerald-300/80 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isCompressing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Comprimiendo...</span>
                      </>
                    ) : isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#175E38]" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-3.5 h-3.5 text-[#175E38]" />
                        <span>Agregar otra foto</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Zona Destructiva (Eliminar Tarea) y Botones de Acción */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setConfirmarEliminar(true)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer py-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar esta orden</span>
          </button>

          {/* Botones de Guardar */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading || isCompressing}
              className="h-10 sm:h-9.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleGuardarCambios}
              disabled={isSubmitting || isUploading || isCompressing}
              className="h-10 sm:h-9.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] disabled:opacity-50"
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

      {/* Modal de confirmación institucional para eliminar orden de trabajo */}
      <ConfirmActionModal
        isOpen={confirmarEliminar}
        onClose={() => setConfirmarEliminar(false)}
        onConfirm={handleEliminar}
        title="Eliminar Orden de Trabajo"
        subtitle="Confirmación de borrado operativo"
        variant="danger"
        icon={Trash2}
        description="¿Confirmas la eliminación permanente de esta orden de trabajo? La labor se retirará del historial y de los registros del inmueble."
        itemDetails={[
          { label: "Labor", value: tarea.titulo },
          { label: "Responsable", value: tarea.empleadoNombre },
          { label: "Ubicación", value: tarea.propiedadNombre || "Sede General" },
        ]}
        confirmButtonText="Eliminar Orden"
        cancelButtonText="Cancelar"
        isLoading={isSubmitting}
      />
    </Modal>
  );
}
