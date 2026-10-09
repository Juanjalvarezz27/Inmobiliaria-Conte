"use client";

import React, { useState, useRef } from "react";
import {
  Calendar,
  CreditCard,
  Hash,
  UploadCloud,
  AlertTriangle,
  Loader2,
  Trash2,
  DollarSign,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirDocumentoContrato } from "@/lib/pdf-compressor";
import { toast } from "sonner";
import { MetodoPago } from "@prisma/client";
import { formatCurrency } from "../propiedades/constants";
import {
  registrarCobroDeposito,
  eliminarDocumentoContratoAction,
} from "@/lib/actions/contratos";
import type { ContratoConRelaciones } from "./types";

interface CobrarDepositoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: ContratoConRelaciones | null;
  onSuccess: (contratoActualizado: ContratoConRelaciones) => void;
}

const OPCIONES_METODO_PAGO = [
  { value: MetodoPago.TRANSFERENCIA, label: "Transferencia Bancaria" },
  { value: MetodoPago.EFECTIVO_USD, label: "Efectivo (USD)" },
  { value: MetodoPago.PAGO_MOVIL, label: "Pago Móvil" },
  { value: MetodoPago.ZELLE, label: "Zelle" },
  { value: MetodoPago.OTRO, label: "Otro Método" },
];

// Comprime una imagen usando Canvas API manteniendo nitidez para recibos
const comprimirImagen = (
  file: File
): Promise<{ file: File; pesoOriginal: number; pesoFinal: number; ahorroPct: number }> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 });
      return;
    }

    const MAX_DIM = 1600;
    const QUALITY = 0.75;

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

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, pesoOriginal: file.size, pesoFinal: file.size, ahorroPct: 0 });
            return;
          }

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

