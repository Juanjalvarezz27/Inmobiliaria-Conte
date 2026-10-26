"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Building2,
  User,
  Clock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Modal, ImageViewerModal } from "@/components/ui";
import { WhatsAppIcon, getWhatsAppUrl } from "@/lib/formatters";
import {
  type IncidenciaItem,
  CATEGORIA_NOVEDAD_CONFIG,
  parseNovedadTitulo,
} from "@/lib/types/seguridad";

interface NovedadFichaModalProps {
  novedad: IncidenciaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEliminar?: (novedad: IncidenciaItem) => void;
  onEditar?: (novedad: IncidenciaItem) => void;
  esAdmin?: boolean;
}

// Modal de Ficha Detallada de Incidencia / Novedad con visor cinematográfico oficial
export function NovedadFichaModal({
  novedad,
  isOpen,
  onClose,
  onEliminar,
  onEditar,
  esAdmin = false,
}: NovedadFichaModalProps) {
  const [fotoActivaIndex, setFotoActivaIndex] = useState<number>(0);
  const [prevNovedadId, setPrevNovedadId] = useState(novedad?.id);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Sincronizar índice si cambia la novedad seleccionada
  if (novedad?.id !== prevNovedadId) {
    setPrevNovedadId(novedad?.id);
    setFotoActivaIndex(0);
  }

  if (!novedad) return null;

  const catCfg = CATEGORIA_NOVEDAD_CONFIG[novedad.categoria] || CATEGORIA_NOVEDAD_CONFIG.OTRO;
  const { badgeLabel, tituloLimpio } = parseNovedadTitulo(novedad.categoria, novedad.titulo);
  const tieneFotos = Boolean(novedad.fotos && novedad.fotos.length > 0);

  const whatsappUrl = novedad.empleadoTelefono
    ? getWhatsAppUrl(
        novedad.empleadoTelefono,
        `Hola ${novedad.empleadoNombre}, te contacto respecto al reporte de seguridad "${tituloLimpio}" de ${novedad.propiedadNombre}.`
      )
    : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Ficha de Novedad de Seguridad"
        subtitle={`${novedad.propiedadNombre} • ${novedad.fechaFormateada}`}
        icon={ShieldCheck}
        headerVariant="green"
        maxWidth="3xl"
      >
        <div className="space-y-5">
          {/* 1. Visor de Fotos Principal (Patrón Institucional Sección 5) */}
          {tieneFotos ? (
            <div className="space-y-3">
              {/* Foto Principal Ampliada con Visor Cinematográfico */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center group">
                <Image
                  src={novedad.fotos[fotoActivaIndex] || novedad.fotos[0]}
                  alt={`Evidencia ${fotoActivaIndex + 1} de ${tituloLimpio}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 850px"
                  priority
                  unoptimized
                  className="object-contain"
                />

                {/* Controles de Navegación Anterior / Siguiente si hay más de 1 foto */}
                {novedad.fotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoActivaIndex((prev) =>
                          prev === 0 ? novedad.fotos.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-lg active:scale-95 z-10"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoActivaIndex((prev) =>
                          prev === novedad.fotos.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-lg active:scale-95 z-10"
                      aria-label="Foto siguiente"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Badge indicador de número de foto */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 text-white text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-xs shadow-md z-10">
                      {fotoActivaIndex + 1} de {novedad.fotos.length}
                    </div>
                  </>
                )}

                {/* Botón flotante para Ver en Pantalla Completa (ImageViewerModal) */}
                <button
                  type="button"
                  onClick={() => setIsViewerOpen(true)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer shadow-md active:scale-95 opacity-90 hover:opacity-100 z-10"
                  title="Abrir imagen en pantalla completa"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Tira de Miniaturas si hay más de 1 foto */}
              {novedad.fotos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {novedad.fotos.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFotoActivaIndex(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        fotoActivaIndex === idx
                          ? "border-[#175E38] ring-2 ring-[#175E38]/20 scale-102"
                          : "border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        fill
                        sizes="80px"
                        unoptimized
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Estado sin fotos */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <Camera className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-700">Sin evidencia fotográfica</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Esta novedad se asentó únicamente con reporte descriptivo.</p>
            </div>
          )}

          {/* 2. Cajas de Datos Clave (1 columna en móvil, 4 columnas en desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Inmueble */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                Inmueble
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 sm:mt-1 break-words">
                {novedad.propiedadNombre}
              </p>
            </div>

            {/* Categoría / Tipología */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-400 shrink-0" />
                Tipología
              </span>
              <div className="mt-0.5 sm:mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-extrabold border ${catCfg.badgeClass}`}>
                  {badgeLabel}
                </span>
              </div>
            </div>

            {/* Vigilante */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                Vigilante
              </span>
              <div className="mt-0.5 sm:mt-1">
                <p className="text-xs sm:text-sm font-bold text-slate-900 break-words">
                  {novedad.empleadoNombre}
                </p>
                <p className="text-[10px] text-slate-400">
                  C.I. {novedad.empleadoCedula}
                </p>
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Hora de Registro
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 sm:mt-1">
                {novedad.horaFormateada}
              </p>
            </div>
          </div>

          {/* 3. Título y Contenido de la Novedad */}
          <div className="space-y-2">
            <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg tracking-tight">
              {tituloLimpio}
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {novedad.descripcion}
            </div>
          </div>

          {/* 4. Barra de Acciones Inferior Responsiva */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full sm:w-auto">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-11 sm:h-9 px-3.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/90 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2 active:scale-95"
                >
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  <span>Contactar al Vigilante</span>
                </a>
              )}

              {esAdmin && onEditar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditar(novedad);
                  }}
                  className="w-full sm:w-auto h-11 sm:h-9 px-3.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/90 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
                  title="Editar este reporte"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Editar Novedad</span>
                </button>
              )}

              {esAdmin && onEliminar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEliminar(novedad);
                  }}
                  className="w-full sm:w-auto h-11 sm:h-9 px-3.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/90 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  title="Eliminar este reporte"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Reporte</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto h-11 sm:h-9 px-5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all cursor-pointer shadow-xs active:translate-y-0.5 flex items-center justify-center"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      </Modal>

      {/* Visor Oficial de Imágenes en Pantalla Completa (Portal z-[9999]) */}
      {tieneFotos && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          images={novedad.fotos}
          initialIndex={fotoActivaIndex}
          title={`Evidencia Fotográfica • ${tituloLimpio}`}
          subtitle={`${novedad.propiedadNombre} • ${novedad.fechaFormateada} - ${novedad.horaFormateada}`}
        />
      )}
    </>
  );
}
