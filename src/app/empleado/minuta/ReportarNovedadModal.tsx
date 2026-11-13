"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  Car,
  HelpCircle,
  Camera,
  Trash2,
  Loader2,
  Plus,
  Building2,
  Pencil,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import {
  CategoriaNovedad,
  type IncidenciaItem,
  parseNovedadTitulo,
} from "@/lib/types/seguridad";
import { toast } from "sonner";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagenes, formatearBytes, PRESETS_COMPRESION } from "@/lib/file-compressor";
import {
  registrarIncidenciaAction,
  actualizarIncidenciaAction,
} from "@/lib/actions/seguridad";

interface ReportarNovedadModalProps {
  isOpen: boolean;
  onClose: () => void;
  propiedadId: string;
  propiedades?: Array<{ id: string; nombre: string }>;
  onNovedadRegistrada: () => void;
  esAdmin?: boolean;
  incidenciaAEditar?: IncidenciaItem | null;
}

const OPCIONES_CATEGORIA: SelectOption[] = [
  {
    value: CategoriaNovedad.RONDA_DE_RUTINA,
    label: "Vigilancia Diaria / Sin Novedades",
    description: "Supervisión rutinaria de la sede sin anomalías",
    icon: ShieldCheck,
  },
  {
    value: CategoriaNovedad.INCIDENCIA_SEGURIDAD,
    label: "Incidencia de Seguridad",
    description: "Puertas forzadas, personas no autorizadas, alarmas activadas",
    icon: AlertTriangle,
  },
  {
    value: CategoriaNovedad.FALLA_INFRAESTRUCTURA,
    label: "Falla / Avería en Inmueble",
    description: "Portones trabados, bombas de agua, filtraciones, iluminación",
    icon: Wrench,
  },
  {
    value: CategoriaNovedad.ACCESO_VEHICULAR,
    label: "Control de Acceso / Vehicular",
    description: "Carga y descarga, vehículos mal estacionados o sospechosos",
    icon: Car,
  },
  {
    value: CategoriaNovedad.OTRO,
    label: "Otro Suceso (Especificar)",
    description: "Cualquier reporte, suceso o novedad particular",
    icon: HelpCircle,
  },
];

const MAX_FOTOS = 2;

