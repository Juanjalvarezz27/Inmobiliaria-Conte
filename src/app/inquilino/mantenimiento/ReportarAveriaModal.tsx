"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Wrench,
  Camera,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Trash2,
  AlertTriangle,
  Building2,
  Store,
  FileText,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  HelpCircle,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select, type SelectOption } from "@/components/ui/select";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagenes, formatearBytes } from "@/lib/file-compressor";
import { crearTicketInquilinoAction } from "@/lib/actions/mantenimiento";
import {
  CATEGORIAS_TICKET,
} from "@/lib/constants/mantenimiento";
import { CategoriaTicket } from "@prisma/client";

const MAX_FOTOS = 2;

interface LocalOpcion {
  unidadId: string;
  unidadCodigo: string;
  propiedadId: string;
  propiedadNombre: string;
  piso: string | null;
}

interface ReportarAveriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  locales: LocalOpcion[];
  propiedades: Array<{ id: string; nombre: string }>;
  onSuccess: () => void;
}

// Iconos dinámicos por categoría
function getCategoriaIcon(categoria: CategoriaTicket) {
  switch (categoria) {
    case CategoriaTicket.ELECTRICIDAD:
      return <Zap className="w-4 h-4 text-amber-500 shrink-0" />;
    case CategoriaTicket.PLOMERIA:
      return <Droplets className="w-4 h-4 text-blue-500 shrink-0" />;
    case CategoriaTicket.FILTRACIONES:
      return <CloudRain className="w-4 h-4 text-cyan-500 shrink-0" />;
    case CategoriaTicket.CERRAJERIA:
      return <Key className="w-4 h-4 text-amber-600 shrink-0" />;
    case CategoriaTicket.CLIMATIZACION:
      return <Wind className="w-4 h-4 text-teal-500 shrink-0" />;
    case CategoriaTicket.AREAS_COMUNES:
      return <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />;
    case CategoriaTicket.PINTURA_ALBANILERIA:
      return <Paintbrush className="w-4 h-4 text-orange-500 shrink-0" />;
    default:
      return <Wrench className="w-4 h-4 text-slate-500 shrink-0" />;
  }
}

