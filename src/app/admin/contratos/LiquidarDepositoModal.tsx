"use client";

import React, { useState } from "react";
import {
  Calendar,
  AlertTriangle,
  Loader2,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Check,
  CheckCircle2,
  CreditCard,
  Hash,
  Info,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { EstadoContrato, MetodoPago } from "@prisma/client";
import { formatCurrency } from "../propiedades/constants";
import { liquidarDeposito } from "@/lib/actions/contratos";
import type { ContratoConRelaciones } from "./types";

interface LiquidarDepositoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoConRelaciones | null;
  onSuccess: (contratoActualizado: ContratoConRelaciones) => void;
  accionOrigen?: "LIQUIDAR" | "RESCINDIR" | "FINALIZAR";
}

type TipoLiquidacion = "REEMBOLSO_TOTAL" | "RETENCION_TOTAL" | "MIXTO";

const OPCIONES_METODO_PAGO = [
  { value: MetodoPago.TRANSFERENCIA, label: "Transferencia Bancaria" },
  { value: MetodoPago.EFECTIVO_USD, label: "Efectivo (USD)" },
  { value: MetodoPago.PAGO_MOVIL, label: "Pago Móvil" },
  { value: MetodoPago.ZELLE, label: "Zelle" },
  { value: MetodoPago.OTRO, label: "Otro Método" },
];

