"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  CreditCard,
  Hash,
  UploadCloud,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Trash2,
  DollarSign,
  Coins,
  Pencil,
  RefreshCw,
  Image as ImageIcon,
  Mail,
  Lock,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";
import { MetodoPago, EstadoPago, MonedaTransaccion } from "@prisma/client";
import { comprimirImagen, formatearBytes, PRESETS_COMPRESION } from "@/lib/file-compressor";
import type { PagoItem } from "./types";
import { rechazarComprobanteReportadoAction, type RegistrarPagoInput } from "@/lib/actions/cobranza";
import { METODO_PAGO_CONFIG } from "@/lib/constants/pagos";
import { MESES } from "@/lib/date-utils";

interface PagoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: PagoItem | null;
  onSubmit: (data: RegistrarPagoInput) => Promise<boolean>;
  onRechazado?: () => void;
  isLoading?: boolean;
}

interface PagoFormContentProps {
  pago: PagoItem;
  onClose: () => void;
  onSubmit: (data: RegistrarPagoInput) => Promise<boolean>;
  onRechazado?: () => void;
  isLoading?: boolean;
}

function PagoFormContent({
  pago,
  onClose,
  onSubmit,
  onRechazado,
  isLoading = false,
}: PagoFormContentProps) {
  const saldoRestante = Math.max(0, Number((pago.montoEsperado - pago.montoPagado).toFixed(2)));
  const esPorConfirmar = Boolean(pago.comprobanteUrl && pago.estado !== EstadoPago.PAGADO);

  // Extraer el monto especifico reportado por el inquilino en las notas si existe
  const matchMontoReportado = pago.notas?.match(/\(\$([0-9]+(?:\.[0-9]{1,2})?)\)/);
  const montoReportadoParsed = matchMontoReportado ? parseFloat(matchMontoReportado[1]) : null;

  // Deteccion inicial de moneda: Por defecto Bolivares (VES), salvo pago reportado expresamente en USD
  const monedaInicial: MonedaTransaccion =
    esPorConfirmar &&
    (pago.metodoPago === MetodoPago.EFECTIVO_USD ||
      pago.metodoPago === MetodoPago.ZELLE)
      ? MonedaTransaccion.USD
      : MonedaTransaccion.VES;

  const [monedaOriginal, setMonedaOriginal] = useState<MonedaTransaccion>(monedaInicial);
  const monedaRef = useRef(monedaOriginal);
  monedaRef.current = monedaOriginal;

  const hoyStr = new Date().toISOString().split("T")[0];
  const [fechaPago, setFechaPago] = useState<string>(
    pago.fechaPago ? pago.fechaPago.split("T")[0] : hoyStr
  );

  // Estados para tasa BCV oficial y edicion manual
  const [tasaBcv, setTasaBcv] = useState<string>(
    pago.tasaBcv ? pago.tasaBcv.toString() : "914.0218"
  );
  const [cargandoTasa, setCargandoTasa] = useState(false);
  const [editandoTasaManual, setEditandoTasaManual] = useState(false);
  const [esTasaFallback, setEsTasaFallback] = useState(false);

  // Estados para montos segun moneda
  const montoInicialUsd =
    esPorConfirmar && montoReportadoParsed && montoReportadoParsed > 0 && montoReportadoParsed <= saldoRestante
      ? montoReportadoParsed.toFixed(2)
      : saldoRestante > 0
      ? saldoRestante.toString()
      : pago.montoEsperado.toString();

  const tasaInicialNum = pago.tasaBcv || 914.0218;
  const montoInicialBs =
    pago.montoBs
      ? pago.montoBs.toString()
      : monedaInicial === MonedaTransaccion.VES && tasaInicialNum > 0 && parseFloat(montoInicialUsd) > 0
      ? (parseFloat(montoInicialUsd) * tasaInicialNum).toFixed(2)
      : "";

  const [montoUsd, setMontoUsd] = useState<string>(montoInicialUsd);
  const [montoBs, setMontoBs] = useState<string>(montoInicialBs);

  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    esPorConfirmar && pago.metodoPago
      ? pago.metodoPago
      : monedaInicial === MonedaTransaccion.VES
      ? MetodoPago.PAGO_MOVIL
      : MetodoPago.EFECTIVO_USD
  );

  const [referencia, setReferencia] = useState<string>(pago.referencia || "");
  const [comprobanteUrl, setComprobanteUrl] = useState<string>(pago.comprobanteUrl || "");
  const [notas, setNotas] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRechazando, setIsRechazando] = useState(false);
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState(
    "El comprobante no coincide con los movimientos bancarios o no es legible."
  );

  // Consultar la tasa BCV oficial para la fecha seleccionada
  const consultarTasaBcv = async (fechaParam?: string) => {
    setCargandoTasa(true);
    try {
      const fechaAUsar = fechaParam ?? fechaPago;
      const url = fechaAUsar ? `/api/bcv?fecha=${fechaAUsar}` : "/api/bcv";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data?.tasa) {
        setEsTasaFallback(!!json.data.esFallback);
        const nuevaTasa = json.data.tasa;
        if (!editandoTasaManual || fechaParam) {
          setTasaBcv(nuevaTasa.toString());
          if (monedaRef.current === MonedaTransaccion.VES && !pago.montoBs && montoUsd) {
            setMontoBs((parseFloat(montoUsd) * nuevaTasa).toFixed(2));
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar la tasa BCV:", e);
    } finally {
      setCargandoTasa(false);
    }
  };

  useEffect(() => {
    if (!pago.tasaBcv) {
      consultarTasaBcv(fechaPago);
    }
  }, []);

  const handleCambioFecha = (nuevaFecha: string) => {
    setFechaPago(nuevaFecha);
    if (!editandoTasaManual) {
      consultarTasaBcv(nuevaFecha);
    }
  };

  // Alternar entre Bolivares y Dolares con conversion de valores
  const handleCambioMoneda = (nuevaMoneda: MonedaTransaccion) => {
    setMonedaOriginal(nuevaMoneda);
    const tasaNum = parseFloat(tasaBcv) || 0;

    if (nuevaMoneda === MonedaTransaccion.VES) {
      if (metodoPago === MetodoPago.EFECTIVO_USD || metodoPago === MetodoPago.ZELLE) {
        setMetodoPago(MetodoPago.PAGO_MOVIL);
      }
      if (!montoBs && montoUsd && tasaNum > 0) {
        setMontoBs((parseFloat(montoUsd) * tasaNum).toFixed(2));
      }
    } else {
      if (metodoPago === MetodoPago.PAGO_MOVIL) {
        setMetodoPago(MetodoPago.EFECTIVO_USD);
      }
      if (!montoUsd && montoBs && tasaNum > 0) {
        setMontoUsd((parseFloat(montoBs) / tasaNum).toFixed(2));
      }
    }
  };

  // Ajustar moneda si el metodo seleccionado pertenece estrictamente a una divisa
  const handleCambioMetodo = (nuevoMetodo: MetodoPago) => {
    setMetodoPago(nuevoMetodo);
    if (nuevoMetodo === MetodoPago.PAGO_MOVIL && monedaOriginal !== MonedaTransaccion.VES) {
      handleCambioMoneda(MonedaTransaccion.VES);
    } else if (
      (nuevoMetodo === MetodoPago.EFECTIVO_USD || nuevoMetodo === MetodoPago.ZELLE) &&
      monedaOriginal !== MonedaTransaccion.USD
    ) {
      handleCambioMoneda(MonedaTransaccion.USD);
    }
  };

  const tasaNum = parseFloat(tasaBcv) || 0;

  // Monto numerico imputado en USD al canon
  const montoNumero =
    monedaOriginal === MonedaTransaccion.VES
      ? tasaNum > 0 && parseFloat(montoBs) > 0
        ? Number((parseFloat(montoBs) / tasaNum).toFixed(2))
        : 0
      : parseFloat(montoUsd) || 0;

  // Contravalor referencial en Bolivares cuando se opera en USD
  const contravalorBs =
    monedaOriginal === MonedaTransaccion.USD && tasaNum > 0 && montoNumero > 0
      ? Number((montoNumero * tasaNum).toFixed(2))
      : 0;

  const nuevoTotalAcumulado = Number(((pago.montoPagado || 0) + montoNumero).toFixed(2));
  const nuevoSaldoRestante = Math.max(0, Number((pago.montoEsperado - nuevoTotalAcumulado).toFixed(2)));
  const completaPago = nuevoTotalAcumulado >= pago.montoEsperado;
  const esExcedente = nuevoTotalAcumulado > pago.montoEsperado;

  // Filtrar metodos de pago disponibles segun la moneda elegida
  const opcionesMetodoPago = Object.entries(METODO_PAGO_CONFIG)
    .filter(([key]) => {
      if (monedaOriginal === MonedaTransaccion.VES) {
        return key === MetodoPago.PAGO_MOVIL || key === MetodoPago.TRANSFERENCIA || key === MetodoPago.OTRO;
      }
      return key === MetodoPago.EFECTIVO_USD || key === MetodoPago.ZELLE || key === MetodoPago.TRANSFERENCIA || key === MetodoPago.OTRO;
    })
    .map(([key, config]) => ({
      value: key,
      label: config.label,
    }));

  const handleConfirmarRechazo = async () => {
    if (!pago || !motivoRechazoInput.trim()) return;
    setIsRechazando(true);
    try {
      const res = await rechazarComprobanteReportadoAction(pago.id, motivoRechazoInput.trim());
      if (res.success) {
        toast.success("Comprobante descartado y notificado al inquilino.");
        setModalRechazoAbierto(false);
        onClose();
        if (onRechazado) onRechazado();
      } else {
        toast.error(res.error || "No se pudo descartar el comprobante.");
      }
    } finally {
      setIsRechazando(false);
    }
  };

  const [statsCompresion, setStatsCompresion] = useState<{
    original: string;
    final: string;
    ahorroPct: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook directo para carga del comprobante en la cuenta de operaciones
  const { startUpload, isUploading } = useOperacionesUploadThing("comprobantePago", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        const url = res[0].ufsUrl || res[0].url;
        setComprobanteUrl(url);
        toast.success("Comprobante cargado exitosamente.");
      }
    },
    onUploadError: (err) => {
      console.error("Error al cargar comprobante:", err);
      toast.error(`Error al subir comprobante: ${err.message}`);
    },
  });

  const procesarYSubirComprobante = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imagenes (JPG, PNG o WEBP). No se admiten archivos PDF u otros formatos.");
      return;
    }

    const LIMITE_MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > LIMITE_MAX_BYTES) {
      toast.error("La imagen del comprobante no debe superar los 10 MB.");
      return;
    }

    setIsCompressing(true);

    try {
      const res = await comprimirImagen(file, PRESETS_COMPRESION.comprobantePago);
      setStatsCompresion({
        original: formatearBytes(res.pesoOriginal),
        final: formatearBytes(res.pesoFinal),
        ahorroPct: res.ahorroPct,
      });

      if (res.ahorroPct >= 5) {
        toast.success(`Foto optimizada: ${formatearBytes(res.pesoOriginal)} → ${formatearBytes(res.pesoFinal)} (−${res.ahorroPct}%)`);
      }

      await startUpload([res.file]);
    } catch (err) {
      console.error("Error al procesar/subir imagen:", err);
      toast.error("No se pudo procesar la imagen del comprobante.");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarYSubirComprobante(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (montoNumero <= 0) {
      toast.error(
        monedaOriginal === MonedaTransaccion.VES
          ? "El monto en Bolivares debe ser mayor a 0 y la tasa BCV debe ser valida."
          : "El monto del abono debe ser mayor a 0."
      );
      return;
    }

    if (!fechaPago) {
      toast.error("Por favor indique la fecha en la que se efectuo el pago.");
      return;
    }

    const montoBsFinal =
      monedaOriginal === MonedaTransaccion.VES
        ? parseFloat(montoBs) || null
        : contravalorBs > 0
        ? contravalorBs
        : null;

    const payload: RegistrarPagoInput = {
      pagoId: pago.id,
      montoPagado: montoNumero,
      fechaPago,
      metodoPago,
      referencia: referencia.trim() || undefined,
      comprobanteUrl: comprobanteUrl.trim() || undefined,
      notas: notas.trim() || undefined,
      monedaOriginal,
      montoOriginal:
        monedaOriginal === MonedaTransaccion.VES
          ? parseFloat(montoBs) || montoNumero
          : montoNumero,
      montoBs: montoBsFinal,
      tasaBcv: tasaNum > 0 ? tasaNum : null,
    };

    setIsSubmitting(true);
    try {
      const exito = await onSubmit(payload);
      if (exito) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
      {/* Banner de Imputacion Contable Bloqueada */}
      {pago.anteriorImpago && pago.estado !== EstadoPago.PAGADO && (
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 text-amber-900 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
            <Lock className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1 text-xs leading-relaxed">
            <p className="font-bold text-amber-950 font-heading">
              Imputacion Contable Bloqueada: Canon anterior pendiente
            </p>
            <p className="text-amber-800 text-[11px] mt-0.5 font-medium">
              Este contrato mantiene un saldo pendiente en{" "}
              <strong>
                {MESES[(pago.anteriorImpago.mes || 1) - 1]} {pago.anteriorImpago.ano}
              </strong>{" "}
              (Resta: <strong>${pago.anteriorImpago.saldo.toFixed(2)} USD</strong>). Por norma contable y correlatividad de pagos,
              debes liquidar primero dicho periodo antes de asentar pagos en este mes.
            </p>
          </div>
        </div>
      )}

      {/* Ficha resumen del cobro con desglose financiero */}
      <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Inquilino y Espacio
            </div>
            <div className="font-heading font-black text-slate-900 text-sm sm:text-base">
              {pago.contrato.inquilino.nombre} {pago.contrato.inquilino.apellido || ""}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {pago.contrato.unidad.codigo} • {pago.contrato.unidad.propiedad.nombre}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Dia de Cobro
            </span>
            <span className="text-xs font-bold text-slate-800">
              Dia {pago.contrato.diaCobro} de cada mes
            </span>
          </div>
        </div>

        {/* 3 Cajas de metricas financieras del canon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
          <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Canon Total
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-900 font-heading block mt-0.5">
              ${pago.montoEsperado.toFixed(2)}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200/70">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Ya Abonado
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-800 font-heading block mt-0.5">
              ${(pago.montoPagado || 0).toFixed(2)}
            </span>
          </div>
          <div
            className={`p-2 sm:p-2.5 rounded-xl border ${
              saldoRestante === 0
                ? "bg-slate-100 border-slate-200 text-slate-400"
                : "bg-amber-50/50 border-amber-200/70 text-amber-900"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              Resta
            </span>
            <span className="text-xs sm:text-sm font-black font-heading block mt-0.5">
              ${saldoRestante.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Historial previo de abonos si existen */}
      {pago.transacciones && pago.transacciones.length > 0 && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Abonos Asentados en este Periodo ({pago.transacciones.length})</span>
            <span className="font-mono text-slate-600 font-bold">Total: ${(pago.montoPagado || 0).toFixed(2)}</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {pago.transacciones.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 font-mono">${t.monto.toFixed(2)} USD</span>
                  {t.montoBs && t.tasaBcv && (
                    <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                      (Bs. {t.montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} @ {t.tasaBcv.toFixed(2)})
                    </span>
                  )}
                  <div className="text-[10px] text-slate-400">
                    {t.fechaPago ? t.fechaPago.split("T")[0] : "Fecha N/D"}
                    {t.referencia && ` · Ref: ${t.referencia}`}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {t.metodoPago.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seccion 1: Datos de la Transaccion y Multimoneda */}
      <div className="border-t border-slate-100 pt-5 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 1</p>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5">
            {pago.montoPagado > 0 ? "Detalles del Nuevo Abono" : "Detalles del Pago"}
          </h4>
        </div>

        {/* Selector de Moneda de Pago (Bs. VES vs $ USD) */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Moneda del Pago <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleCambioMoneda(MonedaTransaccion.VES)}
              className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                monedaOriginal === MonedaTransaccion.VES
                  ? "bg-[#175E38] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Bolivares (Bs. VES)</span>
            </button>
            <button
              type="button"
              onClick={() => handleCambioMoneda(MonedaTransaccion.USD)}
              className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                monedaOriginal === MonedaTransaccion.USD
                  ? "bg-[#1C2539] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Dolares ($ USD)</span>
            </button>
          </div>
        </div>

        {/* Campos condicionales segun moneda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
          {monedaOriginal === MonedaTransaccion.VES ? (
            <>
              {/* Monto en Bolivares */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Monto en Bolivares (Bs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">
                    Bs.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={montoBs}
                    onChange={(e) => setMontoBs(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Tasa BCV Oficial aplicada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Tasa Oficial BCV <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditandoTasaManual(!editandoTasaManual)}
                    className="text-[11px] font-bold text-[#175E38] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{editandoTasaManual ? "Automatica" : "Ajustar Tasa"}</span>
                  </button>
                </div>

                {editandoTasaManual ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={tasaBcv}
                      onChange={(e) => setTasaBcv(e.target.value)}
                      placeholder="Tasa en Bs/USD"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-amber-300 bg-amber-50/50 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                ) : (
                  <div className="h-11 px-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {cargandoTasa ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#175E38]" />
                      ) : (
                        <Coins className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                      )}
                      <span className="font-mono font-bold text-slate-900 truncate">
                        {tasaNum > 0
                          ? `${tasaNum.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })} Bs/$`
                          : "Consultando..."}
                      </span>
                      {esTasaFallback && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                          Cache
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => consultarTasaBcv(fechaPago)}
                      disabled={cargandoTasa}
                      title="Sincronizar tasa BCV oficial"
                      className="text-slate-400 hover:text-[#175E38] transition-colors p-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${cargandoTasa ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Banner de Contravalor en USD en vivo */}
              <div className="sm:col-span-2 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Equivalente Imputado al Canon:</span>
                </span>
                <span className="font-heading font-black text-slate-900 text-base">
                  ${montoNumero.toFixed(2)} USD
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Monto en Dolares */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  {pago.montoPagado > 0 ? "Monto de este Abono (USD)" : "Monto a Registrar (USD)"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={montoUsd}
                    onChange={(e) => setMontoUsd(e.target.value)}
                    placeholder="Ej: 50.00"
                    className="w-full pl-8 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Tasa BCV Referencial */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Tasa BCV de Referencia
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditandoTasaManual(!editandoTasaManual)}
                    className="text-[11px] font-bold text-[#175E38] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{editandoTasaManual ? "Automatica" : "Ajustar"}</span>
                  </button>
                </div>

                {editandoTasaManual ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={tasaBcv}
                      onChange={(e) => setTasaBcv(e.target.value)}
                      placeholder="Tasa en Bs/USD"
                      className="w-full h-11 px-3.5 rounded-xl border border-amber-300 bg-amber-50/50 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {cargandoTasa ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      ) : (
                        <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="font-mono font-medium text-slate-700 truncate">
                        {tasaNum > 0
                          ? `${tasaNum.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })} Bs/$`
                          : "—"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => consultarTasaBcv(fechaPago)}
                      disabled={cargandoTasa}
                      title="Sincronizar tasa BCV"
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${cargandoTasa ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Referencial en Bolivares */}
              {contravalorBs > 0 && (
                <div className="sm:col-span-2 p-2.5 bg-slate-50/60 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Equivalente de referencia en Bolivares:</span>
                  <span className="font-bold font-mono text-slate-800">
                    Bs. {contravalorBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Proyeccion contable de cobertura */}
          {montoNumero > 0 && (
            <div className="sm:col-span-2">
              {completaPago ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 w-full">
                  <CheckCircle className="w-4 h-4 text-[#175E38] shrink-0" />
                  <span>
                    {esExcedente
                      ? `Cubre y excede el canon · Acumulara $${nuevoTotalAcumulado.toFixed(2)} USD`
                      : `¡Completa el total! · Cuota liquidada ($${nuevoTotalAcumulado.toFixed(2)} USD)`}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/80 w-full">
                  <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Abono parcial · Acumulara ${nuevoTotalAcumulado.toFixed(2)} USD · Restara ${nuevoSaldoRestante.toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Fecha del pago */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Fecha del Pago <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                required
                value={fechaPago}
                onChange={(e) => handleCambioFecha(e.target.value)}
                className="w-full pl-10 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Metodo de Pago */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Metodo de Pago <span className="text-rose-500">*</span>
            </label>
            <Select
              value={metodoPago}
              onChange={(val) => handleCambioMetodo(val as MetodoPago)}
              options={opcionesMetodoPago}
              icon={<CreditCard className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Referencia Bancaria */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Numero de Referencia
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: 984512 o Zelle Fabian"
                className="w-full pl-10 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seccion 2: Comprobante y Notas */}
      <div className="border-t border-slate-100 pt-5 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Paso 2</p>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5">Comprobante y Notas</h4>
        </div>
        <div className="space-y-3 mt-3">
          {/* Carga de Comprobante */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 mb-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Foto del Comprobante</span>
                <span className="text-[11px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Opcional · Max. 1 imagen
                </span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                JPG, PNG o WEBP
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {comprobanteUrl ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante de pago"
                    className="w-12 h-12 rounded-xl object-cover border border-emerald-200 bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        Foto adjuntada exitosamente
                      </p>
                      {statsCompresion && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-[#175E38] border border-emerald-200">
                          {statsCompresion.final} {statsCompresion.ahorroPct > 0 && `(−${statsCompresion.ahorroPct}%)`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={comprobanteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#175E38] font-bold hover:underline truncate"
                      >
                        Ver foto en tamaño completo ↗
                      </a>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setComprobanteUrl("");
                    setStatsCompresion(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-2 text-rose-600 hover:bg-rose-100/70 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Eliminar foto"
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
                  const file = e.dataTransfer.files?.[0];
                  if (file) procesarYSubirComprobante(file);
                }}
                onClick={() => {
                  if (!isUploading && !isCompressing) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/50"
                    : isUploading || isCompressing
                    ? "cursor-wait bg-slate-50/80 border-slate-300"
                    : "cursor-pointer hover:bg-slate-50 hover:border-[#175E38]/50 border-slate-300/80 bg-slate-50/40"
                }`}
              >
                {isCompressing ? (
                  <div className="py-0.5 flex flex-col items-center gap-1">
                    <Loader2 className="w-5 h-5 animate-spin text-[#175E38]" />
                    <span className="text-xs font-bold text-slate-800">
                      Optimizando foto...
                    </span>
                  </div>
                ) : isUploading ? (
                  <div className="py-0.5 flex flex-col items-center gap-1">
                    <Loader2 className="w-5 h-5 animate-spin text-[#175E38]" />
                    <span className="text-xs font-bold text-slate-800">
                      Subiendo foto a la nube...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">
                        Adjuntar foto o captura del comprobante
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Opcional · Puedes guardar el pago sin imagen si ya tienes el numero de referencia.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Observaciones o Notas
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Pago realizado via transferencia Banesco, verificado en cuenta."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden text-slate-900 resize-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Botones de accion inferiores */}
      <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
        {esPorConfirmar && (
          <button
            type="button"
            onClick={() => setModalRechazoAbierto(true)}
            disabled={isLoading || isSubmitting || isRechazando}
            className="relative w-full sm:w-auto sm:mr-auto px-4 py-2.5 rounded-xl border border-rose-200 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span
              className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white shadow-md border-2 border-white ring-1 ring-rose-700/30 pointer-events-none"
              title="Esta accion envia un correo al Inquilino con el motivo del rechazo"
            >
              <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
            </span>
            <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Rechazar Comprobante</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={isLoading || isSubmitting || isUploading || isCompressing || isRechazando}
          className="w-full sm:w-auto sm:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={
            isLoading ||
            isSubmitting ||
            isUploading ||
            isCompressing ||
            isRechazando ||
            Boolean(pago.anteriorImpago && pago.estado !== EstadoPago.PAGADO)
          }
          className={`relative w-full sm:w-auto sm:min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            pago.anteriorImpago && pago.estado !== EstadoPago.PAGADO
              ? "bg-slate-400 border-b-slate-600 text-white"
              : esPorConfirmar
              ? "bg-blue-600 hover:bg-blue-700 border-b-blue-800 text-white shadow-[0_2px_8px_rgba(37,99,235,0.35)]"
              : "bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] text-white"
          }`}
        >
          <span
            className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-md border-2 border-white ring-1 ring-amber-600/30 pointer-events-none"
            title="Esta accion envia un correo de confirmacion oficial al Inquilino"
          >
            <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
          </span>
          {isLoading || isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : esPorConfirmar ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Pago</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Registrar Pago</span>
            </>
          )}
        </button>
      </div>
    </form>

    {/* Modal Institucional de Confirmacion de Descarte / Rechazo */}
    <Modal
      isOpen={modalRechazoAbierto}
      onClose={() => setModalRechazoAbierto(false)}
      title="Descartar Comprobante de Pago"
      icon={AlertCircle}
      headerVariant="red"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Se eliminara el comprobante adjunto y se enviara una notificacion por correo al inquilino explicandole el motivo para que pueda corregir y volver a reportar su pago.
        </p>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Motivo del Descarte <span className="text-[#CC1A22]">*</span>
          </label>
          <textarea
            rows={3}
            value={motivoRechazoInput}
            onChange={(e) => setMotivoRechazoInput(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#CC1A22]/20 focus:border-[#CC1A22] shadow-2xs resize-none font-medium"
            placeholder="Explica al inquilino la razon (ej: referencia ilegible o no acreditada en banco)..."
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setModalRechazoAbierto(false)}
            disabled={isRechazando}
            className="w-full sm:w-auto sm:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmarRechazo}
            disabled={isRechazando || !motivoRechazoInput.trim()}
            className="relative w-full sm:w-auto sm:min-w-[180px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#CC1A22] hover:bg-[#a81219] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(204,26,34,0.3)] border-b-[3px] border-b-[#7a0d12] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <span
              className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-rose-800 text-white shadow-md border-2 border-white pointer-events-none"
              title="Envia correo al inquilino con el motivo del rechazo"
            >
              <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
            </span>
            {isRechazando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Descartando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Descarte</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  </>
  );
}

export function PagoFormModal({
  isOpen,
  onClose,
  pago,
  onSubmit,
  onRechazado,
  isLoading = false,
}: PagoFormModalProps) {
  if (!pago) return null;

  const esAbono = pago.montoPagado > 0;
  const esPorConfirmar = Boolean(pago.comprobanteUrl && pago.estado !== EstadoPago.PAGADO);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        esPorConfirmar
          ? "Confirmar y Liquidar Pago"
          : esAbono
          ? "Registrar Abono al Canon"
          : "Registrar Pago de Canon"
      }
      subtitle={`${pago.contrato.unidad.codigo} • ${pago.contrato.unidad.propiedad.nombre}`}
      icon={DollarSign}
      headerVariant="green"
      maxWidth="2xl"
    >
      <PagoFormContent
        key={pago.id}
        pago={pago}
        onClose={onClose}
        onSubmit={onSubmit}
        onRechazado={onRechazado}
        isLoading={isLoading}
      />
    </Modal>
  );
}
