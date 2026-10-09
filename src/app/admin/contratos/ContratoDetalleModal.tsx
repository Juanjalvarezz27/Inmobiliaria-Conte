"use client";

import React, { useState, useMemo, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  User,
  Store,
  Calendar,
  Clock,
  ExternalLink,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  CircleDollarSign,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Coins,
  Receipt,
  FileCheck2,
  Check,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { EstadoContrato, EstadoDeposito, EstadoPago, MetodoPago } from "@prisma/client";
import { formatCurrency, WhatsAppIcon, getWhatsAppUrl } from "../propiedades/constants";
import {
  registrarCobroDeposito,
  revertirCobroDeposito,
  revertirLiquidacionDeposito,
} from "@/lib/actions/contratos";
import type { ContratoConRelaciones } from "./types";

const OPCIONES_METODO_PAGO = [
  { value: MetodoPago.TRANSFERENCIA, label: "Transferencia Bancaria" },
  { value: MetodoPago.EFECTIVO_USD, label: "Efectivo (USD)" },
  { value: MetodoPago.PAGO_MOVIL, label: "Pago Móvil" },
  { value: MetodoPago.ZELLE, label: "Zelle" },
  { value: MetodoPago.OTRO, label: "Otro Método" },
];

const NOMBRES_MESES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface ContratoDetalleModalProps {
  isOpen: boolean;
  contrato: ContratoConRelaciones | null;
  onClose: () => void;
  onEditar: () => void;
  onCambiarEstado: (id: string, nuevoEstado: EstadoContrato) => void;
  onFinalizarORescindir?: (contrato: ContratoConRelaciones, modo: "finalizar" | "rescindir") => void;
  onContratoActualizado?: (contrato: ContratoConRelaciones) => void;
  isPending?: boolean;
  isLoadingPagos?: boolean;
}

// Modal visor de detalles completos del contrato y documento firmado
export function ContratoDetalleModal({
  isOpen,
  contrato,
  onClose,
  onEditar,
  onCambiarEstado,
  onFinalizarORescindir,
  onContratoActualizado,
  isPending = false,
  isLoadingPagos = false,
}: ContratoDetalleModalProps) {
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);
  const menuEstadoRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de estados al hacer clic afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuEstadoRef.current && !menuEstadoRef.current.contains(e.target as Node)) {
        setMenuEstadoAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuEstadoAbierto(false);
    };
    if (menuEstadoAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuEstadoAbierto]);

  const estadoBadgeConfig = useMemo(() => {
    switch (contrato?.estado) {
      case EstadoContrato.ACTIVO:
        return { label: "Activo", badgeClass: "bg-emerald-100 text-[#124b2d] border-emerald-300" };
      case EstadoContrato.POR_VENCER:
        return { label: "Por Vencer", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" };
      case EstadoContrato.FINALIZADO:
        return { label: "Finalizado", badgeClass: "bg-slate-200 text-slate-800 border-slate-300" };
      case EstadoContrato.RESCINDIDO:
        return { label: "Rescindido", badgeClass: "bg-rose-100 text-rose-800 border-rose-300" };
      default:
        return { label: contrato?.estado || "", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  }, [contrato?.estado]);
  const [isRevertingDeposit, startRevertTransition] = useTransition();
  const [mostrarFormCobro, setMostrarFormCobro] = useState(false);
  const [metodoCobroInline, setMetodoCobroInline] = useState<MetodoPago>(MetodoPago.TRANSFERENCIA);
  const [referenciaCobroInline, setReferenciaCobroInline] = useState("");
  const [isGuardandoCobro, setIsGuardandoCobro] = useState(false);

  const pagos = contrato?.pagos;

  // Ordenar cronológicamente ascendente (desde el inicio del contrato hasta su vencimiento)
  const pagosOrdenados = useMemo(() => {
    if (!pagos) return [];
    return [...pagos].sort((a, b) => {
      if (a.periodoAno !== b.periodoAno) return a.periodoAno - b.periodoAno;
      return a.periodoMes - b.periodoMes;
    });
  }, [pagos]);

  if (!contrato) return null;

  const fInicio = new Date(contrato.fechaInicio).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const fFin = new Date(contrato.fechaFin).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Cálculo de días restantes
  const hoy = new Date();
  const finDate = new Date(contrato.fechaFin);
  const diffTime = finDate.getTime() - hoy.getTime();
  const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contrato: ${contrato.codigo}`}
      subtitle={`${contrato.unidad.codigo} · ${contrato.unidad.propiedad.nombre}`}
      icon={FileText}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Métricas Principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Mensualidad */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Mensualidad
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(contrato.montoAlquiler)}
            </p>
          </div>

          {/* Depósito en Garantía */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Depósito Garantía
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
                {formatCurrency(contrato.depositoGarantia)}
              </p>
            </div>
            {contrato.depositoGarantia && contrato.depositoGarantia > 0 ? (
              <div className="mt-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    contrato.depositoEstado === EstadoDeposito.COBRADO
                      ? "bg-emerald-100 text-emerald-800"
                      : contrato.depositoEstado === EstadoDeposito.PENDIENTE
                      ? "bg-amber-100 text-amber-800"
                      : contrato.depositoEstado === EstadoDeposito.REEMBOLSADO
                      ? "bg-blue-100 text-blue-800"
                      : contrato.depositoEstado === EstadoDeposito.RETENIDO
                      ? "bg-rose-100 text-rose-800"
                      : contrato.depositoEstado === EstadoDeposito.PARCIALMENTE_RETENIDO
                      ? "bg-purple-100 text-purple-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {contrato.depositoEstado === EstadoDeposito.COBRADO
                    ? "En Custodia"
                    : contrato.depositoEstado === EstadoDeposito.PENDIENTE
                    ? "Por Cobrar"
                    : contrato.depositoEstado === EstadoDeposito.REEMBOLSADO
                    ? "Reembolsado"
                    : contrato.depositoEstado === EstadoDeposito.RETENIDO
                    ? "Retenido"
                    : contrato.depositoEstado === EstadoDeposito.PARCIALMENTE_RETENIDO
                    ? "Liq. Parcial"
                    : "No Aplica"}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium mt-1">No estipulado</span>
            )}
          </div>

          {/* Día de Corte */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Día de Cobro
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              Día {contrato.diaCobro}
            </p>
          </div>

          {/* Estado del Contrato */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estado
            </span>
            <div className="mt-1">
              <Badge
                variant={
                  contrato.estado === EstadoContrato.ACTIVO
                    ? "DISPONIBLE"
                    : contrato.estado === EstadoContrato.POR_VENCER
                    ? "OCUPADO"
                    : contrato.estado === EstadoContrato.FINALIZADO
                    ? "FINALIZADO"
                    : "RESCINDIDO"
                }
                dot
                size="sm"
              >
                {contrato.estado === EstadoContrato.ACTIVO
                  ? "Activo / Vigente"
                  : contrato.estado === EstadoContrato.POR_VENCER
                  ? "Por Vencer"
                  : contrato.estado === EstadoContrato.FINALIZADO
                  ? "Finalizado"
                  : "Rescindido"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sección: Partes y Ubicación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Ficha Inquilino */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Arrendatario</span>
            </h4>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {contrato.inquilino.nombre} {contrato.inquilino.apellido ?? ""}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Doc: <span className="font-semibold text-slate-700">{contrato.inquilino.documentoIdentidad}</span>
              </p>
            </div>
            <div className="pt-1">
              <a
                href={getWhatsAppUrl(contrato.inquilino.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="underline decoration-emerald-300 underline-offset-2">
                  {contrato.inquilino.telefono}
                </span>
              </a>
            </div>
          </div>

          {/* Ficha Inmueble y Espacio */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span>Espacio Arrendado</span>
            </h4>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {contrato.unidad.codigo}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {contrato.unidad.propiedad.nombre} · {contrato.unidad.propiedad.ciudad}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {contrato.unidad.propiedad.direccion}
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Vigencia y Plazos */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Vigencia del Contrato</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha de Inicio
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading block mt-0.5">
                {fInicio}
              </span>
            </div>

            <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha de Vencimiento
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading block mt-0.5">
                {fFin}
              </span>
            </div>
          </div>

          {contrato.estado === EstadoContrato.ACTIVO && (
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
                diffDias <= 30
                  ? "bg-amber-50/90 border-amber-200/90 text-amber-900"
                  : "bg-emerald-50/90 border-emerald-200/90 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock
                  className={`w-3.5 h-3.5 shrink-0 ${
                    diffDias <= 30 ? "text-amber-700" : "text-[#175E38]"
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Plazo restante
                </span>
              </div>
              <span
                className={`font-black font-heading text-xs px-2.5 py-0.5 rounded-lg border ${
                  diffDias <= 30
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-emerald-100 text-[#124b2d] border-emerald-300"
                }`}
              >
                {diffDias > 0 ? `${diffDias} días restantes` : "Vencimiento alcanzado"}
              </span>
            </div>
          )}
        </div>

        {/* Custodia y Trazabilidad del Depósito en Garantía */}
        {contrato.depositoGarantia && contrato.depositoGarantia > 0 && (
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

            {/* Formulario rápido inline de cobro de depósito si está pendiente */}
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
        )}

        {/* Historial y Cronograma de Mensualidades (Cobranza) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
              <CircleDollarSign className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Cronograma y Mensualidades del Contrato</span>
            </h4>
            <Link
              href="/admin/cobranza"
              onClick={onClose}
              className="text-[11px] font-bold text-[#175E38] hover:text-[#124b2d] flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Ver cobranza</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoadingPagos ? (
            <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#175E38]" />
              <span>Cargando historial de pagos...</span>
            </div>
          ) : pagosOrdenados.length > 0 ? (
            <div className="space-y-2">
              {pagosOrdenados.map((p) => {
                const nombreMes = NOMBRES_MESES[p.periodoMes] || `Mes ${p.periodoMes}`;
                const hoy = new Date();
                const mesActual = hoy.getMonth() + 1;
                const anoActual = hoy.getFullYear();
                const esFuturo =
                  p.periodoAno > anoActual || (p.periodoAno === anoActual && p.periodoMes > mesActual);

                const fPago = p.fechaPago
                  ? new Date(p.fechaPago).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                    })
                  : null;

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs">
                        <Calendar className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {nombreMes} {p.periodoAno}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {p.estado === EstadoPago.PAGADO && fPago ? (
                            <span className="text-emerald-700 font-medium">
                              {esFuturo ? `Pagado anticipado el ${fPago}` : `Pagado el ${fPago}`}
                            </span>
                          ) : p.estado === EstadoPago.VENCIDO ? (
                            <span className="text-rose-600 font-medium">Vencido en mora</span>
                          ) : p.estado === EstadoPago.PARCIAL ? (
                            <span className="text-blue-700 font-medium">Abono parcial registrado</span>
                          ) : esFuturo ? (
                            <span className="text-slate-500 font-medium">Próximo período programado</span>
                          ) : (
                            <span>Por cobrar</span>
                          )}
                          {p.referencia && ` · Ref: ${p.referencia}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-200/60">
                      <div className="text-right">
                        <span className="text-xs font-black font-heading text-slate-900">
                          ${(p.estado === EstadoPago.PAGADO ? p.montoPagado : p.montoEsperado).toFixed(2)}{" "}
                          <span className="text-[10px] font-semibold text-slate-400">USD</span>
                        </span>
                        {p.estado === EstadoPago.PARCIAL && (
                          <span className="block text-[10px] text-blue-700 font-semibold">
                            Abonado: ${p.montoPagado.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Badge de Estado */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${
                          p.estado === EstadoPago.PAGADO
                            ? "bg-emerald-50 text-[#175E38] border-emerald-200/90"
                            : p.estado === EstadoPago.VENCIDO
                            ? "bg-rose-50 text-[#CC1A22] border-rose-200/90"
                            : p.estado === EstadoPago.PARCIAL
                            ? "bg-blue-50 text-blue-700 border-blue-200/90"
                            : esFuturo
                            ? "bg-slate-100 text-slate-600 border-slate-200/90"
                            : "bg-amber-50 text-amber-700 border-amber-200/90"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.estado === EstadoPago.PAGADO
                              ? "bg-[#175E38]"
                              : p.estado === EstadoPago.VENCIDO
                              ? "bg-[#CC1A22]"
                              : p.estado === EstadoPago.PARCIAL
                              ? "bg-blue-600"
                              : esFuturo
                              ? "bg-slate-400"
                              : "bg-amber-500"
                          }`}
                        />
                        <span>
                          {p.estado === EstadoPago.PAGADO
                            ? esFuturo
                              ? "Adelantado"
                              : "Pagado"
                            : p.estado === EstadoPago.VENCIDO
                            ? "En Mora"
                            : p.estado === EstadoPago.PARCIAL
                            ? "Parcial"
                            : esFuturo
                            ? "Programado"
                            : "Pendiente"}
                        </span>
                      </span>

                      {/* Enlace al comprobante si existe */}
                      {p.comprobanteUrl && (
                        <a
                          href={p.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
                          title="Ver comprobante adjunto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400">
              Aún no hay mensualidades generadas para este contrato.
            </div>
          )}
        </div>

        {/* Documento PDF Firmado */}
        {contrato.documentoUrl ? (
          <div className="p-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 via-white to-slate-50/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#175E38]/10 text-[#175E38] border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading">
                  Copia Digital del Contrato Firmado (PDF)
                </p>
              </div>
            </div>

            <a
              href={contrato.documentoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer whitespace-nowrap active:translate-y-0.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ver Documento</span>
            </a>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <p className="text-xs text-slate-500">
              No se ha subido una copia escaneada o digital de este contrato firmado.
            </p>
          </div>
        )}

        {/* Observaciones / Notas */}
        {contrato.notas && (
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observaciones y Cláusulas
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {contrato.notas}
            </p>
          </div>
        )}

        {/* Pie de Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Menú de Cambio Rápido de Estado */}
          <div ref={menuEstadoRef} className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMenuEstadoAbierto(!menuEstadoAbierto)}
              disabled={isPending}
              className="w-full sm:w-auto h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100/80 text-slate-800 font-bold text-xs flex items-center justify-between sm:justify-start gap-2.5 transition-all cursor-pointer shadow-2xs active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
              title="Cambiar estado del contrato"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin shrink-0" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span className="whitespace-nowrap">Cambiar Estado</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${estadoBadgeConfig.badgeClass}`}>
                  {estadoBadgeConfig.label}
                </span>
              </div>
              <ChevronUp
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 sm:ml-1 ${
                  menuEstadoAbierto ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuEstadoAbierto && (
              <div className="absolute left-0 bottom-full mb-2 w-full sm:w-60 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-40 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Seleccionar nuevo estado
                </div>
                {[
                  { est: EstadoContrato.ACTIVO, label: "Activo / Vigente", icon: CheckCircle2, color: "text-emerald-700", bgHover: "hover:bg-emerald-50/70" },
                  { est: EstadoContrato.POR_VENCER, label: "Por Vencer", icon: AlertTriangle, color: "text-amber-700", bgHover: "hover:bg-amber-50/70" },
                  { est: EstadoContrato.FINALIZADO, label: "Finalizar Contrato", icon: XCircle, color: "text-slate-700", bgHover: "hover:bg-slate-100" },
                  { est: EstadoContrato.RESCINDIDO, label: "Rescindir Contrato", icon: XCircle, color: "text-rose-700", bgHover: "hover:bg-rose-50/70" },
                ].map(({ est, label, icon: Icon, color, bgHover }) => {
                  const esSeleccionado = contrato.estado === est;
                  return (
                    <button
                      key={est}
                      type="button"
                      onClick={() => {
                        setMenuEstadoAbierto(false);
                        if (est === EstadoContrato.FINALIZADO || est === EstadoContrato.RESCINDIDO) {
                          if (onFinalizarORescindir) {
                            onFinalizarORescindir(
                              contrato,
                              est === EstadoContrato.FINALIZADO ? "finalizar" : "rescindir"
                            );
                          } else {
                            onCambiarEstado(contrato.id, est);
                          }
                        } else {
                          onCambiarEstado(contrato.id, est);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${bgHover} ${color} ${
                        esSeleccionado ? "bg-slate-100/90 font-bold" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                      </div>
                      {esSeleccionado && <Check className="w-3.5 h-3.5 text-[#175E38] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botones Cerrar y Editar Contrato */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto sm:min-w-[110px] h-11 px-4 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center active:translate-y-0.5 shadow-2xs"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={onEditar}
              className="w-full sm:w-auto sm:min-w-[160px] h-11 inline-flex items-center justify-center gap-1.5 px-4 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] rounded-xl hover:bg-[#124b2d] transition-all shadow-[0_2px_8px_rgba(23,94,56,0.25)] cursor-pointer active:translate-y-0.5"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
              <span>Editar Contrato</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