export function ReportarNovedadModal({
  isOpen,
  onClose,
  propiedadId,
  propiedades = [],
  onNovedadRegistrada,
  esAdmin = false,
  incidenciaAEditar = null,
}: ReportarNovedadModalProps) {
  const [targetPropiedadId, setTargetPropiedadId] = useState(propiedadId);
  const [categoria, setCategoria] = useState<CategoriaNovedad>(CategoriaNovedad.RONDA_DE_RUTINA);
  const [otroDetalle, setOtroDetalle] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Estados para el flujo guiado de notificación por WhatsApp
  const [novedadExitosa, setNovedadExitosa] = useState<{
    url: string;
    telefono: string;
    texto: string;
    inmuebleNombre: string;
    guardiaNombre: string;
    hora: string;
    categoria: string;
    titulo: string;
    descripcion: string;
  } | null>(null);
  const [yaNotificadoWhatsApp, setYaNotificadoWhatsApp] = useState(false);
  const [copiadoPortapapeles, setCopiadoPortapapeles] = useState(false);

  // Inicializar o limpiar campos al abrir o al cambiar la incidencia a editar
  useEffect(() => {
    setNovedadExitosa(null);
    setYaNotificadoWhatsApp(false);
    setCopiadoPortapapeles(false);

    if (incidenciaAEditar) {
      setTargetPropiedadId(incidenciaAEditar.propiedadId);
      setCategoria(incidenciaAEditar.categoria);
      const { badgeLabel, tituloLimpio } = parseNovedadTitulo(
        incidenciaAEditar.categoria,
        incidenciaAEditar.titulo
      );
      if (incidenciaAEditar.categoria === CategoriaNovedad.OTRO) {
        setOtroDetalle(badgeLabel !== "Otro Suceso" ? badgeLabel : "");
      } else {
        setOtroDetalle("");
      }
      setTitulo(tituloLimpio);
      setDescripcion(incidenciaAEditar.descripcion);
      setFotos(incidenciaAEditar.fotos || []);
    } else if (isOpen) {
      setTitulo("");
      setDescripcion("");
      setOtroDetalle("");
      setFotos([]);
      setCategoria(CategoriaNovedad.RONDA_DE_RUTINA);
      if (propiedadId) {
        setTargetPropiedadId(propiedadId);
      }
    }
  }, [isOpen, incidenciaAEditar, propiedadId]);

  const { startUpload, isUploading } = useOperacionesUploadThing("fotoIncidencia", {
    onClientUploadComplete: (res: Array<{ url: string; ufsUrl?: string }>) => {
      if (res && res.length > 0) {
        const urls = res.map((r) => r.ufsUrl || r.url).filter(Boolean);
        setFotos((prev) => [...prev, ...urls].slice(0, MAX_FOTOS));
        toast.success(
          urls.length === 1
            ? "Fotografía de respaldo cargada."
            : `${urls.length} fotografías cargadas.`
        );
      }
    },
    onUploadError: (err: Error) => {
      console.error("Error al subir foto:", err);
      toast.error(err.message || "Error al subir la imagen.");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const espacioDisponible = MAX_FOTOS - fotos.length;
    if (espacioDisponible <= 0) {
      toast.error(`Límite de ${MAX_FOTOS} fotografías alcanzado.`);
      return;
    }

    const archivosAProcesar = files.slice(0, espacioDisponible);

    try {
      setIsCompressing(true);
      toast.info("Optimizando fotografías...");
      // Preset optimizado para novedades y minutas de seguridad
      const comprimidos = await comprimirImagenes(archivosAProcesar, PRESETS_COMPRESION.fotosNovedad);

      const pesoOriginal = comprimidos.reduce((s, r) => s + r.pesoOriginal, 0);
      const pesoFinal = comprimidos.reduce((s, r) => s + r.pesoFinal, 0);
      const ahorro = Math.round((1 - pesoFinal / pesoOriginal) * 100);
      if (ahorro >= 5) {
        toast.info(
          `Fotos optimizadas: ${formatearBytes(pesoOriginal)} ➔ ${formatearBytes(pesoFinal)} (−${ahorro}%)`
        );
      }

      setIsCompressing(false);

      toast.info("Subiendo evidencia fotográfica...");
      const archivosParaSubir = comprimidos.map((item) => item.file);
      await startUpload(archivosParaSubir);
    } catch (err) {
      setIsCompressing(false);
      console.error("Error procesando imágenes:", err);
      toast.error("Error al procesar las imágenes.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  const handleEliminarFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitulo("");
    setDescripcion("");
    setOtroDetalle("");
    setFotos([]);
    setCategoria(CategoriaNovedad.RONDA_DE_RUTINA);
    setNovedadExitosa(null);
    setYaNotificadoWhatsApp(false);
    setCopiadoPortapapeles(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetPropiedadId) {
      toast.error("Debes seleccionar un inmueble.");
      return;
    }

    if (categoria === CategoriaNovedad.OTRO && !otroDetalle.trim()) {
      toast.error("Por favor especifica el tipo de suceso.");
      return;
    }

    if (!titulo.trim() || !descripcion.trim()) {
      toast.error("El título y la descripción son requeridos.");
      return;
    }

    // Si la categoría es OTRO, se incrusta el detalle especificado entre corchetes en el título
    const tituloFinal =
      categoria === CategoriaNovedad.OTRO && otroDetalle.trim()
        ? `[${otroDetalle.trim()}] ${titulo.trim()}`
        : titulo.trim();

    try {
      setIsSubmitting(true);

      if (incidenciaAEditar) {
        const res = await actualizarIncidenciaAction({
          id: incidenciaAEditar.id,
          propiedadId: targetPropiedadId,
          titulo: tituloFinal,
          descripcion: descripcion.trim(),
          categoria,
          fotos,
        });

        if (res.success) {
          toast.success(res.message);
          resetForm();
          onNovedadRegistrada();
          onClose();
        } else {
          toast.error(res.error || "No se pudo actualizar la incidencia.");
        }
      } else {
        const res = await registrarIncidenciaAction({
          propiedadId: targetPropiedadId,
          titulo: tituloFinal,
          descripcion: descripcion.trim(),
          categoria,
          fotos,
        });

        if (res.success) {
          toast.success(res.message);
          onNovedadRegistrada();
          // Desplegar flujo guiado de notificación para WhatsApp
          if (res.whatsAppData) {
            setNovedadExitosa(res.whatsAppData);
          } else {
            resetForm();
            onClose();
          }
        } else {
          toast.error(res.error || "No se pudo registrar la incidencia.");
        }
      }
    } catch (err) {
      console.error("Error al procesar incidencia:", err);
      toast.error("Ocurrió un error inesperado al procesar el reporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nombrePropiedad =
    propiedades.find((p) => p.id === targetPropiedadId)?.nombre || "Inmueble de Guardia";

  // Si la novedad se registró exitosamente, renderizar el flujo guiado de notificación para WhatsApp
  if (novedadExitosa) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => {
          resetForm();
          onClose();
        }}
        title="Novedad Asentada en Bitácora"
        subtitle="Notificación obligatoria de seguridad"
        icon={ShieldCheck}
        headerVariant="green"
        maxWidth="lg"
      >
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">
          {/* Banner de Éxito */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-center space-y-2 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#175E38] border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg">
                ¡Reporte Registrado con Éxito!
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                El suceso ha sido asentado en el libro de novedades. Notifica de inmediato al Administrador por WhatsApp con el parte oficial.
              </p>
            </div>
          </div>

          {/* Ficha Resumen del Parte */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Inmueble</span>
              <span className="font-bold text-slate-800">{novedadExitosa.inmuebleNombre}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Hora</span>
              <span className="font-semibold text-slate-700">{novedadExitosa.hora}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Categoría</span>
              <span className="font-semibold text-emerald-800">{novedadExitosa.categoria}</span>
            </div>
            <div className="pt-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Asunto</span>
              <p className="font-medium text-slate-800 leading-snug line-clamp-2">
                {novedadExitosa.titulo}
              </p>
            </div>
          </div>

          {/* Acciones de WhatsApp y Cierre */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                window.open(novedadExitosa.url, "_blank", "noopener,noreferrer");
                setYaNotificadoWhatsApp(true);
              }}
              className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#25D366]/25 border-b-[3px] border-b-[#128C7E] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>
                {yaNotificadoWhatsApp ? "Reabrir WhatsApp del Administrador" : "Notificar al Administrador por WhatsApp"}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(novedadExitosa.texto);
                  setCopiadoPortapapeles(true);
                  toast.success("Parte oficial copiado al portapapeles.");
                  setTimeout(() => setCopiadoPortapapeles(false), 2500);
                }}
                className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{copiadoPortapapeles ? "¡Copiado!" : "Copiar Texto"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="h-10 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                Volver a la Bitácora
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={incidenciaAEditar ? "Editar Novedad de Seguridad" : "Registrar Novedad"}
      subtitle={
        incidenciaAEditar
          ? `Modificando reporte de: ${nombrePropiedad}`
          : `Asentando reporte en: ${nombrePropiedad}`
      }
      icon={incidenciaAEditar ? Pencil : FileText}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        
        {/* Selector de Inmueble (solo disponible para Administrador en modo supervisión) */}
        {esAdmin && propiedades.length > 1 && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Inmueble / Sede <span className="text-rose-500">*</span></span>
            </label>
            <Select
              value={targetPropiedadId}
              onChange={setTargetPropiedadId}
              options={propiedades.map((p) => ({
                value: p.id,
                label: p.nombre,
              }))}
              placeholder="Seleccionar Inmueble"
              icon={<Building2 className="w-4 h-4 text-slate-400" />}
            />
          </div>
        )}

        {/* Paso 1: Categoría de la Novedad */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 1</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Tipo de Novedad o Actividad</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className={categoria === CategoriaNovedad.OTRO ? "sm:col-span-1" : "sm:col-span-2"}>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Categoría de la Novedad <span className="text-rose-500">*</span></span>
              </label>
              <Select
                value={categoria}
                onChange={(val) => setCategoria(val as CategoriaNovedad)}
                options={OPCIONES_CATEGORIA}
                placeholder="Seleccionar categoría..."
              />
            </div>

            {/* Campo condicional para especificar cuando se elige OTRO */}
            {categoria === CategoriaNovedad.OTRO && (
              <div className="sm:col-span-1 animate-in fade-in-0 duration-200">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1">
                  <span>Especificar Tipo de Suceso <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={otroDetalle}
                  onChange={(e) => setOtroDetalle(e.target.value)}
                  placeholder="Ej: Mudanza, corte eléctrico..."
                  maxLength={60}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Paso 2: Detalle de la Novedad */}
        <div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 2</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Detalle de la Novedad</h4>
          </div>
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Título o Resumen Breve <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Portón principal cerrado / Inspección rutinaria"
                maxLength={90}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Descripción Detallada <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Detalla lo observado, acciones tomadas o personas involucradas..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Paso 3: Evidencia Fotográfica Opcional */}
        <div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 3</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Evidencia Fotográfica (Opcional)</h4>
          </div>
          <div className="mt-3">
            {/* Input para galería o explorador de archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Input directo para disparar la cámara trasera del dispositivo móvil */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Galería de fotos cargadas */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                {fotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                    <Image
                      src={url}
                      alt="Foto novedad"
                      fill
                      sizes="(max-width: 640px) 50vw, 300px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleEliminarFoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botones táctiles duales: Cámara directa y Galería */}
            {fotos.length < MAX_FOTOS && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isCompressing || isUploading}
                  className="h-12 px-3 rounded-xl border border-emerald-300/80 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-98 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-[#175E38]" />
                  <span>Tomar Foto con Cámara</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing || isUploading}
                  className="h-12 px-3 rounded-xl border border-slate-300/80 bg-slate-50/80 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-98 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                  <span>Elegir de Galería ({fotos.length}/{MAX_FOTOS})</span>
                </button>
              </div>
            )}

            {(isCompressing || isUploading) && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 text-xs font-semibold text-[#175E38] animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-[#175E38]" />
                <span>Optimizando y subiendo evidencia fotográfica...</span>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="w-full sm:w-auto sm:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading || isCompressing}
            className="w-full sm:w-auto sm:min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                {incidenciaAEditar ? (
                  <Pencil className="w-4 h-4 shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {incidenciaAEditar ? "Guardar Cambios" : "Guardar en Bitácora"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
