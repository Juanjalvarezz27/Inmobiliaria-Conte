"use client";

import React, { useState, useTransition } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Coins,
  FileCheck2,
  RotateCcw,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { EstadoDeposito, MetodoPago } from "@prisma/client";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { OPCIONES_METODO_PAGO } from "@/lib/constants/pagos";
import {
  registrarCobroDeposito,
  revertirCobroDeposito,
  revertirLiquidacionDeposito,
} from "@/lib/actions/contratos";
import type { ContratoConRelaciones } from "../types";

interface ContratoDepositoSectionProps {
  contrato: ContratoConRelaciones;
  onFinalizarORescindir?: (contrato: ContratoConRelaciones, modo: "finalizar" | "rescindir") => void;
  onContratoActualizado?: (contrato: ContratoConRelaciones) => void;
}

export function ContratoDepositoSection({
  contrato,
  onFinalizarORescindir,
  onContratoActualizado,
}: ContratoDepositoSectionProps) {
  const [mostrarFormCobro, setMostrarFormCobro] = useState(false);
  const [metodoCobroInline, setMetodoCobroInline] = useState<MetodoPago>(MetodoPago.TRANSFERENCIA);
  const [referenciaCobroInline, setReferenciaCobroInline] = useState("");
  const [isGuardandoCobro, setIsGuardandoCobro] = useState(false);
  const [isRevertingDeposit, startRevertTransition] = useTransition();

  if (!contrato.depositoGarantia || contrato.depositoGarantia <= 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              contrato.depositoEstado === EstadoDeposito.COBRADO
                ? "bg-emerald-100 text-[#175E38]"
                : contrato.depositoEstado === EstadoDeposito.PENDIENTE
                ? "bg-amber-100 text-amber-800"
                : contrato.depositoEstado === EstadoDeposito.RETENIDO
                ? "bg-rose-100 text-rose-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {contrato.depositoEstado === EstadoDeposito.RETENIDO ? (
              <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Depósito en Garantía</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  contrato.depositoEstado === EstadoDeposito.COBRADO
                    ? "bg-emerald-100 text-emerald-800"
                    : contrato.depositoEstado === EstadoDeposito.PENDIENTE
                    ? "bg-amber-100 text-amber-800"
                    : contrato.depositoEstado === EstadoDeposito.REEMBOLSADO
                    ? "bg-blue-100 text-blue-800"
                    : contrato.depositoEstado === EstadoDeposito.RETENIDO
                    ? "bg-rose-100 text-rose-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {contrato.depositoEstado === EstadoDeposito.COBRADO
                  ? "En Custodia"
                  : contrato.depositoEstado === EstadoDeposito.PENDIENTE
                  ? "Pendiente de Cobro"
                  : contrato.depositoEstado === EstadoDeposito.REEMBOLSADO
                  ? "Reembolsado 100%"
                  : contrato.depositoEstado === EstadoDeposito.RETENIDO
                  ? "Retenido 100%"
                  : "Liquidación Mixta"}
              </span>
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Monto estipulado: <strong className="text-slate-900">{formatCurrency(contrato.depositoGarantia)}</strong>
            </p>
          </div>
        </div>

        {/* Acciones del Depósito */}
        <div className="flex items-center gap-2 flex-wrap">
          {contrato.depositoEstado === EstadoDeposito.PENDIENTE && (
            <button
              type="button"
              onClick={() => setMostrarFormCobro(!mostrarFormCobro)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{mostrarFormCobro ? "Cancelar" : "Registrar Cobro"}</span>
            </button>
          )}

          {contrato.depositoEstado === EstadoDeposito.COBRADO && onFinalizarORescindir && (
            <button
              type="button"
              onClick={() => onFinalizarORescindir(contrato, "finalizar")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] shadow-xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Finalizar y Liquidar</span>
            </button>
          )}

          {contrato.depositoEstado === EstadoDeposito.COBRADO && (
            <button
              type="button"
              disabled={isRevertingDeposit}
              onClick={() => {
                if (window.confirm("¿Deseas revertir el cobro del depósito a estado PENDIENTE?")) {
                  startRevertTransition(async () => {
                    const res = await revertirCobroDeposito(contrato.id);
                    if (res.success && res.data) {
                      toast.success("Cobro de depósito revertido a pendiente.");
                      if (onContratoActualizado) {
                        onContratoActualizado(res.data as unknown as ContratoConRelaciones);
                      }
                    } else {
                      toast.error(res.error || "No se pudo revertir el cobro.");
                    }
                  });
                }
              }}
              title="Revertir cobro y volver a estado pendiente"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Revertir</span>
            </button>
          )}

          {(contrato.depositoEstado === EstadoDeposito.REEMBOLSADO ||
            contrato.depositoEstado === EstadoDeposito.RETENIDO ||
            contrato.depositoEstado === EstadoDeposito.PARCIALMENTE_RETENIDO) && (
            <button
              type="button"
              disabled={isRevertingDeposit}
              onClick={() => {
                if (window.confirm("¿Deseas reabrir y revertir la liquidación de este depósito para regresarlo a estado COBRADO en custodia?")) {
                  startRevertTransition(async () => {
                    const res = await revertirLiquidacionDeposito(contrato.id);
                    if (res.success && res.data) {
                      toast.success("Liquidación revertida. Depósito de nuevo en custodia.");
                      if (onContratoActualizado) {
                        onContratoActualizado(res.data as unknown as ContratoConRelaciones);
                      }
                    } else {
                      toast.error(res.error || "No se pudo revertir la liquidación.");
                    }
                  });
                }
              }}
              title="Revertir liquidación y regresar depósito a custodia"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reabrir Finiquito</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario rápido inline de cobro */}
      {contrato.depositoEstado === EstadoDeposito.PENDIENTE && mostrarFormCobro && (
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold text-slate-800">
              Asentar Cobro de Garantía ({formatCurrency(contrato.depositoGarantia)})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Método de Pago <span className="text-[#CC1A22]">*</span>
              </label>
              <Select
                value={metodoCobroInline}
                onChange={(val) => setMetodoCobroInline(val as MetodoPago)}
                options={OPCIONES_METODO_PAGO}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Referencia Bancaria (Opcional)
              </label>
              <input
                type="text"
                value={referenciaCobroInline}
                onChange={(e) => setReferenciaCobroInline(e.target.value)}
                placeholder="Ej: REF-123456"
                className="w-full px-3 h-10 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMostrarFormCobro(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isGuardandoCobro}
              onClick={async () => {
                if (!contrato) return;
                try {
                  setIsGuardandoCobro(true);
                  const res = await registrarCobroDeposito({
                    contratoId: contrato.id,
                    fechaCobro: new Date().toISOString(),
                    metodoPago: metodoCobroInline,
                    referencia: referenciaCobroInline.trim() || undefined,
                  });
                  if (res.success && res.data) {
                    toast.success("Depósito asentado en custodia exitosamente.");
                    setMostrarFormCobro(false);
                    if (onContratoActualizado) {
                      onContratoActualizado(res.data as unknown as ContratoConRelaciones);
                    }
                  } else {
                    toast.error(res.error || "No se pudo registrar el cobro.");
                  }
                } catch {
                  toast.error("Error al registrar el cobro.");
                } finally {
                  setIsGuardandoCobro(false);
                }
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#175E38] hover:bg-[#124b2d] rounded-xl shadow-xs cursor-pointer active:translate-y-0.5"
            >
              {isGuardandoCobro ? "Guardando..." : "Asentar en Custodia"}
            </button>
          </div>
        </div>
      )}

      {/* Contenido según el estado */}
      {contrato.depositoEstado === EstadoDeposito.PENDIENTE && !mostrarFormCobro && (
        <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            El depósito estipulado aún no ha sido asentado en el sistema como cobrado. Haz clic en <strong>Registrar Cobro</strong> para consignarlo.
          </span>
        </div>
      )}

      {contrato.depositoEstado === EstadoDeposito.COBRADO && (
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha de Cobro
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {contrato.depositoFechaCobro
                  ? new Date(contrato.depositoFechaCobro).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "No registrada"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Método de Pago
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block capitalize">
                {contrato.depositoMetodoPago
                  ? contrato.depositoMetodoPago.toLowerCase().replace("_", " ")
                  : "No especificado"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Referencia
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block truncate">
                {contrato.depositoReferencia || "Sin referencia"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Comprobante
              </span>
              {contrato.depositoComprobanteUrl ? (
                <a
                  href={contrato.depositoComprobanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#175E38] hover:underline mt-0.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ver recibo</span>
                </a>
              ) : (
                <span className="text-slate-400 mt-0.5 block">Sin adjunto</span>
              )}
            </div>
          </div>

          {contrato.depositoNotas && (
            <p className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-emerald-200/50">
              <strong className="text-slate-700">Nota:</strong> {contrato.depositoNotas}
            </p>
          )}
        </div>
      )}

      {(contrato.depositoEstado === EstadoDeposito.REEMBOLSADO ||
        contrato.depositoEstado === EstadoDeposito.RETENIDO ||
        contrato.depositoEstado === EstadoDeposito.PARCIALMENTE_RETENIDO) && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha Finiquito
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {contrato.depositoFechaLiquidacion
                  ? new Date(contrato.depositoFechaLiquidacion).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "No registrada"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Reembolsado
              </span>
              <span className="font-black text-emerald-800 mt-0.5 block">
                {formatCurrency(contrato.depositoMontoReembolsado || 0)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Retenido (Daños)
              </span>
              <span className="font-black text-rose-700 mt-0.5 block">
                {formatCurrency(contrato.depositoMontoRetenido || 0)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Método / Referencia
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block capitalize truncate">
                {contrato.depositoMetodoPagoLiquidacion
                  ? contrato.depositoMetodoPagoLiquidacion.toLowerCase().replace("_", " ")
                  : "No especificado"}
                {contrato.depositoReferenciaLiquidacion && (
                  <span className="text-slate-500 font-normal block text-[11px] truncate">
                    Ref: {contrato.depositoReferenciaLiquidacion}
                  </span>
                )}
              </span>
            </div>
          </div>

          {contrato.depositoMotivoLiquidacion && (
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Motivo del Finiquito
              </span>
              <p className="text-slate-700 leading-relaxed">
                {contrato.depositoMotivoLiquidacion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
