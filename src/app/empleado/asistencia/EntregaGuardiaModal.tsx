"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, UserCheck, Clock, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { EntregaGuardiaInput } from "@/lib/actions/personal-portal";

interface EntregaGuardiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: EntregaGuardiaInput) => Promise<void>;
  compañerosSeguridad: Array<{
    id: string;
    nombre: string;
    cedula: string;
  }>;
  horasEnCurso: number;
}

export function EntregaGuardiaModal({
  isOpen,
  onClose,
  onConfirm,
  compañerosSeguridad,
  horasEnCurso,
}: EntregaGuardiaModalProps) {
  const [relevoSeleccionado, setRelevoSeleccionado] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const opcionesRelevo = compañerosSeguridad.map((c) => ({
    value: c.nombre,
    label: `${c.nombre} (C.I. ${c.cedula})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirm({
        guardiaRelevoNombre: relevoSeleccionado || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entrega de Guardia (Relevo 24h)"
      headerVariant="green"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner de resumen de la guardia */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-white to-emerald-50/50 border border-blue-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 border border-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                Turno Continuo de Seguridad
              </span>
              <span className="text-xs font-bold text-slate-700">
                Llevas aproximadamente <strong>{horasEnCurso}h</strong> de servicio activo.
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-100 text-[#175E38] border border-emerald-300">
              <Clock className="w-3.5 h-3.5" />
              <span>24 Horas</span>
            </span>
          </div>
        </div>

        {/* Selector de Relevo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#175E38]" />
            <span>Vigilante Relevo (¿A quién le entregas el puesto?)</span>
          </label>
          {opcionesRelevo.length > 0 ? (
            <Select
              options={opcionesRelevo}
              value={relevoSeleccionado}
              onChange={(v) => setRelevoSeleccionado(v)}
              placeholder="Selecciona al compañero de guardia..."
              className="w-full"
            />
          ) : (
            <input
              type="text"
              value={relevoSeleccionado}
              onChange={(e) => setRelevoSeleccionado(e.target.value)}
              placeholder="Ej: Pedro Pérez (Vigilante entrante)"
              className="w-full h-11 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
            />
          )}
          <p className="text-[11px] text-slate-400">
            Nombre del personal que asume la custodia física del centro comercial o inmueble.
          </p>
        </div>

        {/* Botones de acción 50/50 en móvil */}
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
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entregando...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Entregar Guardia</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

