"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Camera,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagenes, formatearBytes } from "@/lib/file-compressor";
import {
  resolverTicketAction,
  type TicketItem,
} from "@/lib/actions/mantenimiento";

const MAX_FOTOS = 3;

interface FiniquitarTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
  onSuccess: () => void;
}

export function FiniquitarTicketModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: FiniquitarTicketModalProps) {
  const [fotosFiniquito, setFotosFiniquito] = useState<string[]>([]);
  const [notasCierre, setNotasCierre] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook UploadThing
  const { startUpload, isUploading } = useOperacionesUploadThing("fotoTicket", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const urls = res.map((r: any) => r.ufsUrl || r.url).filter(Boolean);
        setFotosFiniquito((prev) => [...prev, ...urls].slice(0, MAX_FOTOS));
        toast.success(
          urls.length === 1
            ? "Fotografía de finiquito cargada."
            : `${urls.length} fotografías cargadas.`
        );
      }
    },
    onUploadError: (err) => {
      console.error("Error al subir fotos de finiquito:", err);
      toast.error("Error al subir las imágenes. Intenta con fotos más ligeras.");
    },
  });

  if (!ticket) return null;

  const handleArchivosSeleccionados = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP).");
      return;
    }

    const cupo = MAX_FOTOS - fotosFiniquito.length;
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
          `Fotos de finiquito optimizadas: ${formatearBytes(pesoOriginal)} → ${formatearBytes(pesoFinal)} (−${ahorroPct}%)`
        );
      }

      await startUpload(res.map((r) => r.file));
    } catch (error) {
      setIsCompressing(false);
      console.error("Error al optimizar fotos de finiquito:", error);
      toast.error("Error al procesar las imágenes.");
    }
  };

  const handleEliminarFoto = (idx: number) => {
    setFotosFiniquito((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fotosFiniquito.length === 0) {
      toast.error("Debes adjuntar al menos 1 fotografía que evidencie la reparación terminada.");
      return;
    }

    if (!notasCierre.trim() || notasCierre.trim().length < 5) {
      toast.error("Por favor describe brevemente qué solución técnica se aplicó (mínimo 5 caracteres).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resolverTicketAction({
        ticketId: ticket.id,
        fotosFiniquito,
        notasCierre: notasCierre.trim(),
      });

      if (res.success) {
        toast.success("¡Avería finiquitada con éxito! Se ha notificado al inquilino y a la administración.");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "No se pudo concluir el ticket.");
      }
    } catch (err) {
      console.error("Error al finiquitar ticket:", err);
      toast.error("Error inesperado al concluir la avería.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isCompressing || isUploading || isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finiquitar Avería"
      icon={ShieldCheck}
      headerVariant="green"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resumen de la Avería */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs shrink-0">
              {ticket.codigo}
            </span>
            <p className="text-xs font-bold text-slate-800 line-clamp-1 flex-1">
              {ticket.titulo}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            {ticket.propiedad.nombre} •{" "}
            {ticket.unidad ? `Local ${ticket.unidad.codigo}` : "Áreas Comunes"}
          </p>
        </div>

        {/* Paso 1: Evidencias del Trabajo Realizado (Obligatorio) */}
        <div>
          <FormSectionHeader
            step={1}
            title="Fotografía del Trabajo Concluido"
          />
          <p className="text-xs text-slate-500 mt-1">
            Toma o sube una fotografía nítida que muestre el arreglo terminado <span className="text-rose-500 font-bold">*</span>
          </p>

          <div className="mt-3 space-y-2.5">
            {fotosFiniquito.length < MAX_FOTOS && (
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
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/60"
                    : "border-slate-300 bg-slate-50/70 hover:bg-slate-100"
                } ${isBusy ? "opacity-60 pointer-events-none" : ""}`}
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
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#175E38] shadow-2xs">
                    {isCompressing || isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    {isCompressing
                      ? "Comprimiendo fotografía..."
                      : isUploading
                      ? "Cargando imagen..."
                      : "Tocar para tomar foto o adjuntar evidencia"}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Obligatorio al menos 1 fotografía (máx. {MAX_FOTOS})
                  </p>
                </div>
              </div>
            )}

            {fotosFiniquito.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotosFiniquito.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-300 bg-emerald-50 shadow-2xs"
                  >
                    <Image
                      src={url}
                      alt={`Finiquito ${idx + 1}`}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleEliminarFoto(idx)}
                      disabled={isBusy}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Foto {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Paso 2: Informe Técnico de Cierre */}
        <div>
          <FormSectionHeader
            step={2}
            title="Informe Técnico de la Solución"
          />
          <p className="text-xs text-slate-500 mt-1">
            Describe qué componentes se cambiaron o qué procedimiento se ejecutó <span className="text-rose-500 font-bold">*</span>
          </p>

          <textarea
            value={notasCierre}
            onChange={(e) => setNotasCierre(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={isBusy}
            className="w-full mt-2.5 p-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none"
          />
          <p className="text-[11px] text-slate-400 text-right mt-1">
            {notasCierre.length}/500 caracteres
          </p>
        </div>

        {/* Botones de Acción (Regla de oro: Grid 50/50 en móvil) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="w-full sm:w-auto min-w-[110px] h-11 px-4 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isBusy || fotosFiniquito.length === 0}
            className="w-full sm:w-auto min-w-[180px] h-11 px-4 sm:px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] hover:brightness-105 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Finiquitando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Concluir y Finiquitar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
