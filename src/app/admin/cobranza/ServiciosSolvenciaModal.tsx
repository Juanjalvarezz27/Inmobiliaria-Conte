"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import {
  Zap,
  Droplets,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Camera,
  Trash2,
  ExternalLink,
  RotateCw,
  Check,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { MESES } from "@/lib/date-utils";
import type { PagoItem } from "./types";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
import { comprimirImagen, formatearBytes, PRESETS_COMPRESION } from "@/lib/file-compressor";
import { actualizarSolvenciaServiciosAction } from "@/lib/actions/cobranza";

interface ServiciosSolvenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: PagoItem | null;
  onActualizado?: (pagoActualizado: PagoItem) => void;
}

export function ServiciosSolvenciaModal({
  isOpen,
  onClose,
  pago,
  onActualizado,
}: ServiciosSolvenciaModalProps) {
  const [luzSolvente, setLuzSolvente] = useState<boolean>(false);
  const [luzNumeroFactura, setLuzNumeroFactura] = useState<string>("");
  const [luzComprobanteUrl, setLuzComprobanteUrl] = useState<string>("");
  const [isCompressingLuz, setIsCompressingLuz] = useState<boolean>(false);
  const [statsLuz, setStatsLuz] = useState<{ original: string; final: string; ahorroPct: number } | null>(null);

  const [aguaSolvente, setAguaSolvente] = useState<boolean>(false);
  const [aguaNumeroFactura, setAguaNumeroFactura] = useState<string>("");
  const [aguaComprobanteUrl, setAguaComprobanteUrl] = useState<string>("");
  const [isCompressingAgua, setIsCompressingAgua] = useState<boolean>(false);
  const [statsAgua, setStatsAgua] = useState<{ original: string; final: string; ahorroPct: number } | null>(null);

  const [serviciosObservaciones, setServiciosObservaciones] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Referencias para disparador táctil dual (Cámara vs Galería)
  const cameraLuzRef = useRef<HTMLInputElement>(null);
  const fileLuzRef = useRef<HTMLInputElement>(null);
  const cameraAguaRef = useRef<HTMLInputElement>(null);
  const fileAguaRef = useRef<HTMLInputElement>(null);

  // Inicializar estados con la información del pago seleccionado
  useEffect(() => {
    if (pago) {
      setLuzSolvente(Boolean(pago.luzSolvente || pago.luzComprobanteUrl || pago.luzNumeroFactura));
      setLuzNumeroFactura(pago.luzNumeroFactura || "");
      setLuzComprobanteUrl(pago.luzComprobanteUrl || "");

      setAguaSolvente(Boolean(pago.aguaSolvente || pago.aguaComprobanteUrl || pago.aguaNumeroFactura));
      setAguaNumeroFactura(pago.aguaNumeroFactura || "");
      setAguaComprobanteUrl(pago.aguaComprobanteUrl || "");

      setServiciosObservaciones(pago.serviciosObservaciones || "");
    }
  }, [pago, isOpen]);

  // Hook UploadThing para recibos de Luz
  const { startUpload: startUploadLuz, isUploading: isUploadingLuz } =
    useOperacionesUploadThing("comprobantePago", {
      onClientUploadComplete: (res) => {
        if (res && res[0]) {
          setLuzComprobanteUrl(res[0].ufsUrl || res[0].url);
          setLuzSolvente(true);
          toast.success("Recibo de Corpoelec cargado exitosamente.");
        }
      },
      onUploadError: (err) => {
        toast.error(`Error al subir recibo de luz: ${err.message}`);
      },
    });

  // Hook UploadThing para recibos de Agua
  const { startUpload: startUploadAgua, isUploading: isUploadingAgua } =
    useOperacionesUploadThing("comprobantePago", {
      onClientUploadComplete: (res) => {
        if (res && res[0]) {
          setAguaComprobanteUrl(res[0].ufsUrl || res[0].url);
          setAguaSolvente(true);
          toast.success("Recibo de agua cargado exitosamente.");
        }
      },
      onUploadError: (err) => {
        toast.error(`Error al subir recibo de agua: ${err.message}`);
      },
    });

  if (!pago) return null;

  const mesNombre = MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
  const localCodigo = pago.contrato.unidad.codigo;
  const propiedadNombre = pago.contrato.unidad.propiedad.nombre;
  const inquilinoNombre = `${pago.contrato.inquilino.nombre} ${pago.contrato.inquilino.apellido || ""}`.trim();

  const handleProcesarRecibo = async (tipo: "luz" | "agua", file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten fotos o capturas (JPG, PNG o WEBP). No se admiten archivos PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La foto supera el límite máximo de 10 MB antes de optimizar.");
      return;
    }

    if (tipo === "luz") {
      setIsCompressingLuz(true);
      try {
        // Preset optimizado para recibos impresos de electricidad
        const res = await comprimirImagen(file, PRESETS_COMPRESION.recibosServicios);
        setStatsLuz({
          original: formatearBytes(res.pesoOriginal),
          final: formatearBytes(res.pesoFinal),
          ahorroPct: res.ahorroPct,
        });
        await startUploadLuz([res.file]);
      } catch (err) {
        console.error("Error al comprimir foto de Corpoelec:", err);
        toast.error("Error al procesar la compresión. Intentando subir original...");
        await startUploadLuz([file]);
      } finally {
        setIsCompressingLuz(false);
      }
    } else {
      setIsCompressingAgua(true);
      try {
        // Preset optimizado para facturas/recibos de agua potable
        const res = await comprimirImagen(file, PRESETS_COMPRESION.recibosServicios);
        setStatsAgua({
          original: formatearBytes(res.pesoOriginal),
          final: formatearBytes(res.pesoFinal),
          ahorroPct: res.ahorroPct,
        });
        await startUploadAgua([res.file]);
      } catch (err) {
        console.error("Error al comprimir foto de Agua:", err);
        toast.error("Error al procesar la compresión. Intentando subir original...");
        await startUploadAgua([file]);
      } finally {
        setIsCompressingAgua(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await actualizarSolvenciaServiciosAction({
        pagoId: pago.id,
        luzSolvente,
        luzNumeroFactura,
        luzComprobanteUrl,
        aguaSolvente,
        aguaNumeroFactura,
        aguaComprobanteUrl,
        serviciosObservaciones,
      });

      if (res.success && res.data) {
        toast.success(res.message || "Solvencia de servicios actualizada");
        onActualizado?.(res.data);
        onClose();
      } else {
        toast.error(res.error || "No se pudo guardar la solvencia");
      }
    } catch {
      toast.error("Error al procesar la actualización de solvencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solvencia de Servicios Públicos"
      subtitle={`${propiedadNombre} · ${localCodigo} · ${mesNombre} ${pago.periodoAno}`}
      icon={Zap}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Resumen del Local y Arrendatario */}
        <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Arrendatario Responsable
            </span>
            <p className="font-black text-slate-900 font-heading truncate">
              {inquilinoNombre}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Espacio / Local
            </span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              {localCodigo}
            </span>
          </div>
        </div>

        {/* Bloques de Servicios en Cuadrícula 2 Columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* SECCIÓN 1: Electricidad (Corpoelec) */}
          <div
            className={`rounded-xl border p-3.5 space-y-3 transition-all ${
              luzSolvente
                ? "bg-emerald-50/50 border-emerald-200/70"
                : "bg-slate-50/50 border-slate-200/70"
            }`}
          >
            {/* Cabecera del Servicio */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    luzSolvente
                      ? "bg-[#175E38] text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading leading-tight">
                    Corpoelec
                  </h4>
                  <span className="text-[10px] text-slate-500 block">Electricidad</span>
                </div>
              </div>

              {/* Botón Switch de Solvencia */}
              <button
                type="button"
                onClick={() => setLuzSolvente(!luzSolvente)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  luzSolvente
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                }`}
              >
                {luzSolvente ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Solvente</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Pendiente</span>
                  </>
                )}
              </button>
            </div>

            {/* Input Nº de Cuenta Contrato / Referencia */}
            <div className="space-y-1">
              <label
                htmlFor="luzFacturaInput"
                className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5"
              >
                Cuenta Contrato / Referencia
              </label>
              <input
                id="luzFacturaInput"
                type="text"
                value={luzNumeroFactura}
                onChange={(e) => {
                  const val = e.target.value;
                  setLuzNumeroFactura(val);
                  if (val.trim()) setLuzSolvente(true);
                }}
                placeholder="Ej: 100002345678"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
              />
            </div>

            {/* Comprobante / Recibo Adjunto */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">
                  Foto del Recibo (Luz)
                </span>
              </div>

              {/* Inputs ocultos diferenciados para Cámara directa y Galería */}
              <input
                ref={cameraLuzRef}
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isUploadingLuz || isCompressingLuz}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcesarRecibo("luz", f);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <input
                ref={fileLuzRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingLuz || isCompressingLuz}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcesarRecibo("luz", f);
                  e.target.value = "";
                }}
                className="hidden"
              />

              {luzComprobanteUrl ? (
                <div className="flex items-center justify-between bg-white border border-emerald-200/90 rounded-xl p-2.5 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={luzComprobanteUrl}
                      alt="Recibo Corpoelec"
                      className="w-11 h-11 rounded-lg object-cover border border-emerald-200 bg-white shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          Foto adjuntada
                        </span>
                        {statsLuz && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#175E38] border border-emerald-200">
                            {statsLuz.final} {statsLuz.ahorroPct > 0 && `(−${statsLuz.ahorroPct}%)`}
                          </span>
                        )}
                      </div>
                      <a
                        href={luzComprobanteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#175E38] font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>Ver foto completa</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLuzComprobanteUrl("");
                      setStatsLuz(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : isCompressingLuz ? (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                  <RotateCw className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Optimizando foto a WebP...</span>
                </div>
              ) : isUploadingLuz ? (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-bold text-[#175E38]">
                  <RotateCw className="w-4 h-4 animate-spin text-[#175E38]" />
                  <span>Subiendo foto...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => cameraLuzRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#175E38] text-white hover:bg-[#124b2d] text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileLuzRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                    <span>Galería</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: Agua Potable (Hidroandes / Hidrosuroeste) */}
          <div
            className={`rounded-xl border p-3.5 space-y-3 transition-all ${
              aguaSolvente
                ? "bg-blue-50/50 border-blue-200/70"
                : "bg-slate-50/50 border-slate-200/70"
            }`}
          >
            {/* Cabecera del Servicio */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    aguaSolvente
                      ? "bg-blue-600 text-white"
                      : "bg-slate-400 text-white"
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading leading-tight">
                    Agua Potable
                  </h4>
                  <span className="text-[10px] text-slate-500 block">Hidroandes</span>
                </div>
              </div>

              {/* Botón Switch de Solvencia */}
              <button
                type="button"
                onClick={() => setAguaSolvente(!aguaSolvente)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  aguaSolvente
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-100 text-blue-900 hover:bg-blue-200"
                }`}
              >
                {aguaSolvente ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Solvente</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                    <span>Pendiente</span>
                  </>
                )}
              </button>
            </div>

            {/* Input Nº de Cuenta Contrato / Factura */}
            <div className="space-y-1">
              <label
                htmlFor="aguaFacturaInput"
                className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5"
              >
                Nº Factura / Contrato
              </label>
              <input
                id="aguaFacturaInput"
                type="text"
                value={aguaNumeroFactura}
                onChange={(e) => {
                  const val = e.target.value;
                  setAguaNumeroFactura(val);
                  if (val.trim()) setAguaSolvente(true);
                }}
                placeholder="Ej: H-987654"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* Comprobante / Recibo Adjunto */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5">
                  Foto del Recibo (Agua)
                </span>
              </div>

              {/* Inputs ocultos diferenciados para Cámara directa y Galería */}
              <input
                ref={cameraAguaRef}
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isUploadingAgua || isCompressingAgua}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcesarRecibo("agua", f);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <input
                ref={fileAguaRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingAgua || isCompressingAgua}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcesarRecibo("agua", f);
                  e.target.value = "";
                }}
                className="hidden"
              />

              {aguaComprobanteUrl ? (
                <div className="flex items-center justify-between bg-white border border-blue-200/90 rounded-xl p-2.5 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={aguaComprobanteUrl}
                      alt="Recibo Agua"
                      className="w-11 h-11 rounded-lg object-cover border border-blue-200 bg-white shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          Foto adjuntada
                        </span>
                        {statsAgua && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            {statsAgua.final} {statsAgua.ahorroPct > 0 && `(−${statsAgua.ahorroPct}%)`}
                          </span>
                        )}
                      </div>
                      <a
                        href={aguaComprobanteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-700 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>Ver foto completa</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAguaComprobanteUrl("");
                      setStatsAgua(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : isCompressingAgua ? (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-sky-50/70 border border-sky-200 rounded-xl text-xs font-bold text-sky-700">
                  <RotateCw className="w-4 h-4 animate-spin text-sky-600" />
                  <span>Optimizando foto a WebP...</span>
                </div>
              ) : isUploadingAgua ? (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-bold text-blue-600">
                  <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Subiendo foto...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => cameraAguaRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileAguaRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Galería</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Observaciones Opcionales */}
        <div className="space-y-1">
          <label
            htmlFor="observacionesServiciosInput"
            className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block mb-1.5"
          >
            Observaciones o Notas de Servicios (Opcional)
          </label>
          <textarea
            id="observacionesServiciosInput"
            value={serviciosObservaciones}
            onChange={(e) => setServiciosObservaciones(e.target.value)}
            rows={2}
            placeholder="Ej: Inquilino canceló Corpoelec por taquilla. Pendiente factura de agua para la semana entrante."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all resize-none"
          />
        </div>

        {/* Botones de Acción */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingLuz || isUploadingAgua}
            className="w-full sm:w-auto sm:min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] hover:from-[#145231] hover:to-[#0f3d25] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Guardar Solvencia</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

