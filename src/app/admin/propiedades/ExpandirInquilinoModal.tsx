"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Maximize2, Store, ArrowRight, CheckCircle2, DollarSign, AlertCircle, RotateCw } from "lucide-react";
import type { InquilinoExpansionInfo } from "@/lib/actions/unidades";

interface ExpandirInquilinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  expansionInfo: InquilinoExpansionInfo | null;
  onConfirm: (nuevoCanon: number) => Promise<boolean | void>;
  isLoading?: boolean;
}

export function ExpandirInquilinoModal({
  isOpen,
  onClose,
  expansionInfo,
  onConfirm,
  isLoading = false,
}: ExpandirInquilinoModalProps) {
  const [nuevoCanon, setNuevoCanon] = useState<number>(() => {
    return expansionInfo?.canonSugeridoMatriz || 0;
  });

  // Sincronizar canon inicial cuando cambia la información
  React.useEffect(() => {
    if (expansionInfo?.canonSugeridoMatriz) {
      setNuevoCanon(expansionInfo.canonSugeridoMatriz);
    }
  }, [expansionInfo]);

  if (!expansionInfo) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoCanon <= 0) return;
    await onConfirm(nuevoCanon);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expandir Arrendatario a Local Completo"
      subtitle="El contrato vigente se trasladará a la matriz y las subunidades se inactivarán."
      icon={Maximize2}
      headerVariant="green"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Comparativa Visual: Antes y Después */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tarjeta Espacio Actual */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Situación Actual
            </span>
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-900 font-heading truncate">
                {expansionInfo.subunidadCodigo}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
              <p className="truncate font-medium text-slate-800">{expansionInfo.inquilinoNombre}</p>
              <p className="text-[11px] font-mono text-slate-500">Contrato: {expansionInfo.contratoCodigo}</p>
              <p className="text-xs font-bold text-slate-700">Canon actual: ${expansionInfo.canonActual.toFixed(2)} USD</p>
            </div>
          </div>

          {/* Tarjeta Espacio Expandido */}
          <div className="bg-emerald-50/50 border border-emerald-300 rounded-2xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-bold text-[#175E38] uppercase tracking-wider block">
              Resultado de Expansión
            </span>
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-[#175E38]" />
              <span className="text-sm font-black text-slate-900 font-heading truncate">
                {expansionInfo.matrizCodigo}
              </span>
              {expansionInfo.areaTotalMatriz && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  {expansionInfo.areaTotalMatriz} m²
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 space-y-0.5 pt-1 border-t border-emerald-200/60">
              <p className="text-emerald-700 font-bold">Pasa a estado OCUPADO</p>
              <p className="text-[11px] text-slate-500">Subunidades quedan inactivas</p>
              <p className="text-[11px] text-emerald-800 font-medium">Contrato reasignado a matriz</p>
            </div>
          </div>
        </div>

        {/* Input del Nuevo Canon Mensual Acordado */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="nuevoCanonInput"
              className="block text-xs font-bold text-slate-800 font-heading"
            >
              Nuevo Canon Mensual Acordado (USD) *
            </label>
            <span className="text-[11px] text-slate-400">
              Sugerido: ${expansionInfo.canonSugeridoMatriz.toFixed(2)} USD
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <input
              id="nuevoCanonInput"
              type="number"
              step="0.01"
              min="1"
              value={nuevoCanon}
              onChange={(e) => setNuevoCanon(parseFloat(e.target.value) || 0)}
              required
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
              placeholder="Ej: 500.00"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || nuevoCanon <= 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] transition-all shadow-[0_2px_8px_rgba(23,94,56,0.3)] cursor-pointer border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar Expansión</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

