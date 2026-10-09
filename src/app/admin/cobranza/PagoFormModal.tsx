"use client";

import React, { useState, useRef } from "react";
import {
  Calendar,
  CreditCard,
  Hash,
  UploadCloud,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  DollarSign,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirDocumentoContrato } from "@/lib/pdf-compressor";
import { toast } from "sonner";
import { MetodoPago } from "@prisma/client";
import type { PagoItem } from "./types";
import type { RegistrarPagoInput } from "@/lib/actions/cobranza";

interface PagoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: PagoItem | null;
  onSubmit: (data: RegistrarPagoInput) => Promise<boolean>;
  isLoading?: boolean;
}

const OPCIONES_METODO_PAGO = [
  { value: MetodoPago.EFECTIVO_USD, label: "Efectivo (USD)" },
  { value: MetodoPago.TRANSFERENCIA, label: "Transferencia Bancaria" },
  { value: MetodoPago.PAGO_MOVIL, label: "Pago Móvil" },
  { value: MetodoPago.ZELLE, label: "Zelle" },
  { value: MetodoPago.OTRO, label: "Otro Método" },
];

// Comprime una imagen usando Canvas API con redimensionamiento y calidad optimizada
const comprimirImagen = (
  file: File
): Promise<{ file: File; pesoOriginal: number; pesoFinal: number; ahorroPct: number }> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 });
      return;
    }

    const MAX_DIM = 1600; // px máximo en el lado más largo
    const QUALITY = 0.75; // 75% calidad JPEG: gran nitidez para texto bancario y peso reducido

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 });
        return;
      }

      // Fondo blanco plano para preservar legibilidad en PNG con transparencia
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 });
            return;
          }

          // Si el archivo original pesa menos que el blob (ej: icono muy pequeño), dejamos el original
          const usarComprimido = blob.size < file.size;
          const nombreBase = file.name.replace(/\.[^.]+$/, "");
          const archivoFinal = usarComprimido
            ? new File([blob], `${nombreBase}.jpg`, { type: "image/jpeg" })
            : file;

          const pesoOriginal = file.size;
          const pesoFinal = archivoFinal.size;
          const ahorroPct = Math.max(0, Math.round((1 - pesoFinal / pesoOriginal) * 100));

          resolve({ file: archivoFinal, pesoOriginal, pesoFinal, ahorroPct });
        },
        "image/jpeg",
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 });
    };
    img.src = url;
  });
};

interface PagoFormContentProps {
  pago: PagoItem;
  onClose: () => void;
  onSubmit: (data: RegistrarPagoInput) => Promise<boolean>;
  isLoading?: boolean;
}

