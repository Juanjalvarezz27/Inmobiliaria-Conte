"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { EstadoContrato, EstadoDeposito, MetodoPago } from "@prisma/client";
import { formatCurrency } from "@/lib/formatters";
import { OPCIONES_METODO_PAGO } from "@/lib/constants/pagos";
import { cerrarContratoAction } from "@/lib/actions/contratos";
import type { ContratoConRelaciones } from "./types";

interface FinalizarContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoConRelaciones | null;
  modo: "finalizar" | "rescindir";
  onSuccess: (contratoActualizado: ContratoConRelaciones) => void;
}

type TipoResolucion = "REEMBOLSO_TOTAL" | "RETENCION_TOTAL" | "MIXTO";

export function FinalizarContratoModal({
  isOpen,
  onClose,
  contrato,
  modo,
  onSuccess,
}: FinalizarContratoModalProps) {
  const [tipoResolucion, setTipoResolucion] = useState<TipoResolucion>("REEMBOLSO_TOTAL");
  const [montoRetenidoInput, setMontoRetenidoInput] = useState<string>("0");
  const [montoReembolsadoInput, setMontoReembolsadoInput] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.TRANSFERENCIA);
  const [referencia, setReferencia] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar montos según el depósito del contrato
  const totalDeposito = contrato?.depositoGarantia || 0;
  const tieneDepositoEnCustodia =
    contrato?.depositoEstado === EstadoDeposito.COBRADO && totalDeposito > 0;

  const handleTipoResolucionChange = (tipo: TipoResolucion) => {
    setTipoResolucion(tipo);
    if (tipo === "REEMBOLSO_TOTAL") {
      setMontoReembolsadoInput(String(totalDeposito));
      setMontoRetenidoInput("0");
    } else if (tipo === "RETENCION_TOTAL") {
      setMontoReembolsadoInput("0");
      setMontoRetenidoInput(String(totalDeposito));
    } else {
      const mitad = Math.round((totalDeposito / 2) * 100) / 100;
      setMontoRetenidoInput(String(mitad));
      setMontoReembolsadoInput(String(totalDeposito - mitad));
    }
  };

  const handleRetenidoChange = (val: string) => {
    setMontoRetenidoInput(val);
    const num = parseFloat(val) || 0;
    const diff = Math.max(0, totalDeposito - num);
    setMontoReembolsadoInput(diff.toFixed(2));
  };

  const handleReembolsadoChange = (val: string) => {
    setMontoReembolsadoInput(val);
    const num = parseFloat(val) || 0;
    const diff = Math.max(0, totalDeposito - num);
    setMontoRetenidoInput(diff.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato) return;

    const ret = parseFloat(montoRetenidoInput) || 0;
    const reem = parseFloat(montoReembolsadoInput || String(totalDeposito)) || 0;

    if (tieneDepositoEnCustodia && tipoResolucion === "MIXTO" && ret + reem > totalDeposito + 0.01) {
      toast.error(
        `La suma de retención ($${ret}) y reembolso ($${reem}) no puede superar el depósito total ($${totalDeposito}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const nuevoEstado =
        modo === "rescindir" ? EstadoContrato.RESCINDIDO : EstadoContrato.FINALIZADO;

      const res = await cerrarContratoAction({
        contratoId: contrato.id,
        nuevoEstado,
        tieneDepositoEnCustodia,
        tipoResolucion: tieneDepositoEnCustodia ? tipoResolucion : undefined,
        montoReembolsado:
          tipoResolucion === "REEMBOLSO_TOTAL"
            ? totalDeposito
            : tipoResolucion === "RETENCION_TOTAL"
            ? 0
            : reem,
        montoRetenido:
          tipoResolucion === "RETENCION_TOTAL"
            ? totalDeposito
            : tipoResolucion === "REEMBOLSO_TOTAL"
            ? 0
            : ret,
        motivoRetencion: motivo.trim() || undefined,
        metodoPagoLiquidacion:
          tipoResolucion !== "RETENCION_TOTAL" ? metodoPago : undefined,
        referenciaLiquidacion:
          tipoResolucion !== "RETENCION_TOTAL" && referencia.trim()
            ? referencia.trim()
            : undefined,
      });

      if (res.success && res.data) {
        toast.success(
          modo === "rescindir"
            ? "Contrato rescindido y archivado correctamente."
            : "Contrato finalizado exitosamente."
        );
        onSuccess(res.data as unknown as ContratoConRelaciones);
        onClose();
      } else {
        toast.error(res.error || "Ocurrió un error al procesar el cierre del contrato.");
      }
    } catch (error) {
      console.error("Error al cerrar contrato:", error);
      toast.error("Error inesperado al procesar la acción.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contrato) return null;

  const esRescindir = modo === "rescindir";
  const headerVariant = esRescindir ? "red" : "default";
  const iconoModal = esRescindir ? AlertTriangle : CalendarCheck;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={esRescindir ? "Rescindir y Archivar Contrato" : "Finalizar Contrato"}
      subtitle={
        esRescindir
          ? "Conclusión anticipada con preservación histórica"
          : "Término formal de vigencia y desocupación"
      }
      icon={iconoModal}
      headerVariant={headerVariant}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resumen del Contrato */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Contrato</span>
            <span className="font-bold text-slate-900">{contrato.codigo}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Inquilino</span>
            <span className="font-bold text-slate-900">
              {contrato.inquilino.nombre} {contrato.inquilino.apellido ?? ""}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-slate-200/50 pb-1.5">
            <span className="text-slate-400 font-medium">Inmueble y Espacio</span>
            <span className="font-bold text-slate-900 text-right truncate">
              {contrato.unidad.codigo} ({contrato.unidad.propiedad.nombre})
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Canon Mensual</span>
            <span className="font-extrabold text-[#175E38]">
              {formatCurrency(contrato.montoAlquiler)} / mes
            </span>
          </div>
        </div>

        {/* Nota de liberación de unidad */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
          ℹ️ Al confirmar, el espacio <strong>{contrato.unidad.codigo}</strong> volverá a quedar <strong>DISPONIBLE</strong> en el catálogo y se purgarán automáticamente las cuotas futuras no devengadas.
        </div>

        {/* Sección de Depósito en Garantía (Solo si está en custodia) */}
        {tieneDepositoEnCustodia ? (
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#175E38]" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Depósito en Garantía en Custodia
                </span>
              </div>
              <span className="text-xs font-black text-[#175E38] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {formatCurrency(totalDeposito)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                ¿Qué se acordó hacer con la garantía?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTipoResolucionChange("REEMBOLSO_TOTAL")}
                  className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    tipoResolucion === "REEMBOLSO_TOTAL"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Devolver 100%
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoResolucionChange("RETENCION_TOTAL")}
                  className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    tipoResolucion === "RETENCION_TOTAL"
                      ? "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Retener 100%
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoResolucionChange("MIXTO")}
                  className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    tipoResolucion === "MIXTO"
                      ? "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Deducción Mixta
                </button>
              </div>
            </div>

            {/* Ajuste manual de montos si es Mixto */}
            {tipoResolucion === "MIXTO" && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Monto a Devolver (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={montoReembolsadoInput}
                    onChange={(e) => handleReembolsadoChange(e.target.value)}
                    className="w-full px-3 h-9 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Monto a Retener (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={montoRetenidoInput}
                    onChange={(e) => handleRetenidoChange(e.target.value)}
                    className="w-full px-3 h-9 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#CC1A22]/20 focus:border-[#CC1A22]"
                  />
                </div>
              </div>
            )}

            {/* Método de pago y referencia si hay devolución */}
            {tipoResolucion !== "RETENCION_TOTAL" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Método de Reembolso
                  </label>
                  <Select
                    value={metodoPago}
                    onChange={(val) => setMetodoPago(val as MetodoPago)}
                    options={OPCIONES_METODO_PAGO}
                    placeholder="Método..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Referencia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej: REF-987654"
                    className="w-full px-3 h-10 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
                  />
                </div>
              </div>
            )}

            {/* Motivo de la retención si hay retención */}
            {tipoResolucion !== "REEMBOLSO_TOTAL" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Motivo de la Retención (Opcional)
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Pintura, reparaciones o deuda de servicios"
                  className="w-full px-3 h-10 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Botones de acción inferiores */}
        <div className="pt-2 grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[120px] h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto min-w-[170px] h-10 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:translate-y-0.5 ${
              esRescindir
                ? "bg-[#CC1A22] hover:bg-[#a81219] border-b-[3px] border-b-[#8a1117] shadow-[0_2px_8px_rgba(204,26,34,0.25)]"
                : "bg-[#1C2539] hover:bg-[#2a3754] border-b-[3px] border-b-[#0f1420] shadow-[0_2px_8px_rgba(28,37,57,0.25)]"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <span>{esRescindir ? "Rescindir Contrato" : "Finalizar Contrato"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
