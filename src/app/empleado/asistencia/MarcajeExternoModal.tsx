"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Navigation, MapPin, Loader2, Check } from "lucide-react";
import { formatearDistancia } from "@/lib/geo-utils";

interface MarcajeExternoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  distanciaMetros: number | null;
  propiedadNombre: string | null;
  isSubmitting?: boolean;
}

// Modal unificado que respeta estrictamente el sistema de diseño corporativo (Modal base)
export function MarcajeExternoModal({
  isOpen,
  onClose,
  onConfirm,
  distanciaMetros,
  propiedadNombre,
  isSubmitting = false,
}: MarcajeExternoModalProps) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
    }
  }, [isOpen]);

  const distanciaTxt = distanciaMetros ? formatearDistancia(distanciaMetros) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) return;
    onConfirm(motivo.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Marcaje Fuera de Sede"
      subtitle={
        distanciaTxt
          ? `Te encuentras a ${distanciaTxt} de ${propiedadNombre || "la sede asignada"}`
          : `Ubicación fuera del perímetro habitual de ${propiedadNombre || "la sede"}`
      }
      icon={Navigation}
      headerVariant="green"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner informativo institucional con gradiente y sol ambiental */}
        <div className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 border border-emerald-200/80 shadow-2xs">
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#175E38] flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs mt-0.5">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-[#175E38] block">
                Diligencia o Labor de Calle
              </span>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Indica el motivo de tu labor externa (compra de materiales, trámites o inspección). Tu jornada se registrará de inmediato para el administrador.
              </p>
            </div>
          </div>
        </div>

        {/* Campo de justificación */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Motivo o Destino del Trabajo <span className="text-[#CC1A22]">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Comprando repuestos de plomería y breakers en ferretería central..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all resize-none text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Botones de acción 50/50 idénticos a los modales del sistema */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !motivo.trim()}
            className="w-full h-11 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar Entrada</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
