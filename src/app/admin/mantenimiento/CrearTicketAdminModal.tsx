"use client";

import React, { useState, useRef, useMemo } from "react";
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
  User,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select, type SelectOption } from "@/components/ui/select";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagenes, formatearBytes } from "@/lib/file-compressor";
import {
  crearTicketAdminAction,
  type TecnicoDisponible,
} from "@/lib/actions/mantenimiento";
import {
  CATEGORIAS_TICKET,
  getAfinidadTecnico,
} from "@/lib/constants/mantenimiento";
import { CategoriaTicket } from "@prisma/client";

const MAX_FOTOS = 5;

interface PropiedadSimple {
  id: string;
  nombre: string;
  ciudad: string;
  unidades: Array<{
    id: string;
    codigo: string;
    tipo: string;
  }>;
}

interface CrearTicketAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  propiedades: PropiedadSimple[];
  tecnicos: TecnicoDisponible[];
  onSuccess: () => void;
}

export function CrearTicketAdminModal({
  isOpen,
  onClose,
  propiedades,
  tecnicos,
  onSuccess,
}: CrearTicketAdminModalProps) {
  const [propiedadId, setPropiedadId] = useState<string>(
    propiedades.length > 0 ? propiedades[0].id : ""
  );
  const [unidadId, setUnidadId] = useState<string>("");
  const [categoria, setCategoria] = useState<CategoriaTicket>(CategoriaTicket.PLOMERIA);
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState<string>("");
  const [empleadoId, setEmpleadoId] = useState<string>("SIN_ASIGNAR");
  const [titulo, setTitulo] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [notasAdmin, setNotasAdmin] = useState<string>("");
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
            ? "Fotografía cargada correctamente."
            : `${urls.length} fotografías cargadas correctamente.`
        );
      }
    },
    onUploadError: (err) => {
      console.error("Error al subir fotos:", err);
      toast.error("Error al subir las imágenes. Intenta con fotos más ligeras.");
    },
  });

  const handleArchivosSeleccionados = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP).");
      return;
    }

    const cupo = MAX_FOTOS - fotos.length;
    if (cupo <= 0) {
      toast.warning(`Límite máximo de ${MAX_FOTOS} fotos alcanzado.`);
      return;
    }

    const procesar = fileList.slice(0, cupo);

    try {
      setIsCompressing(true);
      const res = await comprimirImagenes(procesar, {
        maxDimension: 1600,
        calidad: 0.82,
      });
      setIsCompressing(false);

      const pesoOriginal = res.reduce((s, r) => s + r.pesoOriginal, 0);
      const pesoFinal = res.reduce((s, r) => s + r.pesoFinal, 0);
      const ahorroPct = Math.round((1 - pesoFinal / pesoOriginal) * 100);
      if (ahorroPct >= 5) {
        toast.info(
          `Imágenes optimizadas: ${formatearBytes(pesoOriginal)} → ${formatearBytes(pesoFinal)} (−${ahorroPct}%)`
        );
      }

      await startUpload(res.map((r) => r.file));
    } catch (error) {
      setIsCompressing(false);
      console.error("Error al procesar imágenes:", error);
      toast.error("Error al optimizar las imágenes.");
    }
  };

  const handleEliminarFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Opciones de propiedades con buscador y badges
  const opcionesPropiedad: SelectOption[] = useMemo(() => {
    return propiedades.map((p) => ({
      value: p.id,
      label: p.nombre,
      sublabel: p.ciudad,
      badge: {
        text: `${p.unidades?.length || 0} locales`,
        variant: "slate",
      },
    }));
  }, [propiedades]);

  // Unidades de la propiedad seleccionada
  const propiedadActiva = useMemo(
    () => propiedades.find((p) => p.id === propiedadId),
    [propiedades, propiedadId]
  );

  const opcionesUnidad: SelectOption[] = useMemo(() => {
    const lista: SelectOption[] = [
      {
        value: "AREAS_COMUNES",
        label: "Áreas Comunes / Fachada / Pasillos",
        sublabel: "Avería general (pasillos, bombas, fachada o áreas comunes)",
        badge: { text: "General", variant: "slate" },
      },
    ];

    if (propiedadActiva?.unidades && propiedadActiva.unidades.length > 0) {
      propiedadActiva.unidades.forEach((u) => {
        lista.push({
          value: u.id,
          label: `Local ${u.codigo}`,
          sublabel: `Tipo: ${u.tipo}`,
          badge: { text: u.tipo, variant: "blue" },
        });
      });
    }

    return lista;
  }, [propiedadActiva]);

  // Opciones de Categoría
  const opcionesCategoria: SelectOption[] = Object.entries(CATEGORIAS_TICKET).map(
    ([k, v]) => ({
      value: k,
      label: v.label,
    })
  );

  // Opciones de Técnico ordenadas por idoneidad con la categoría seleccionada
  const opcionesTecnicos: SelectOption[] = useMemo(() => {
    const ordenados = [...tecnicos].sort((a, b) => {
      const afinA = getAfinidadTecnico(a.cargo, categoria);
      const afinB = getAfinidadTecnico(b.cargo, categoria);
      if (afinB.score !== afinA.score) return afinB.score - afinA.score;
      if (a.ticketsActivosCount !== b.ticketsActivosCount) {
        return a.ticketsActivosCount - b.ticketsActivosCount;
      }
      return a.nombre.localeCompare(b.nombre);
    });

    return [
      { value: "SIN_ASIGNAR", label: "Sin Asignar (Dejar en bandeja)" },
      ...ordenados.map((t) => ({
        value: t.id,
        label: `${t.nombre} ${t.apellido || ""} (${t.cargo.replace(/_/g, " ")}) — ${t.ticketsActivosCount} activos`,
      })),
    ];
  }, [tecnicos, categoria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propiedadId) {
      toast.error("Por favor selecciona el inmueble.");
      return;
    }
    if (!titulo.trim() || titulo.trim().length < 5) {
      toast.error("Ingresa un título descriptivo de al menos 5 caracteres.");
      return;
    }
    if (!descripcion.trim() || descripcion.trim().length < 10) {
      toast.error("Describe la avería con al menos 10 caracteres.");
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
      const res = await crearTicketAdminAction({
        propiedadId,
        unidadId: unidadId && unidadId !== "AREAS_COMUNES" ? unidadId : undefined,
        categoria,
        categoriaPersonalizada:
          categoria === CategoriaTicket.OTRO ? categoriaPersonalizada.trim() : null,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fotosAveria: fotos,
        empleadoId: empleadoId === "SIN_ASIGNAR" ? undefined : empleadoId,
        notasAdmin: notasAdmin.trim() || undefined,
      });

      if (res.success) {
        toast.success("Ticket de avería registrado exitosamente en el sistema.");
        onSuccess();
        onClose();
        // Reset
        setUnidadId("");
        setTitulo("");
        setDescripcion("");
        setCategoriaPersonalizada("");
        setNotasAdmin("");
        setFotos([]);
      } else {
        toast.error(res.error || "No se pudo crear el ticket.");
      }
    } catch (err) {
      console.error("Error al crear ticket admin:", err);
      toast.error("Error inesperado al registrar el ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrar = () => {
    if (isBusy) return;
    setUnidadId("");
    setTitulo("");
    setDescripcion("");
    setCategoriaPersonalizada("");
    setNotasAdmin("");
    setFotos([]);
    onClose();
  };

  const isBusy = isCompressing || isUploading || isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCerrar}
      title="Registrar Avería o Incidencia Técnica"
      icon={Wrench}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Paso 1: Ubicación del Inmueble */}
        <div>
          <FormSectionHeader
            step={1}
            title="Inmueble y Ubicación del Problema"
          />
          <p className="text-xs text-slate-500 mt-1">
            Selecciona el edificio y si la avería afecta a un local o a las áreas comunes.
          </p>

          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#175E38]" />
                Inmueble / Edificio <span className="text-rose-500">*</span>
              </label>
              <Select
                value={propiedadId}
                onChange={(val) => {
                  setPropiedadId(val);
                  setUnidadId("");
                }}
                options={opcionesPropiedad}
                placeholder="Seleccionar inmueble..."
                searchable={true}
                searchPlaceholder="Buscar edificio por nombre o ciudad..."
                pageSize={8}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  Local o Espacio Específico
                </label>
                {unidadId && (
                  <button
                    type="button"
                    onClick={() => setUnidadId("")}
                    className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>
              <Select
                value={unidadId}
                onChange={(val) => setUnidadId(val)}
                options={opcionesUnidad}
                placeholder="Seleccionar local o áreas comunes..."
                searchable={true}
                searchPlaceholder="Buscar por código de local o áreas comunes..."
                pageSize={8}
                disabled={isBusy || !propiedadId}
              />
            </div>
          </div>
        </div>

        {/* Paso 2: Especialidad Técnica */}
        <div>
          <FormSectionHeader
            step={2}
            title="Especialidad Técnica"
          />
          <p className="text-xs text-slate-500 mt-1">
            Indica el ramo o especialidad a la que corresponde la avería.
          </p>

          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Especialidad Técnica <span className="text-rose-500">*</span>
              </label>
              <Select
                value={categoria}
                onChange={(val) => setCategoria(val as CategoriaTicket)}
                options={opcionesCategoria}
                disabled={isBusy}
              />
            </div>

            {categoria === CategoriaTicket.OTRO && (
              <div className="space-y-1 animate-in fade-in-50 duration-200">
                <label className="text-xs font-semibold text-slate-700">
                  Especifica cuál es la incidencia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoriaPersonalizada}
                  onChange={(e) => setCategoriaPersonalizada(e.target.value)}
                  placeholder="Ej: Vidriería rota, persiana desprendida, control de plagas..."
                  maxLength={60}
                  disabled={isBusy}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all placeholder:text-slate-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Paso 3: Detalle de la Avería */}
        <div>
          <FormSectionHeader
            step={3}
            title="Descripción de la Avería"
          />
          <div className="space-y-2.5 mt-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Título del Problema <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Falla en tablero principal de iluminación"
                maxLength={90}
                disabled={isBusy}
                className="w-full h-10 px-3 mt-1 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Detalle y Diagnóstico Preliminar <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Indica qué ocurrió, qué componentes están afectados o qué se necesita..."
                rows={2}
                maxLength={500}
                disabled={isBusy}
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Paso 4: Asignación de Personal Técnico */}
        <div>
          <FormSectionHeader
            step={4}
            title="Asignación de Personal Técnico"
          />
          <p className="text-xs text-slate-500 mt-1">
            Opcional. Puedes asignar un especialista ahora o dejar la incidencia en bandeja para asignarla luego.
          </p>

          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Asignar Técnico Ahora (Opcional)
              </label>
              <Select
                value={empleadoId}
                onChange={(val) => setEmpleadoId(val)}
                options={opcionesTecnicos}
                disabled={isBusy}
              />
            </div>

            {empleadoId !== "SIN_ASIGNAR" && (
              <div className="space-y-1 animate-in fade-in-50 duration-200">
                <label className="text-xs font-semibold text-slate-700">
                  Instrucciones o Notas Administrativas (Opcional)
                </label>
                <textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  placeholder="Ej: Pasar primero por conserjería a recoger la llave..."
                  rows={2}
                  maxLength={350}
                  disabled={isBusy}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Paso 5: Fotografías y Evidencias Visuales */}
        <div>
          <FormSectionHeader
            step={5}
            title="Fotografías y Evidencias Visuales"
          />
          <p className="text-xs text-slate-500 mt-1">
            Opcional. Adjunta fotos del problema para facilitar el diagnóstico del equipo técnico.
          </p>

          {/* Dropzone de fotos */}
          <div className="mt-3 space-y-2">
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
                  if (e.dataTransfer.files) handleArchivosSeleccionados(e.dataTransfer.files);
                }}
                onClick={() => !isBusy && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/60"
                    : "border-slate-300 bg-slate-50/70 hover:bg-slate-100"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleArchivosSeleccionados(e.target.files);
                  }}
                />
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
                  {isCompressing || isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#175E38]" />
                  ) : (
                    <Camera className="w-4 h-4 text-[#175E38]" />
                  )}
                  <span>
                    {isCompressing
                      ? "Comprimiendo imágenes..."
                      : isUploading
                      ? "Cargando..."
                      : "Arrastra fotos o haz clic para subir evidencias"}
                  </span>
                </div>
              </div>
            )}

            {fotos.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {fotos.map((url, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => handleEliminarFoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCerrar}
            disabled={isBusy}
            className="w-full sm:w-auto min-w-[110px] h-10 px-4 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="w-full sm:w-auto min-w-[180px] h-10 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] active:translate-y-0.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Crear Ticket de Avería</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
