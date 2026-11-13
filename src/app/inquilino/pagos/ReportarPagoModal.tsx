"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui";
import { Select, type SelectOption } from "@/components/ui/select";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagen, formatearBytes, PRESETS_COMPRESION } from "@/lib/file-compressor";
import { toast } from "sonner";
import { MetodoPago } from "@prisma/client";
import { OPCIONES_METODO_PAGO } from "@/lib/constants/pagos";
import { reportarPagoInquilinoAction, type ReportarPagoInput } from "@/lib/actions/inquilinoPortal";
import type { PagoItem } from "@/app/admin/cobranza/types";
import { MESES } from "@/lib/date-utils";
import {
  Upload,
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  Hash,
  FileCheck,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Building2,
  Clock,
  Mail,
  Copy,
  Check,
  Store,
} from "lucide-react";
import { formatBS } from "@/lib/formatters";
import type { TasaBcvResponse } from "@/lib/bcv";

interface ReportarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagosPendientes: PagoItem[];
  pagoPreseleccionado?: PagoItem | null;
  tasaBcvActual?: TasaBcvResponse;
  onSuccess?: () => void;
}

export function ReportarPagoModal({
  isOpen,
  onClose,
  pagosPendientes,
  pagoPreseleccionado,
  tasaBcvActual,
  onSuccess,
}: ReportarPagoModalProps) {
  const [pagoId, setPagoId] = useState<string>(
    pagoPreseleccionado?.id || pagosPendientes[0]?.id || ""
  );

  // Cuota actualmente seleccionada y su saldo deudor máximo
  const cuotaSeleccionada =
    pagosPendientes.find((p) => p.id === pagoId) || pagoPreseleccionado || pagosPendientes[0];

  const saldoMaximo = cuotaSeleccionada
    ? Math.max(0, Number((cuotaSeleccionada.montoEsperado - cuotaSeleccionada.montoPagado).toFixed(2)))
    : 0;

  // Detección de comprobante previamente descartado en la cuota seleccionada
  const matchRechazoModal = cuotaSeleccionada?.notas?.match(
    /Comprobante descartado por administración:\s*([^.\n]+)/i
  );
  const motivoRechazoModal = matchRechazoModal ? matchRechazoModal[1].trim() : null;

  const [montoReportado, setMontoReportado] = useState<number>(saldoMaximo);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.PAGO_MOVIL);
  const [montoBs, setMontoBs] = useState<string>("");
  const [copiado, setCopiado] = useState<boolean>(false);
  const [referencia, setReferencia] = useState<string>("");
  const [fechaPago, setFechaPago] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [notas, setNotas] = useState<string>("");

  // Detección de moneda nacional y cálculo en tiempo real
  const esMetodoVES =
    metodoPago === MetodoPago.PAGO_MOVIL || metodoPago === MetodoPago.TRANSFERENCIA;
  const tasaBcvValor = tasaBcvActual?.tasa || 0;
  const montoBsCalculado =
    tasaBcvValor > 0 && montoReportado > 0
      ? Number((montoReportado * tasaBcvValor).toFixed(2))
      : 0;

  // Manejo de comprobante bancario (UploadThing + compresión WebP silenciosa)
  const [comprobanteUrl, setComprobanteUrl] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [statsCompresion, setStatsCompresion] = useState<{
    original: string;
    final: string;
    ahorroPct: number;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar cuota preseleccionada y limpiar campos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      // Si viene preseleccionado desde una tarjeta específica y existe en las cuotas elegibles, respetarlo;
      // de lo contrario, tomar la cuota prioritaria (índice 0: deudas en mora o del mes corriente primero)
      const existePre = pagoPreseleccionado && pagosPendientes.some((p) => p.id === pagoPreseleccionado.id);
      const idSeleccionado = existePre ? pagoPreseleccionado!.id : pagosPendientes[0]?.id || "";
      setPagoId(idSeleccionado);
      const cuota = pagosPendientes.find((p) => p.id === idSeleccionado) || pagosPendientes[0];
      if (cuota) {
        setMontoReportado(Math.max(0, Number((cuota.montoEsperado - cuota.montoPagado).toFixed(2))));
      }
      setReferencia("");
      setNotas("");
      setComprobanteUrl("");
      setMontoBs("");
      setCopiado(false);
    }
  }, [isOpen, pagoPreseleccionado, pagosPendientes]);

  const handleCopiarMontoBs = () => {
    const valorACopiar = montoBs ? montoBs : montoBsCalculado.toFixed(2);
    if (!valorACopiar || Number(valorACopiar) <= 0) return;
    navigator.clipboard.writeText(valorACopiar);
    setCopiado(true);
    toast.success(
      `Monto copiado: Bs. ${Number(valorACopiar).toLocaleString("es-VE", {
        minimumFractionDigits: 2,
      })}`
    );
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleLlenarMontoBs = () => {
    if (montoBsCalculado > 0) {
      setMontoBs(montoBsCalculado.toFixed(2));
      toast.info(`Monto en Bs fijado a Bs. ${montoBsCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`);
    }
  };

  const { startUpload, isUploading } = useOperacionesUploadThing("comprobantePago", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        const url = res[0].ufsUrl || res[0].url;
        setComprobanteUrl(url);
        toast.success("Comprobante subido correctamente.");
      }
    },
    onUploadError: (err) => {
      console.error("Error en upload:", err);
      toast.error(`Error al cargar comprobante: ${err.message}`);
    },
  });

  // Al cambiar la cuota seleccionada, actualizar monto
  const handleCambioCuota = (nuevaCuotaId: string) => {
    setPagoId(nuevaCuotaId);
    const c = pagosPendientes.find((p) => p.id === nuevaCuotaId);
    if (c) {
      setMontoReportado(Math.max(0, c.montoEsperado - c.montoPagado));
    }
  };

  const ahora = useMemo(() => new Date(), []);

  // Opciones con máxima notoriedad del LOCAL y el canon en el selector
  const opcionesCuotas = useMemo((): SelectOption[] => {
    const mesActual = ahora.getUTCMonth() + 1;
    const anoActual = ahora.getUTCFullYear();

    return pagosPendientes.map((p) => {
      const mesNombre = MESES[p.periodoMes - 1] || `Mes ${p.periodoMes}`;
      const localStr = p.contrato?.unidad?.codigo || "Espacio";
      const propStr = p.contrato?.unidad?.propiedad?.nombre || "";
      const diaCobro = p.contrato?.diaCobro;
      const deuda = Math.max(0, Number((p.montoEsperado - p.montoPagado).toFixed(2)));

      const esAdelanto =
        p.periodoAno > anoActual || (p.periodoAno === anoActual && p.periodoMes > mesActual);

      return {
        value: p.id,
        label: `${localStr} — ${mesNombre} ${p.periodoAno}`,
        sublabel: `${propStr}${diaCobro ? ` · Corte: Día ${diaCobro}` : ""}${esAdelanto ? " · Adelanto" : ""}`,
        icon: Store,
        badge: {
          text: `$${deuda.toFixed(2)} USD`,
          variant: esAdelanto ? "blue" : "emerald",
        },
      };
    });
  }, [pagosPendientes, ahora]);

  const handleProcesarArchivo = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten fotos o capturas (JPG, PNG o WEBP). No se admiten archivos PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La foto del comprobante no debe superar los 10 MB antes de optimizar.");
      return;
    }

    setIsCompressing(true);
    try {
      // Preset de alta compresión y nitidez para comprobantes bancarios
      const res = await comprimirImagen(file, PRESETS_COMPRESION.comprobantePago);
      setStatsCompresion({
        original: formatearBytes(res.pesoOriginal),
        final: formatearBytes(res.pesoFinal),
        ahorroPct: res.ahorroPct,
      });
      await startUpload([res.file]);
    } catch (err) {
      console.error("Error comprimiendo imagen:", err);
      toast.error("No se pudo procesar la imagen. Intentando subir original...");
      await startUpload([file]);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pagoId) {
      toast.error("Debes seleccionar una cuota a pagar.");
      return;
    }
    if (!referencia.trim()) {
      toast.error("Debes ingresar el número de referencia o confirmación bancaria.");
      return;
    }
    if (!comprobanteUrl.trim()) {
      toast.error("Es obligatorio adjuntar el comprobante o captura de la transacción.");
      return;
    }
    if (montoReportado <= 0) {
      toast.error("El monto debe ser mayor a 0.");
      return;
    }
    if (saldoMaximo > 0 && montoReportado > saldoMaximo) {
      toast.error(
        `El monto reportado ($${montoReportado.toFixed(2)} USD) no puede superar el saldo pendiente de este canon ($${saldoMaximo.toFixed(2)} USD).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ReportarPagoInput = {
        pagoId,
        montoReportado: Number(montoReportado),
        montoBs:
          esMetodoVES && (montoBs || montoBsCalculado)
            ? Number(montoBs || montoBsCalculado)
            : undefined,
        tasaBcv: esMetodoVES && tasaBcvValor > 0 ? tasaBcvValor : undefined,
        fechaPago,
        metodoPago,
        referencia: referencia.trim(),
        comprobanteUrl: comprobanteUrl.trim(),
        notas: notas.trim() || undefined,
      };

      const res = await reportarPagoInquilinoAction(payload);
      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.error || "No se pudo reportar el pago.");
      }
    } catch (err) {
      console.error("Error en reporte:", err);
      toast.error("Error inesperado al reportar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reportar Pago de Alquiler"
      icon={CreditCard}
      headerVariant="green"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Alerta de comprobante previamente descartado */}
        {motivoRechazoModal && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-800 space-y-1 animate-in fade-in-50">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <AlertCircle className="w-4 h-4 text-[#CC1A22] shrink-0" />
              <span>Comprobante anterior descartado por administración</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed pl-5.5">
              <strong className="text-rose-900">Motivo:</strong> {motivoRechazoModal}.
              Por favor, verifica los datos del pago y adjunta un comprobante nítido y legible.
            </p>
          </div>
        )}

        {/* Paso 1: Selección de Cuota y Monto */}
        <div className="space-y-3 sm:space-y-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 1</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Cuota a Solventar</h4>
          </div>

          {/* Selector de Local y Cuota con Máxima Notoriedad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Espacio y Canon a Solventar <span className="text-emerald-700">*</span>
              </label>
              {opcionesCuotas.length > 1 && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {opcionesCuotas.length} opciones disponibles
                </span>
              )}
            </div>

            <Select
              value={pagoId}
              onChange={handleCambioCuota}
              options={opcionesCuotas}
              disabled={isSubmitting}
              placeholder="Seleccionar local y canon..."
            />
          </div>

          {/* Formulario de Monto y Fecha (Uno debajo de otro) */}
          <div className="space-y-3 sm:space-y-3.5 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Monto Reportado (USD) <span className="text-emerald-700">*</span>
                </label>
                {saldoMaximo > 0 && (
                  <button
                    type="button"
                    onClick={() => setMontoReportado(saldoMaximo)}
                    className="text-[10px] font-bold text-[#175E38] hover:underline cursor-pointer"
                  >
                    Llenar total (${saldoMaximo.toFixed(2)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldoMaximo > 0 ? saldoMaximo : undefined}
                  value={montoReportado || ""}
                  onChange={(e) => setMontoReportado(Number(e.target.value))}
                  disabled={isSubmitting}
                  required
                  className={`w-full h-11 pl-8 pr-3 rounded-xl border bg-white text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 shadow-2xs ${
                    saldoMaximo > 0 && montoReportado > saldoMaximo
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-[#175E38]/20 focus:border-[#175E38]"
                  }`}
                  placeholder="0.00"
                />
              </div>
              {saldoMaximo > 0 && montoReportado > saldoMaximo ? (
                <p className="text-[11px] text-rose-600 font-bold mt-1">
                  Excede el saldo pendiente (${saldoMaximo.toFixed(2)} USD)
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Máximo a reportar: ${saldoMaximo.toFixed(2)} USD
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Fecha de la Transferencia <span className="text-emerald-700">*</span>
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Paso 2: Detalles Bancarios */}
        <div className="space-y-3 sm:space-y-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 2</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Detalles Bancarios</h4>
          </div>

          <div className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Método de Pago <span className="text-emerald-700">*</span>
              </label>
              <Select
                value={metodoPago}
                onChange={(val) => setMetodoPago(val as MetodoPago)}
                options={OPCIONES_METODO_PAGO}
                disabled={isSubmitting}
                placeholder="Seleccionar método..."
              />
            </div>

            {/* Panel Asistido de Conversión a Bolívares (Fase 23) */}
            {esMetodoVES && (
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-slate-50 border border-emerald-200/90 rounded-2xl shadow-2xs space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#175E38] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 block leading-tight">
                        Cálculo en Bolívares (Tasa Oficial BCV)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        1 USD = Bs. {tasaBcvValor ? tasaBcvValor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopiarMontoBs}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[10px] font-bold hover:bg-emerald-50 transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                      title="Copiar monto sugerido en Bs para pegar en tu banco"
                    >
                      {copiado ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-emerald-700" />
                          <span>Copiar Bs</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleLlenarMontoBs}
                      className="px-2.5 py-1 rounded-lg bg-[#175E38] text-white text-[10px] font-bold hover:bg-[#124b2d] transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                      title="Llenar casilla con el monto calculado exacto"
                    >
                      <span>Llenar Bs</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Monto sugerido a transferir:
                  </span>
                  <span className="text-base sm:text-lg font-black font-heading text-emerald-800">
                    Bs. {montoBsCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Monto debitado en Bolívares (Bs.) <span className="text-emerald-700">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Según tu comprobante bancario
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      Bs.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={montoBs}
                      onChange={(e) => setMontoBs(e.target.value)}
                      disabled={isSubmitting}
                      placeholder={montoBsCalculado > 0 ? montoBsCalculado.toFixed(2) : "0.00"}
                      className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                N° de Referencia / Confirmación <span className="text-emerald-700">*</span>
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                disabled={isSubmitting}
                required
                placeholder="Ej: 049281 / Ref 1234"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Observaciones o Notas Adicionales (Opcional)
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Pago realizado desde cuenta Banesco de titular Juan..."
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Paso 3: Comprobante de Pago (UploadThing) */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 3</p>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">Comprobante o Capture</h4>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleProcesarArchivo(f);
            }}
            className="hidden"
          />

          {comprobanteUrl ? (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl border border-emerald-200 bg-white shrink-0 overflow-hidden shadow-2xs flex items-center justify-center">
                  <img
                    src={comprobanteUrl}
                    alt="Capture de pago"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-emerald-900">
                      Foto adjuntada
                    </span>
                    {statsCompresion && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#175E38] border border-emerald-200">
                        {statsCompresion.final} {statsCompresion.ahorroPct > 0 && `(−${statsCompresion.ahorroPct}%)`}
                      </span>
                    )}
                  </div>

                  <a
                    href={comprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1 mt-0.5"
                  >
                    <span>Ver foto completa</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setComprobanteUrl("");
                  setStatsCompresion(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isSubmitting}
                className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                title="Eliminar y subir otra foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleProcesarArchivo(f);
              }}
              onClick={() => {
                if (!isUploading && !isCompressing) {
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                isDragOver
                  ? "border-[#175E38] bg-emerald-50/50"
                  : isUploading || isCompressing
                  ? "cursor-wait bg-slate-50 border-slate-300"
                  : "border-slate-300 hover:border-[#175E38]/60 bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              {isCompressing ? (
                <div className="py-2 flex flex-col items-center gap-1.5">
                  <Loader2 className="w-6 h-6 animate-spin text-[#175E38]" />
                  <span className="text-xs font-bold text-slate-800">
                    Optimizando foto bancaria...
                  </span>
                </div>
              ) : isUploading ? (
                <div className="py-2 flex flex-col items-center gap-1.5">
                  <Loader2 className="w-6 h-6 animate-spin text-[#175E38]" />
                  <span className="text-xs font-bold text-slate-800">
                    Subiendo a bóveda digital...
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Upload className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Toca para subir tu foto <span className="hidden sm:inline">o arrástrala aquí</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Foto o captura en JPG, PNG o WEBP (máx. 1 foto optimizada)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Acciones Inferiores */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading || isCompressing}
            className="w-full sm:w-auto sm:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading || isCompressing || !comprobanteUrl}
            className="relative w-full sm:w-auto sm:min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Indicador flotante: Notifica por correo */}
            <span
              className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-md border-2 border-white ring-1 ring-amber-600/30 pointer-events-none"
              title="Esta acción envía un correo automático al Administrador"
            >
              <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
            </span>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <span>Enviar Reporte</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