export function LiquidarDepositoModal({
  isOpen,
  onClose,
  contrato,
  onSuccess,
  accionOrigen = "LIQUIDAR",
}: LiquidarDepositoModalProps) {
  const hoyStr = new Date().toISOString().split("T")[0];

  const totalDeposito = contrato?.depositoGarantia || 0;

  const [fechaLiquidacion, setFechaLiquidacion] = useState<string>(hoyStr);
  const [tipoLiquidacion, setTipoLiquidacion] = useState<TipoLiquidacion>("REEMBOLSO_TOTAL");
  const [montoRetenidoInput, setMontoRetenidoInput] = useState<string>("0");
  const [montoReembolsadoInput, setMontoReembolsadoInput] = useState<string>(
    String(totalDeposito)
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.TRANSFERENCIA);
  const [referencia, setReferencia] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");

  // Estado contractual a aplicar según el origen
  const [marcarEstadoContrato, setMarcarEstadoContrato] = useState<EstadoContrato | null>(
    accionOrigen === "RESCINDIR"
      ? EstadoContrato.RESCINDIDO
      : accionOrigen === "FINALIZAR"
      ? EstadoContrato.FINALIZADO
      : null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!contrato) return null;

  const handleCambiarTipo = (tipo: TipoLiquidacion) => {
    setTipoLiquidacion(tipo);
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

  const hayReembolso = tipoLiquidacion !== "RETENCION_TOTAL";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fechaLiquidacion) {
      toast.error("Debes seleccionar la fecha de liquidación.");
      return;
    }

    const ret = parseFloat(montoRetenidoInput) || 0;
    const reem = parseFloat(montoReembolsadoInput) || 0;

    if (tipoLiquidacion === "MIXTO" && ret + reem > totalDeposito + 0.01) {
      toast.error(
        `La suma de la retención ($${ret}) y el reembolso ($${reem}) no puede superar el depósito total ($${totalDeposito}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await liquidarDeposito({
        contratoId: contrato.id,
        fechaLiquidacion,
        tipoLiquidacion,
        montoRetenido: tipoLiquidacion === "RETENCION_TOTAL" ? totalDeposito : ret,
        montoReembolsado: tipoLiquidacion === "REEMBOLSO_TOTAL" ? totalDeposito : reem,
        motivo: motivo.trim() || undefined,
        metodoPagoLiquidacion: hayReembolso ? metodoPago : undefined,
        referenciaLiquidacion: hayReembolso && referencia.trim() ? referencia.trim() : undefined,
        cambiarEstadoContratoA: marcarEstadoContrato || undefined,
      });

      if (res.success && res.data) {
        toast.success("Depósito liquidado y finiquitado exitosamente.");
        onSuccess(res.data as unknown as ContratoConRelaciones);
        onClose();
      } else {
        toast.error(res.error || "No se pudo liquidar el depósito.");
      }
    } catch (err) {
      console.error("Error al liquidar depósito:", err);
      toast.error("Ocurrió un error inesperado al procesar la liquidación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finiquito de Depósito en Garantía"
      subtitle={`${contrato.codigo} · Espacio ${contrato.unidad.codigo}`}
      icon={tipoLiquidacion === "RETENCION_TOTAL" ? ShieldAlert : ShieldCheck}
      headerVariant={tipoLiquidacion === "RETENCION_TOTAL" ? "red" : "green"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Informativo con Monto Original en Custodia */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-slate-50 to-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C2539] text-white flex items-center justify-center shrink-0 shadow-xs">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Monto Original en Custodia
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                {formatCurrency(totalDeposito)}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-slate-500 block">Arrendatario</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800">
              {contrato.inquilino.nombre} {contrato.inquilino.apellido ?? ""}
            </span>
          </div>
        </div>

        {/* Paso 1: Tipo de Liquidación */}
        <div className="space-y-3">
          <FormSectionHeader step={1} title="Destino de la Garantía" />

          {/* Selector de 3 Opciones Visuales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Opción 1: Reembolso 100% */}
            <button
              type="button"
              onClick={() => handleCambiarTipo("REEMBOLSO_TOTAL")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoLiquidacion === "REEMBOLSO_TOTAL"
                  ? "bg-emerald-50/80 border-[#175E38] ring-2 ring-[#175E38]/20 shadow-xs"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-800">Reembolso 100%</span>
                {tipoLiquidacion === "REEMBOLSO_TOTAL" && (
                  <Check className="w-3.5 h-3.5 text-[#175E38]" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Devolver monto íntegro al arrendatario sin deducciones.
              </p>
            </button>

            {/* Opción 2: Retención 100% */}
            <button
              type="button"
              onClick={() => handleCambiarTipo("RETENCION_TOTAL")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoLiquidacion === "RETENCION_TOTAL"
                  ? "bg-rose-50/80 border-[#CC1A22] ring-2 ring-[#CC1A22]/20 shadow-xs"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-800">Retención 100%</span>
                {tipoLiquidacion === "RETENCION_TOTAL" && (
                  <Check className="w-3.5 h-3.5 text-[#CC1A22]" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Retener total por daños graves o deudas acumuladas.
              </p>
            </button>

            {/* Opción 3: Mixto */}
            <button
              type="button"
              onClick={() => handleCambiarTipo("MIXTO")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoLiquidacion === "MIXTO"
                  ? "bg-amber-50/80 border-amber-600 ring-2 ring-amber-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-900">Liquidación Mixta</span>
                {tipoLiquidacion === "MIXTO" && (
                  <Check className="w-3.5 h-3.5 text-amber-700" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Deducir reparaciones y devolver el remanente.
              </p>
            </button>
          </div>

          {/* Desglose de Montos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* Monto Retenido */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Monto Retenido por Daños/Deudas
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={totalDeposito}
                  disabled={tipoLiquidacion !== "MIXTO"}
                  value={
                    tipoLiquidacion === "RETENCION_TOTAL"
                      ? totalDeposito
                      : tipoLiquidacion === "REEMBOLSO_TOTAL"
                      ? 0
                      : montoRetenidoInput
                  }
                  onChange={(e) => handleRetenidoChange(e.target.value)}
                  className="w-full pl-9 pr-3 h-10 text-xs sm:text-sm font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#CC1A22]/20 focus:border-[#CC1A22] disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Monto Reembolsado */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Monto a Devolver al Inquilino
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={totalDeposito}
                  disabled={tipoLiquidacion !== "MIXTO"}
                  value={
                    tipoLiquidacion === "REEMBOLSO_TOTAL"
                      ? totalDeposito
                      : tipoLiquidacion === "RETENCION_TOTAL"
                      ? 0
                      : montoReembolsadoInput
                  }
                  onChange={(e) => handleReembolsadoChange(e.target.value)}
                  className="w-full pl-9 pr-3 h-10 text-xs sm:text-sm font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Paso 2: Detalles de Devolución y Fecha */}
        <div className="space-y-3">
          <FormSectionHeader step={2} title="Detalles del Finiquito y Pago" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Fecha de Liquidación */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha del Finiquito <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={fechaLiquidacion}
                  onChange={(e) => setFechaLiquidacion(e.target.value)}
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Método de Pago del Reembolso (solo si hay desembolso) */}
            {hayReembolso ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Método de Pago del Reembolso
                </label>
                <Select
                  value={metodoPago}
                  onChange={(val) => setMetodoPago(val as MetodoPago)}
                  options={OPCIONES_METODO_PAGO}
                  icon={<CreditCard className="w-4 h-4" />}
                  placeholder="Seleccionar método..."
                />
              </div>
            ) : (
              <div className="flex items-center p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 text-xs text-rose-800">
                <Info className="w-4 h-4 shrink-0 mr-2 text-rose-600" />
                <span>No aplica desembolso monetario al arrendatario.</span>
              </div>
            )}
          </div>

          {/* Número de Referencia (si hay reembolso) */}
          {hayReembolso && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Número de Referencia de Pago
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: REF-928341 o recibo..."
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>
          )}

          {/* Motivo del Finiquito (sin mínimo de caracteres) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Motivo del Finiquito
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Entrega de llaves conforme, deducción por pintura, etc."
              className="w-full p-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all resize-none"
            />
          </div>
        </div>

        {/* Sección 3: Estado Contractual Claro y Contextual */}
        {accionOrigen === "RESCINDIR" ? (
          <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#CC1A22] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-rose-950 block text-[13px]">
                Rescisión Contractual Simultánea
              </span>
              <p className="text-rose-800 mt-0.5 leading-relaxed">
                Al asentar este finiquito, el contrato quedará formalmente en estado <strong>RESCINDIDO</strong> y el espacio <strong>{contrato.unidad.codigo}</strong> volverá a estar disponible de inmediato.
              </p>
            </div>
          </div>
        ) : accionOrigen === "FINALIZAR" ? (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1C2539] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-blue-950 block text-[13px]">
                Finalización Contractual Simultánea
              </span>
              <p className="text-blue-800 mt-0.5 leading-relaxed">
                Al asentar este finiquito, el contrato quedará formalmente en estado <strong>FINALIZADO</strong> por culminación de su vigencia y el espacio quedará disponible.
              </p>
            </div>
          </div>
        ) : (
          (contrato.estado === EstadoContrato.ACTIVO ||
            contrato.estado === EstadoContrato.POR_VENCER) && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  ¿Deseas dar por concluido el contrato ahora mismo?
                </span>
                <p className="text-[11px] text-slate-500">
                  Si solo estás ajustando la garantía pero el inquilino continúa habitando el espacio, mantén el contrato activo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMarcarEstadoContrato(null)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    marcarEstadoContrato === null
                      ? "bg-white border-[#175E38] ring-2 ring-[#175E38]/20 shadow-xs"
                      : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Mantener contrato en curso
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Continúa ocupado y vigente
                    </span>
                  </div>
                  {marcarEstadoContrato === null && (
                    <Check className="w-3.5 h-3.5 text-[#175E38]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMarcarEstadoContrato(EstadoContrato.RESCINDIDO)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    marcarEstadoContrato === EstadoContrato.RESCINDIDO
                      ? "bg-rose-50 border-[#CC1A22] ring-2 ring-[#CC1A22]/20 shadow-xs"
                      : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-rose-800 block">
                      Rescindir y desocupar
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Libera el espacio inmediatamente
                    </span>
                  </div>
                  {marcarEstadoContrato === EstadoContrato.RESCINDIDO && (
                    <Check className="w-3.5 h-3.5 text-[#CC1A22]" />
                  )}
                </button>
              </div>
            </div>
          )
        )}

        {/* Botones de Acción */}
        <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto min-w-[180px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all border-b-[3px] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 ${
              tipoLiquidacion === "RETENCION_TOTAL"
                ? "bg-gradient-to-r from-[#CC1A22] to-[#a81219] hover:bg-[#a81219] border-b-[#7a0d12] shadow-[0_2px_8px_rgba(204,26,34,0.25)]"
                : "bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:bg-[#124b2d] border-b-[#0e3a23] shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Liquidando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Asentar Finiquito</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