export function CobrarDepositoModal({
  isOpen,
  onClose,
  contrato,
  onSuccess,
}: CobrarDepositoModalProps) {
  const hoyStr = new Date().toISOString().split("T")[0];

  const [fechaCobro, setFechaCobro] = useState<string>(hoyStr);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.TRANSFERENCIA);
  const [referencia, setReferencia] = useState<string>("");
  const [comprobanteUrl, setComprobanteUrl] = useState<string>("");
  const [notas, setNotas] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statsCompresion, setStatsCompresion] = useState<{
    original: string;
    final: string;
    ahorroPct: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useOperacionesUploadThing("comprobantePago", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        const url = res[0].ufsUrl || res[0].url;
        setComprobanteUrl(url);
        setUploadError(null);
        toast.success("Comprobante cargado exitosamente.");
      }
    },
    onUploadError: (error) => {
      const msg = `Error al subir archivo: ${error.message}`;
      setUploadError(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  if (!contrato) return null;

  const montoDeposito = contrato.depositoGarantia || 0;

  const handleProcesarArchivo = async (file: File) => {
    setUploadError(null);
    setStatsCompresion(null);

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      const err = "Solo se admiten documentos en formato PDF o imágenes (JPG, PNG, WEBP).";
      setUploadError(err);
      toast.error(err);
      return;
    }

    let fileListo = file;
    let ahorroCalculado = 0;
    const pesoOriginalBytes = file.size;

    try {
      setIsCompressing(true);
      if (isPdf) {
        const res = await comprimirDocumentoContrato([file]);
        fileListo = res.file;
        ahorroCalculado = res.ahorroPct;
      } else {
        const res = await comprimirImagen(file);
        fileListo = res.file;
        ahorroCalculado = res.ahorroPct;
      }

      setStatsCompresion({
        original: (pesoOriginalBytes / 1024).toFixed(0) + " KB",
        final: (fileListo.size / 1024).toFixed(0) + " KB",
        ahorroPct: ahorroCalculado,
      });

      await startUpload([fileListo]);
    } catch (err) {
      console.error("Error al procesar archivo:", err);
      toast.error("No se pudo procesar el archivo. Subiendo sin compresión...");
      await startUpload([file]);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleEliminarComprobante = () => {
    const urlAEliminar = comprobanteUrl;
    setComprobanteUrl("");
    setStatsCompresion(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (urlAEliminar) {
      eliminarDocumentoContratoAction(urlAEliminar).catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fechaCobro) {
      toast.error("Debes seleccionar la fecha de cobro.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await registrarCobroDeposito({
        contratoId: contrato.id,
        fechaCobro,
        metodoPago,
        referencia: referencia.trim() || undefined,
        comprobanteUrl: comprobanteUrl || undefined,
        notas: notas.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success("Cobro de depósito registrado exitosamente.");
        onSuccess(res.data as unknown as ContratoConRelaciones);
        onClose();
      } else {
        toast.error(res.error || "No se pudo registrar el cobro.");
      }
    } catch (err) {
      console.error("Error al registrar cobro de depósito:", err);
      toast.error("Ocurrió un error inesperado al registrar el cobro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cobro de Depósito en Garantía"
      subtitle={`${contrato.codigo} · Espacio ${contrato.unidad.codigo}`}
      icon={ShieldCheck}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Informativo con Monto Fijo */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border border-emerald-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#175E38] text-white flex items-center justify-center shrink-0 shadow-xs">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Monto en Custodia Estipulado
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                {formatCurrency(montoDeposito)}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-slate-500 block">Inquilino</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800">
              {contrato.inquilino.nombre} {contrato.inquilino.apellido ?? ""}
            </span>
          </div>
        </div>

        {/* Paso 1: Transacción y Fecha */}
        <div className="space-y-3">
          <FormSectionHeader step={1} title="Detalles del Pago y Método" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Fecha de Cobro */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha de Cobro <span className="text-[#CC1A22]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={fechaCobro}
                  onChange={(e) => setFechaCobro(e.target.value)}
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Método de Pago <span className="text-[#CC1A22]">*</span>
              </label>
              <Select
                value={metodoPago}
                onChange={(val) => setMetodoPago(val as MetodoPago)}
                options={OPCIONES_METODO_PAGO}
                icon={<CreditCard className="w-4 h-4" />}
                placeholder="Seleccionar método..."
              />
            </div>

            {/* Referencia Bancaria */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nro. de Referencia Bancaria (Opcional)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: REF-984321 / Transferencia Banesco"
                  className="w-full pl-9 pr-3 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Paso 2: Comprobante Digital y Notas */}
        <div className="space-y-3">
          <FormSectionHeader step={2} title="Comprobante Digital y Notas" />

          {/* Zona de Carga de Comprobante con Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Comprobante de Pago (JPG, PNG o PDF)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcesarArchivo(e.target.files[0]);
                }
              }}
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {comprobanteUrl ? (
              <div className="p-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-9 h-9 rounded-xl bg-[#175E38]/10 text-[#175E38] border border-emerald-200 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Comprobante adjuntado con éxito
                    </p>
                    {statsCompresion && (
                      <p className="text-[10px] text-emerald-800 font-semibold">
                        Optimizado: {statsCompresion.final} ({statsCompresion.ahorroPct}% menos)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#175E38] hover:underline px-2 py-1 rounded-lg hover:bg-white"
                  >
                    Ver archivo
                  </a>
                  <button
                    type="button"
                    onClick={handleEliminarComprobante}
                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 flex items-center justify-center transition-all cursor-pointer"
                    title="Eliminar comprobante"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcesarArchivo(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  if (!isUploading && !isCompressing && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-[#175E38] bg-emerald-50/50"
                    : "border-slate-300 bg-slate-50/70 hover:bg-slate-100/80"
                }`}
              >
                {isCompressing || isUploading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#175E38]" />
                    <span className="text-xs font-semibold text-slate-600">
                      {isCompressing ? "Comprimiendo y optimizando archivo..." : "Subiendo a la nube..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">
                      Haz clic para subir o arrastra el comprobante aquí
                    </p>
                    <p className="text-[10px] text-slate-400">PDF, JPG o PNG (optimización automática)</p>
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </p>
            )}
          </div>

          {/* Notas Adicionales */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Notas u Observaciones del Depósito (Opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Depósito recibido completo en cuenta jurídica Banesco..."
              className="w-full p-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all resize-none"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="w-full sm:w-auto min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isUploading || isCompressing}
            className="w-full sm:w-auto min-w-[180px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:bg-[#124b2d] transition-all border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar Cobro</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
