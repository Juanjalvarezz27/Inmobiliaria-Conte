"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
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
} from "lucide-react";
import {
  CategoriaNovedad,
  type IncidenciaItem,
  parseNovedadTitulo,
} from "@/lib/types/seguridad";
import { toast } from "sonner";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagenes, formatearBytes } from "@/lib/file-compressor";
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

  // Inicializar o limpiar campos al abrir o al cambiar la incidencia a editar
  useEffect(() => {
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
      const comprimidos = await comprimirImagenes(archivosAProcesar, {
        maxDimension: 1400,
        calidad: 0.78,
      });

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
          resetForm();
          onNovedadRegistrada();
          onClose();
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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
          <FormSectionHeader step={1} title="Tipo de Novedad o Actividad" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className={categoria === CategoriaNovedad.OTRO ? "sm:col-span-1" : "sm:col-span-2"}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
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
          <FormSectionHeader step={2} title="Detalle de la Novedad" />
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
          <FormSectionHeader step={3} title="Evidencia Fotográfica (Opcional)" />
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
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

            {/* Botón / Dropzone de carga */}
            {fotos.length < MAX_FOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isUploading}
                className="w-full h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#175E38] bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-all cursor-pointer"
              >
                {isCompressing || isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    <span>Cargando fotografía...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Tomar foto o subir captura ({fotos.length}/{MAX_FOTOS})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Botones de acción (50/50 en móvil) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="h-11 px-4 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading || isCompressing}
            className="h-11 px-6 rounded-xl text-xs sm:text-sm font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {incidenciaAEditar ? (
              <Pencil className="w-4 h-4 shrink-0" />
            ) : (
              <Plus className="w-4 h-4 shrink-0" />
            )}
            <span>
              {isSubmitting
                ? "Guardando..."
                : incidenciaAEditar
                ? "Guardar Cambios"
                : "Guardar en Bitácora"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
