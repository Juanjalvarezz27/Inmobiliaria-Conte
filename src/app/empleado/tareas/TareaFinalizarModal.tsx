"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  FileCheck2,
  Camera,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Maximize2,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagenes, formatearBytes } from "@/lib/file-compressor";
import { completarTareaEmpleadoAction, type PortalEmpleadoData } from "@/lib/actions/personal-portal";
import { EstadoTarea } from "@prisma/client";
import { formatearFechaNumerica } from "@/lib/date-utils";

const MAX_FOTOS = 2;

interface TareaFinalizarModalProps {
  tarea: PortalEmpleadoData["tareas"][0] | null;
  empleadoNombre: string;
  onClose: () => void;
  onSuccess: (tareaActualizada: PortalEmpleadoData["tareas"][0]) => void;
  onVerImagen: (url: string) => void;
}

// Modal institucional para concluir y evidenciar una orden de trabajo
export function TareaFinalizarModal({
  tarea,
  empleadoNombre,
  onClose,
  onSuccess,
  onVerImagen,
}: TareaFinalizarModalProps) {
  const [notasResolucion, setNotasResolucion] = useState("");
  const [evidencias, setEvidencias] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar estado al abrir el modal con una nueva tarea
  useEffect(() => {
    if (tarea) {
      setNotasResolucion(tarea.notasResolucion || "");
      setEvidencias(tarea.evidencias || []);
      setIsDragOver(false);
    }
  }, [tarea]);

  // Hook de UploadThing para evidencias de tareas
  const { startUpload, isUploading } = useOperacionesUploadThing("fotoTarea", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const nuevasUrls = res.map((r: any) => r.ufsUrl || r.url).filter(Boolean);
        setEvidencias((prev) => [...prev, ...nuevasUrls].slice(0, MAX_FOTOS));
        toast.success(
          nuevasUrls.length === 1
            ? "Fotografía de evidencia cargada correctamente."
            : `${nuevasUrls.length} fotografías cargadas correctamente.`
        );
      }
    },
    onUploadError: (err) => {
      console.error("Error al subir evidencias:", err);
      toast.error(err.message || "Error al subir las imágenes.");
    },
  });

  // Manejador de subida de archivos con compresión previa
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const espacioDisponible = MAX_FOTOS - evidencias.length;
    if (espacioDisponible <= 0) {
      toast.error(`Solo puedes subir hasta ${MAX_FOTOS} fotografías de comprobante.`);
      return;
    }

    const imagenesValidas = fileArray.filter((f) => f.type.startsWith("image/"));
    if (imagenesValidas.length === 0) {
      toast.error("Solo se permiten archivos de imagen (JPG, PNG, WebP).");
      return;
    }

    const seleccionadas = imagenesValidas.slice(0, espacioDisponible);

    setIsCompressing(true);
    let archivosASubir: File[];
    try {
      const resultados = await comprimirImagenes(seleccionadas);
      archivosASubir = resultados.map((r) => r.file);
      const pesoOriginal = resultados.reduce((s, r) => s + r.pesoOriginal, 0);
      const pesoFinal = resultados.reduce((s, r) => s + r.pesoFinal, 0);
      const ahorro = Math.round((1 - pesoFinal / pesoOriginal) * 100);
      if (ahorro >= 5) {
        toast.info(`Fotos optimizadas: ${formatearBytes(pesoOriginal)} → ${formatearBytes(pesoFinal)} (−${ahorro}%)`);
      }
    } finally {
      setIsCompressing(false);
    }

    await startUpload(archivosASubir);
  };

  // Guardar finalización
  const handleGuardarFinalizacion = async () => {
    if (!tarea) return;

    if (tarea.requiereEvidencia && evidencias.length === 0) {
      toast.error("Esta labor requiere al menos una fotografía de evidencia para poder finalizarse.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await completarTareaEmpleadoAction(
        tarea.id,
        notasResolucion.trim() || null,
        evidencias
      );

      if (res.success) {
        toast.success("¡Labor completada con éxito! Gran trabajo.");
        const ahora = new Date().toISOString();
        const tareaActualizada: PortalEmpleadoData["tareas"][0] = {
          ...tarea,
          estado: EstadoTarea.COMPLETADA,
          fechaCompletada: ahora,
          notasResolucion: notasResolucion.trim() || null,
          evidencias,
        };
        onSuccess(tareaActualizada);
        onClose();
      } else {
        toast.error(res.error || "No se pudo finalizar la tarea.");
      }
    } catch {
      toast.error("Error al finalizar la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tarea) return null;

  return (
    <Modal
      isOpen={!!tarea}
      onClose={onClose}
      title="Ficha de Conclusión de Labor"
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
              {tarea.requiereEvidencia ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs shrink-0">
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>Foto obligatoria</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0">
                  <span>Foto opcional</span>
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

        {/* Paso 1: Observaciones y Resolución */}
        <div className="space-y-2">
          <FormSectionHeader step={1} title="Resolución y Observaciones de la Labor" />
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notas u Observaciones del Trabajo Realizado (Opcional)
            </label>
            <textarea
              value={notasResolucion}
              onChange={(e) => setNotasResolucion(e.target.value)}
              placeholder="Ej: Se realizaron las pruebas del sistema, cambio de repuestos y verificación de presiones conforme a lo indicado..."
              rows={3}
              className="w-full p-3 min-h-[84px] rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
            />
          </div>
        </div>

        {/* Paso 2: Evidencias Fotográficas */}
        <div className="space-y-3">
          <FormSectionHeader step={2} title="Evidencias Fotográficas del Trabajo" />

          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Fotografías de Comprobante / Evidencia
              {tarea.requiereEvidencia && (
                <span className="text-rose-600 font-bold ml-1">* Obligatoria</span>
              )}
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
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={isUploading || isCompressing || evidencias.length >= MAX_FOTOS}
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
                e.target.value = "";
              }
            }}
          />

          {/* Si no hay fotos todavía: Dropzone amplia y estilizada */}
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
              className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 transition-all flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
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
                  <span className="text-xs font-bold">Subiendo fotografía a la nube...</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 text-[#175E38] flex items-center justify-center shadow-2xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      Tomar foto con la cámara o seleccionar de la galería
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Máximo {MAX_FOTOS} fotografías en JPG, PNG o WebP (hasta 4MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 px-4 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-2xs active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Seleccionar Foto</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Si ya hay fotos cargadas: cuadrícula de tarjetas con zoom y eliminar */}
          {evidencias.length > 0 && (
            <div className="space-y-3">
              <div className={`grid ${evidencias.length === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"} gap-3`}>
                {evidencias.map((url, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-2xs hover:shadow-md transition-all"
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
                    <button
                      type="button"
                      onClick={() => onVerImagen(url)}
                      title="Ver fotografía ampliada"
                      className="absolute bottom-2 left-2 z-10 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvidencias((prev) => prev.filter((_, i) => i !== idx))}
                      title="Eliminar fotografía"
                      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Botón para añadir la segunda foto si solo hay 1 */}
                {evidencias.length < MAX_FOTOS && (
                  <div
                    onClick={() => !isUploading && !isCompressing && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#175E38]/60 hover:bg-emerald-50/20 rounded-xl aspect-[4/3] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer p-3 transition-all"
                  >
                    {isCompressing || isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#175E38]" />
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                          <ImagePlus className="w-4 h-4 text-[#175E38]" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Agregar foto 2</span>
                        <span className="text-[10px] text-slate-400">PNG, JPG o WebP</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:flex sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 px-5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardarFinalizacion}
            disabled={isSubmitting || isUploading || isCompressing}
            className="h-11 px-6 rounded-xl font-heading font-black text-xs text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:from-[#124b2d] hover:to-[#0e3a23] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Completar Tarea</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
