"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, UserCheck, Clock, Loader2, UserX, LogOut } from "lucide-react";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import type { EntregaGuardiaInput } from "@/lib/actions/personal-portal";

interface EntregaGuardiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: EntregaGuardiaInput) => Promise<boolean | void>;
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
  const [modo, setModo] = useState<"CON_RELEVO" | "SIN_RELEVO">("CON_RELEVO");
  const [relevoIdSeleccionado, setRelevoIdSeleccionado] = useState<string>("");
  const [relevoNombreSeleccionado, setRelevoNombreSeleccionado] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Opciones de compañeros de seguridad más la opción explícita de sin relevo
  const opcionesRelevo = [
    ...compañerosSeguridad.map((c) => ({
      value: c.id,
      label: `${c.nombre} (C.I. ${c.cedula})`,
    })),
    {
      value: "SIN_RELEVO",
      label: "Finalizar sin relevo presencial (Sin guardia entrante)",
    },
  ];

  const handleCambioRelevo = (idSeleccionado: string) => {
    if (idSeleccionado === "SIN_RELEVO") {
      setModo("SIN_RELEVO");
      setRelevoIdSeleccionado("");
      setRelevoNombreSeleccionado("");
      return;
    }
    setRelevoIdSeleccionado(idSeleccionado);
    const companero = compañerosSeguridad.find((c) => c.id === idSeleccionado);
    setRelevoNombreSeleccionado(companero?.nombre || idSeleccionado);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === "CON_RELEVO" && !relevoIdSeleccionado && !relevoNombreSeleccionado.trim()) {
      toast.error("Selecciona al vigilante relevo o cambia a la opción 'Sin Relevo'.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: EntregaGuardiaInput =
        modo === "SIN_RELEVO"
          ? {
              sinRelevo: true,
              guardiaRelevoId: undefined,
              guardiaRelevoNombre: undefined,
            }
          : {
              sinRelevo: false,
              guardiaRelevoId: relevoIdSeleccionado || undefined,
              guardiaRelevoNombre: relevoNombreSeleccionado || undefined,
            };

      const resultado = await onConfirm(payload);
      if (resultado !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entrega o Cierre de Guardia (24h)"
      headerVariant="green"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner de horas acumuladas de la guardia */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-white to-emerald-50/50 border border-blue-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 border border-blue-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                Turno de Seguridad
              </span>
              <span className="text-xs font-bold text-slate-700">
                Llevas <strong>{horasEnCurso}h</strong> de servicio activo.
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

        {/* Pestañas de modo: Con relevo presencial vs Sin relevo */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setModo("CON_RELEVO")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              modo === "CON_RELEVO"
                ? "bg-white text-[#175E38] shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Entregar con Relevo</span>
          </button>
          <button
            type="button"
            onClick={() => setModo("SIN_RELEVO")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              modo === "SIN_RELEVO"
                ? "bg-white text-amber-800 shadow-xs border border-amber-200/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-amber-700" />
            <span>Finalizar sin Relevo</span>
          </button>
        </div>

        {/* Contenido según el modo */}
        {modo === "CON_RELEVO" ? (
          <div className="space-y-1.5 animate-fadeIn">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#175E38]" />
              <span>Vigilante Relevo (¿A quién le entregas el puesto?)</span>
            </label>
            {compañerosSeguridad.length > 0 ? (
              <Select
                options={opcionesRelevo}
                value={relevoIdSeleccionado}
                onChange={(v) => handleCambioRelevo(v)}
                placeholder="Selecciona al compañero de guardia..."
                className="w-full"
              />
            ) : (
              <input
                type="text"
                value={relevoNombreSeleccionado}
                onChange={(e) => {
                  setRelevoNombreSeleccionado(e.target.value);
                  setRelevoIdSeleccionado("");
                }}
                placeholder="Ej: Pedro Pérez (Vigilante entrante)"
                className="w-full h-11 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
              />
            )}
            <p className="text-[11px] text-slate-400">
              Al entregar, se cerrará tu guardia y se aperturará automáticamente la del vigilante entrante.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex items-start gap-2.5 animate-fadeIn">
            <UserX className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">Culminación de guardia sin relevo presencial</p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Tu turno se cerrará y quedará asentado en el sistema que finalizaste labores sin transferir la custodia a otro vigilante (ej. por cierre del inmueble o ausencia de relevo).
              </p>
            </div>
          </div>
        )}

        {/* Botones de acción 50/50 */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
          >
            Cancelar
          </button>
          {modo === "CON_RELEVO" ? (
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
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border-b-[3px] border-b-amber-800 active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Finalizando...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                  <span>Finalizar sin Relevo</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