export function ReportarAveriaModal({
  isOpen,
  onClose,
  locales,
  propiedades,
  onSuccess,
}: ReportarAveriaModalProps) {
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>(
    locales.length > 0 ? `LOCAL_${locales[0].unidadId}` : (propiedades[0] ? `PROP_${propiedades[0].id}` : "")
  );
  const [categoria, setCategoria] = useState<CategoriaTicket>(CategoriaTicket.PLOMERIA);
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState<string>("");
  const [titulo, setTitulo] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook UploadThing
  const { startUpload, isUploading } = useOperacionesUploadThing("fotoTicket", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const urls = res.map((r: any) => r.ufsUrl || r.url).filter(Boolean);
        setFotos((prev) => [...prev, ...urls].slice(0, MAX_FOTOS));
        toast.success(
          urls.length === 1
            ? "Fotografía de la avería adjuntada correctamente."
            : `${urls.length} fotografías adjuntadas.`
        );
      }
    },
    onUploadError: (err) => {
      console.error("Error al subir fotos:", err);
      toast.error("Error al subir las imágenes. Intenta con fotos más ligeras.");
    },
  });

  // Procesamiento y compresión WebP
  const handleArchivosSeleccionados = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      toast.error("Solo se permiten archivos de imagen (JPG, PNG, WebP).");
      return;
    }

    const cupoDisponible = MAX_FOTOS - fotos.length;
    if (cupoDisponible <= 0) {
      toast.warning(`Ya has alcanzado el límite de ${MAX_FOTOS} fotografías.`);
      return;
    }

    const archivosAProcesar = fileList.slice(0, cupoDisponible);

    try {
      setIsCompressing(true);
      const archivosComprimidos = await comprimirImagenes(archivosAProcesar, {
        maxDimension: 1600,
        calidad: 0.82,
      });
      setIsCompressing(false);

      const pesoOriginal = archivosComprimidos.reduce((s, r) => s + r.pesoOriginal, 0);
      const pesoFinal = archivosComprimidos.reduce((s, r) => s + r.pesoFinal, 0);
      const ahorroPct = Math.round((1 - pesoFinal / pesoOriginal) * 100);
      if (ahorroPct >= 5) {
        toast.info(
          `Fotografías optimizadas: ${formatearBytes(pesoOriginal)} → ${formatearBytes(pesoFinal)} (−${ahorroPct}%)`
        );
      }

      await startUpload(archivosComprimidos.map((r) => r.file));
    } catch (error) {
      setIsCompressing(false);
      console.error("Error al procesar imágenes:", error);
      toast.error("Ocurrió un error optimizando las imágenes.");
    }
  };

  const handleEliminarFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Construir opciones de ubicación
  const opcionesUbicacion: SelectOption[] = [];

  locales.forEach((loc) => {
    opcionesUbicacion.push({
      value: `LOCAL_${loc.unidadId}`,
      label: `Local ${loc.unidadCodigo} — ${loc.propiedadNombre}${loc.piso ? ` (Piso ${loc.piso})` : ""}`,
    });
  });

  propiedades.forEach((prop) => {
    opcionesUbicacion.push({
      value: `PROP_${prop.id}`,
      label: `Área Común / Pasillo — ${prop.nombre}`,
    });
  });

  // Opciones de categoría
  const opcionesCategoria: SelectOption[] = Object.entries(CATEGORIAS_TICKET).map(
    ([key, val]) => ({
      value: key,
      label: val.label,
    })
  );

  // Enviar reporte
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.error("Por favor ingresa un título o resumen del problema.");
      return;
    }
    if (titulo.trim().length < 5) {
      toast.error("El título debe tener al menos 5 caracteres descriptivos.");
      return;
    }
    if (!descripcion.trim() || descripcion.trim().length < 10) {
      toast.error("Por favor describe la falla con al menos 10 caracteres.");
      return;
    }

    let propiedadId = "";
    let unidadId: string | undefined = undefined;

    if (ubicacionSeleccionada.startsWith("LOCAL_")) {
      const uId = ubicacionSeleccionada.replace("LOCAL_", "");
      const loc = locales.find((l) => l.unidadId === uId);
      if (loc) {
        propiedadId = loc.propiedadId;
        unidadId = loc.unidadId;
      }
    } else if (ubicacionSeleccionada.startsWith("PROP_")) {
      propiedadId = ubicacionSeleccionada.replace("PROP_", "");
    }

    if (!propiedadId) {
      toast.error("Por favor selecciona la ubicación exacta de la avería.");
      return;
    }

    if (
      categoria === CategoriaTicket.OTRO &&
      (!categoriaPersonalizada.trim() || categoriaPersonalizada.trim().length < 3)
    ) {
      toast.error("Por favor especifica cuál es la otra incidencia (mínimo 3 caracteres).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await crearTicketInquilinoAction({
        propiedadId,
        unidadId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        categoriaPersonalizada:
          categoria === CategoriaTicket.OTRO ? categoriaPersonalizada.trim() : null,
        fotosAveria: fotos,
      });

      if (res.success) {
        toast.success("¡Avería reportada exitosamente! Nuestro equipo la atenderá a la brevedad.");
        onSuccess();
        onClose();
        // Reset
        setTitulo("");
        setDescripcion("");
        setCategoriaPersonalizada("");
        setFotos([]);
      } else {
        toast.error(res.error || "No se pudo registrar la solicitud.");
      }
    } catch (err) {
      console.error("Error al enviar ticket:", err);
      toast.error("Error inesperado al reportar la avería.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isCompressing || isUploading || isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reportar Problema o Avería"
      icon={Wrench}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paso 1: Ubicación y Clasificación */}
        <div>
          <FormSectionHeader
            step={1}
            title="Ubicación y Tipo de Incidencia"
          />
          <p className="text-xs text-slate-500 mt-1">
            Indica dónde se originó la avería y a qué especialidad técnica corresponde.
          </p>
          <div className="space-y-3.5 mt-3">
            {/* Ubicación */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#175E38]" />
                Ubicación del Problema <span className="text-rose-500">*</span>
              </label>
              <Select
                value={ubicacionSeleccionada}
                onChange={(val) => setUbicacionSeleccionada(val)}
                options={opcionesUbicacion}
                disabled={isBusy}
              />
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                {getCategoriaIcon(categoria)}
                Especialidad Técnica <span className="text-rose-500">*</span>
              </label>
              <Select
                value={categoria}
                onChange={(val) => setCategoria(val as CategoriaTicket)}
                options={opcionesCategoria}
                disabled={isBusy}
              />
            </div>

            {/* Si selecciona "Otras Incidencias", especificar cuál */}
            {categoria === CategoriaTicket.OTRO && (
              <div className="space-y-1 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5 text-[#175E38]" />
                  Especifica cuál es la incidencia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoriaPersonalizada}
                  onChange={(e) => setCategoriaPersonalizada(e.target.value)}
                  placeholder="Ej: Vidriería rota, persiana desprendida, plagas..."
                  maxLength={60}
                  disabled={isBusy}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all placeholder:text-slate-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Paso 2: Detalle de la Avería */}
        <div>
          <FormSectionHeader
            step={2}
            title="Descripción de la Falla"
          />
          <p className="text-xs text-slate-500 mt-1">
            Explica con la mayor precisión posible qué sucede para enviar al técnico con las herramientas adecuadas.
          </p>
          <div className="space-y-3 mt-3">
            {/* Título */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Resumen Breve del Problema <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Fuga de agua continua en la llave del baño"
                disabled={isBusy}
                maxLength={90}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Detalle y Síntomas Observados <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe qué ocurrió, si se corta la electricidad, si gotea, si comenzó hoy o lleva varios días..."
                rows={3}
                disabled={isBusy}
                maxLength={600}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all placeholder:text-slate-400 resize-none"
              />
              <p className="text-[11px] text-slate-400 text-right">
                {descripcion.length}/600 caracteres
              </p>
            </div>
          </div>
        </div>

        {/* Paso 3: Evidencias Fotográficas */}
        <div>
          <FormSectionHeader
            step={3}
            title="Fotografías de la Avería (Recomendado)"
          />
          <p className="text-xs text-slate-500 mt-1">
            Adjunta hasta {MAX_FOTOS} fotografías claras del daño o filtración.
          </p>
          <div className="mt-3 space-y-3">
            {/* Dropzone */}
            {fotos.length < MAX_FOTOS && (
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
                    handleArchivosSeleccionados(e.dataTransfer.files);
                  }
                }}
                onClick={() => !isBusy && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/60"
                    : "border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-400"
                } ${isBusy ? "opacity-60 pointer-events-none" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleArchivosSeleccionados(e.target.files);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#175E38] shadow-2xs">
                    {isCompressing || isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    {isCompressing
                      ? "Comprimiendo y optimizando fotos..."
                      : isUploading
                      ? "Cargando fotografías..."
                      : "Haz clic para subir o arrastra tus fotos aquí"}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Formato JPG, PNG o WebP (hasta {MAX_FOTOS - fotos.length} fotos restantes)
                  </p>
                </div>
              </div>
            )}

            {/* Cuadrícula de fotos subidas */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {fotos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
                  >
                    <Image
                      src={url}
                      alt={`Evidencia avería ${idx + 1}`}
                      fill
                      sizes="180px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => handleEliminarFoto(idx)}
                      disabled={isBusy}
                      title="Eliminar foto"
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                      Foto {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción inferiores */}
        <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="w-full sm:w-auto min-w-[120px] h-11 px-4 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="w-full sm:w-auto min-w-[190px] h-11 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Enviando Reporte...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Enviar Reporte de Avería</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