function PagoFormContent({
  pago,
  onClose,
  onSubmit,
  isLoading = false,
}: PagoFormContentProps) {
  const saldoRestante = Math.max(0, Number((pago.montoEsperado - pago.montoPagado).toFixed(2)));
  const montoInicial = saldoRestante > 0 ? saldoRestante.toString() : pago.montoEsperado.toString();
  const hoyStr = new Date().toISOString().split("T")[0];

  const [montoPagado, setMontoPagado] = useState<string>(montoInicial);
  const [fechaPago, setFechaPago] = useState<string>(hoyStr);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO_USD);
  const [referencia, setReferencia] = useState<string>("");
  const [comprobanteUrl, setComprobanteUrl] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const montoNumero = parseFloat(montoPagado) || 0;
  const nuevoTotalAcumulado = Number(((pago.montoPagado || 0) + montoNumero).toFixed(2));
  const nuevoSaldoRestante = Math.max(0, Number((pago.montoEsperado - nuevoTotalAcumulado).toFixed(2)));
  const completaPago = nuevoTotalAcumulado >= pago.montoEsperado;
  const esExcedente = nuevoTotalAcumulado > pago.montoEsperado;

  const procesarYSubirComprobante = async (file: File) => {
    if (!file) return;

    const LIMITE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
    if (file.size > LIMITE_MAX_BYTES) {
      toast.error("El comprobante no debe superar los 8 MB.");
      return;
    }

    setIsCompressing(true);
    setErrorLocal(null);

    const fmt = (b: number) =>
      b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

    let archivoASubir = file;
    let pesoOriginal = file.size;
    let pesoFinal = file.size;
    let ahorroPct = 0;

    try {
      const esPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const esImagen = file.type.startsWith("image/");

      if (esPdf) {
        // Compresión inteligente de documentos PDF (vectorial o escaneado)
        const res = await comprimirDocumentoContrato([file]);
        archivoASubir = res.file;
        pesoOriginal = res.pesoOriginal;
        pesoFinal = res.pesoFinal;
        ahorroPct = res.ahorroPct;
      } else if (esImagen) {
        // Compresión inteligente de imágenes con Canvas API
        const res = await comprimirImagen(file);
        archivoASubir = res.file;
        pesoOriginal = res.pesoOriginal;
        pesoFinal = res.pesoFinal;
        ahorroPct = res.ahorroPct;
      }

      setStatsCompresion({
        original: fmt(pesoOriginal),
        final: fmt(pesoFinal),
        ahorroPct,
      });

      if (ahorroPct >= 5) {
        toast.success(`Comprobante optimizado: ${fmt(pesoOriginal)} → ${fmt(pesoFinal)} (−${ahorroPct}%)`);
      } else {
        toast.info(`Comprobante listo para subir (${fmt(pesoFinal)})`);
      }

      await startUpload([archivoASubir]);
    } catch (err) {
      console.error("Error al procesar/subir comprobante:", err);
      toast.error("No se pudo procesar el comprobante.");
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
    setErrorLocal(null);

    if (montoNumero <= 0) {
      setErrorLocal("El monto del abono debe ser mayor a 0.");
      return;
    }

    if (!fechaPago) {
      setErrorLocal("Por favor indique la fecha en la que se efectuó el pago.");
      return;
    }

    const payload: RegistrarPagoInput = {
      pagoId: pago.id,
      montoPagado: montoNumero,
      fechaPago,
      metodoPago,
      referencia: referencia.trim() || undefined,
      comprobanteUrl: comprobanteUrl.trim() || undefined,
      notas: notas.trim() || undefined,
    };

    const exito = await onSubmit(payload);
    if (exito) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Ficha resumen del cobro con desglose financiero */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
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
              Día de Cobro
            </span>
            <span className="text-xs font-bold text-slate-800">
              Día {pago.contrato.diaCobro} de cada mes
            </span>
          </div>
        </div>

        {/* 3 Cajas de métricas financieras de la mensualidad */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Canon Total
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-900 font-heading block mt-0.5">
              ${pago.montoEsperado.toFixed(2)}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Ya Abonado
            </span>
            <span className="text-xs sm:text-sm font-black text-[#175E38] font-heading block mt-0.5">
              ${pago.montoPagado.toFixed(2)}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Resta
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-700 font-heading block mt-0.5">
              ${saldoRestante.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Botón rápido para abonar exactamente el resto pendiente */}
        {saldoRestante > 0 && pago.montoPagado > 0 && (
          <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/60 text-xs">
            <span className="text-slate-500 font-medium text-[11px]">
              Liquidar el saldo completo restante:
            </span>
            <button
              type="button"
              onClick={() => setMontoPagado(saldoRestante.toFixed(2))}
              className="px-2.5 py-1 text-[11px] font-bold text-[#175E38] bg-emerald-100/70 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            >
              Abonar resto (${saldoRestante.toFixed(2)} USD)
            </button>
          </div>
        )}
      </div>

      {/* Abonos previos registrados en esta mensualidad */}
      {pago.transacciones && pago.transacciones.length > 0 && (
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Abonos Previos Registrados ({pago.transacciones.length})</span>
            <span className="text-[#175E38]">Total Abonado: ${pago.montoPagado.toFixed(2)} USD</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {pago.transacciones.map((t, idx) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-[#175E38] font-bold text-[10px] flex items-center justify-center border border-emerald-200">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800">
                      +${t.monto.toFixed(2)} USD
                    </span>
                    <span className="text-slate-400 text-[11px] ml-1.5">
                      · {new Date(t.fechaPago).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                      {t.referencia && ` · Ref: ${t.referencia}`}
                    </span>
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

      {/* Sección 1: Datos de la Transacción */}
      <div>
        <FormSectionHeader
          step={1}
          title={pago.montoPagado > 0 ? "Detalles del Nuevo Abono" : "Detalles del Pago"}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
          {/* Monto pagado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                value={montoPagado}
                onChange={(e) => setMontoPagado(e.target.value)}
                placeholder="Ej: 50.00"
                className="w-full pl-8 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-semibold text-slate-900"
              />
            </div>

            {/* Proyección contable en tiempo real */}
            {montoNumero > 0 && (
              <div className="mt-2">
                {completaPago ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <CheckCircle className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                    <span>
                      {esExcedente
                        ? `Cubre y excede el total · Acumulará $${nuevoTotalAcumulado.toFixed(2)}`
                        : `¡Completa el total! · Cuota liquidada ($${nuevoTotalAcumulado.toFixed(2)})`}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Abono parcial · Acumulará ${nuevoTotalAcumulado.toFixed(2)} · Restará ${nuevoSaldoRestante.toFixed(2)} por pagar
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha del pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fecha del Pago <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                required
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full pl-10 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Método de Pago <span className="text-rose-500">*</span>
            </label>
            <Select
              value={metodoPago}
              onChange={(val) => setMetodoPago(val as MetodoPago)}
              options={OPCIONES_METODO_PAGO}
              icon={<CreditCard className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Referencia Bancaria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Número de Referencia
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: 984512 o Zelle Fabián"
                className="w-full pl-10 pr-3.5 h-11 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Comprobante y Notas */}
      <div>
        <FormSectionHeader step={2} title="Comprobante y Notas" />
        <div className="space-y-3 mt-3">
          {/* Carga de Comprobante */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Comprobante Digital (Foto o PDF)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {comprobanteUrl ? (
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 text-[#175E38] flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 text-[#175E38]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        Comprobante adjuntado con éxito
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
                        Ver archivo subido a la nube
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
                  title="Eliminar comprobante"
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
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/50"
                    : isUploading || isCompressing
                    ? "cursor-wait bg-slate-50/80 border-slate-300"
                    : "cursor-pointer hover:bg-slate-50 hover:border-[#175E38]/50 border-slate-300"
                }`}
              >
                {isCompressing ? (
                  <div className="py-1 flex flex-col items-center gap-1.5">
                    <Loader2 className="w-6 h-6 animate-spin text-[#175E38]" />
                    <span className="text-xs font-bold text-slate-800">
                      Optimizando y comprimiendo comprobante...
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Reduciendo peso de imagen o PDF antes de enviar
                    </span>
                  </div>
                ) : isUploading ? (
                  <div className="py-1 flex flex-col items-center gap-1.5">
                    <Loader2 className="w-6 h-6 animate-spin text-[#175E38]" />
                    <span className="text-xs font-bold text-slate-800">
                      Subiendo comprobante a la nube...
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Almacenando archivo optimizado en servidor seguro
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                      Haz clic o arrastra para subir comprobante
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG o PDF hasta 8 MB (compresión automática garantizada)
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones o Notas
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Pago realizado vía transferencia Banesco, verificado en cuenta."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden text-slate-900 resize-none font-medium"
            />
          </div>
        </div>
      </div>

      {errorLocal && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorLocal}</span>
        </div>
      )}

      {/* Botones de acción inferiores */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:flex sm:justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading || isUploading || isCompressing}
          className="w-full sm:w-auto px-4 h-11 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || isUploading || isCompressing}
          className="w-full sm:w-auto px-6 h-11 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:brightness-105 text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
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
  );
}

export function PagoFormModal({
  isOpen,
  onClose,
  pago,
  onSubmit,
  isLoading = false,
}: PagoFormModalProps) {
  if (!pago) return null;

  const esAbono = pago.montoPagado > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esAbono ? "Registrar Abono a Mensualidad" : "Registrar Pago de Mensualidad"}
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
        isLoading={isLoading}
      />
    </Modal>
  );
}
