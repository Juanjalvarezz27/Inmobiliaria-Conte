"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import {
  Scissors,
  Store,
  Layers,
  AlertCircle,
  RotateCw,
  Info,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "./constants";
import type { UnidadConPropiedad } from "./types";
import type { SubunidadParteInput } from "@/lib/actions/unidades";

interface SubdividirUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: UnidadConPropiedad | null;
  onConfirm: (partes: SubunidadParteInput[]) => Promise<boolean | void>;
  isLoading?: boolean;
}

export function SubdividirUnidadModal({
  isOpen,
  onClose,
  unidad,
  onConfirm,
  isLoading = false,
}: SubdividirUnidadModalProps) {
  const [parteA, setParteA] = useState<SubunidadParteInput>({
    codigo: "",
    areaMt2: 0,
    precioAlquiler: 0,
    descripcion: "",
  });

  const [parteB, setParteB] = useState<SubunidadParteInput>({
    codigo: "",
    areaMt2: 0,
    precioAlquiler: 0,
    descripcion: "",
  });

  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Inicializar estrictamente en 2 subunidades (A y B)
  useEffect(() => {
    if (!unidad) return;

    const baseArea = unidad.areaMt2 || 0;
    const basePrecio = unidad.precioAlquiler || 0;

    const areaMitad = Math.round((baseArea / 2) * 10) / 10;
    const precioMitad = Math.round((basePrecio / 2) * 100) / 100;

    setParteA({
      codigo: `${unidad.codigo}-A`,
      areaMt2: areaMitad,
      precioAlquiler: precioMitad,
      descripcion: `Subunidad A creada a partir de ${unidad.codigo}`,
    });

    setParteB({
      codigo: `${unidad.codigo}-B`,
      areaMt2: Math.max(0, Math.round((baseArea - areaMitad) * 10) / 10),
      precioAlquiler: Math.max(0, Math.round((basePrecio - precioMitad) * 100) / 100),
      descripcion: `Subunidad B creada a partir de ${unidad.codigo}`,
    });

    setErrorLocal(null);
  }, [unidad, isOpen]);

  if (!unidad) return null;

  const contratoActivo = unidad.contratos && unidad.contratos.length > 0 ? unidad.contratos[0] : null;
  const inquilinoActivo = contratoActivo?.inquilino;

  // Totales acumulados de las 2 partes
  const sumaAreas = (Number(parteA.areaMt2) || 0) + (Number(parteB.areaMt2) || 0);
  const sumaPrecios = (Number(parteA.precioAlquiler) || 0) + (Number(parteB.precioAlquiler) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parteA.codigo.trim() || !parteB.codigo.trim()) {
      setErrorLocal("Ambas subunidades deben tener un código asignado.");
      return;
    }

    if (parteA.codigo.trim().toLowerCase() === parteB.codigo.trim().toLowerCase()) {
      setErrorLocal("Los códigos de las subunidades no pueden ser idénticos.");
      return;
    }

    await onConfirm([parteA, parteB]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Subdividir Espacio: ${unidad.codigo}`}
      subtitle={`${unidad.propiedad.nombre} · Fraccionamiento comercial en 2 partes (A / B)`}
      icon={Scissors}
      headerVariant="green"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resumen del Espacio Matriz Original */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Local Principal
              </span>
              <h3 className="text-base font-black text-slate-900 font-heading">
                {unidad.codigo}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Área Total</span>
              <span className="font-bold text-slate-800">
                {unidad.areaMt2 ? `${unidad.areaMt2} m²` : "N/D"}
              </span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Canon Matriz</span>
              <span className="font-black text-[#175E38]">
                {formatCurrency(unidad.precioAlquiler)}
              </span>
            </div>
          </div>
        </div>

        {/* Notificación si el local tiene arrendatario vigente */}
        {inquilinoActivo && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
            <UserCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <p className="font-bold">
                Local actualmente arrendado por {inquilinoActivo.nombre} {inquilinoActivo.apellido || ""}
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Al confirmar la división, el contrato vigente ({contratoActivo?.codigo}) se reasignará
                automáticamente a la <strong>Subunidad A</strong> ({parteA.codigo}) con su nuevo canon,
                y la <strong>Subunidad B</strong> ({parteB.codigo}) quedará libre y disponible para un nuevo inquilino.
              </p>
            </div>
          </div>
        )}

        {/* Formulario de las 2 Subunidades (Subunidad A y Subunidad B) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Tarjeta Subunidad A */}
          <div className="bg-white border-2 border-indigo-200/90 rounded-2xl p-4 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                  A
                </span>
                <span className="text-xs font-black text-indigo-950">Subunidad A</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                {inquilinoActivo ? "Heredará Contrato" : "Pasa a Disponible"}
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Código del Local *
                </label>
                <input
                  type="text"
                  required
                  value={parteA.codigo}
                  onChange={(e) => setParteA((prev) => ({ ...prev, codigo: e.target.value }))}
                  placeholder="Ej: 12-A"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={parteA.areaMt2 ?? ""}
                    onChange={(e) =>
                      setParteA((prev) => ({
                        ...prev,
                        areaMt2: e.target.value === "" ? 0 : parseFloat(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Canon ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={parteA.precioAlquiler ?? ""}
                    onChange={(e) =>
                      setParteA((prev) => ({
                        ...prev,
                        precioAlquiler: e.target.value === "" ? 0 : parseFloat(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta Subunidad B */}
          <div className="bg-white border-2 border-emerald-200/90 rounded-2xl p-4 shadow-2xs space-y-3 relative">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#175E38] text-white text-xs font-black flex items-center justify-center">
                  B
                </span>
                <span className="text-xs font-black text-emerald-950">Subunidad B</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                Pasa a Disponible
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Código del Local *
                </label>
                <input
                  type="text"
                  required
                  value={parteB.codigo}
                  onChange={(e) => setParteB((prev) => ({ ...prev, codigo: e.target.value }))}
                  placeholder="Ej: 12-B"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-hidden focus:border-[#175E38] focus:ring-1 focus:ring-[#175E38]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={parteB.areaMt2 ?? ""}
                    onChange={(e) =>
                      setParteB((prev) => ({
                        ...prev,
                        areaMt2: e.target.value === "" ? 0 : parseFloat(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:border-[#175E38] focus:ring-1 focus:ring-[#175E38]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    Canon ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={parteB.precioAlquiler ?? ""}
                    onChange={(e) =>
                      setParteB((prev) => ({
                        ...prev,
                        precioAlquiler: e.target.value === "" ? 0 : parseFloat(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 focus:outline-hidden focus:border-[#175E38] focus:ring-1 focus:ring-[#175E38]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance y Resumen de Totales */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Balance de la Subdivisión:</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span
              className={`font-semibold ${
                unidad.areaMt2 && Math.abs(sumaAreas - unidad.areaMt2) > 0.1
                  ? "text-amber-700 font-bold"
                  : "text-slate-700"
              }`}
            >
              Área Total: <strong>{sumaAreas.toFixed(1)} m²</strong>
              {unidad.areaMt2 ? ` / ${unidad.areaMt2} m²` : ""}
            </span>

            <span className="text-[#175E38] font-bold">
              Canon Total: <strong>${sumaPrecios.toFixed(2)} USD</strong>
            </span>
          </div>
        </div>

        {/* Nota Institucional de Exclusión Mutua */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#175E38] shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-950 leading-relaxed">
            <strong>Exclusión mutua garantizada:</strong> Al confirmar la división en 2, el local principal{" "}
            <strong>{unidad.codigo}</strong> quedará automáticamente <strong>INACTIVO</strong> para evitar
            duplicidad en la oferta. Cuando ambas subunidades queden desocupadas podrás reunificarlas, y si
            un inquilino de una mitad desea ocupar el espacio completo, podrás formalizar su expansión al instante.
          </p>
        </div>

        {/* Error si aplica */}
        {errorLocal && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorLocal}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer active:translate-y-0.5 border-b-[3px] border-b-indigo-800 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Dividiendo Local...</span>
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                <span>Confirmar y Dividir en 2 Locales (A y B)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
