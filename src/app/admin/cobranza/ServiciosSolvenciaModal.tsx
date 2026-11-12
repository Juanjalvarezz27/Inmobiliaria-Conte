"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import {
  Zap,
  Droplets,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { MESES } from "@/lib/date-utils";
import type { PagoItem } from "./types";
import { useOperacionesUploadThing } from "@/lib/uploadthing";
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

  const [aguaSolvente, setAguaSolvente] = useState<boolean>(false);
  const [aguaNumeroFactura, setAguaNumeroFactura] = useState<string>("");
  const [aguaComprobanteUrl, setAguaComprobanteUrl] = useState<string>("");

  const [serviciosObservaciones, setServiciosObservaciones] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar estados con la información del pago seleccionado
  useEffect(() => {
    if (pago) {
      setLuzSolvente(Boolean(pago.luzSolvente));
      setLuzNumeroFactura(pago.luzNumeroFactura || "");
      setLuzComprobanteUrl(pago.luzComprobanteUrl || "");

      setAguaSolvente(Boolean(pago.aguaSolvente));
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

  const handleSubirArchivo = (tipo: "luz" | "agua", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 4MB");
      return;
    }

    if (tipo === "luz") {
      startUploadLuz([file]);
    } else {
      startUploadAgua([file]);
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
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
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
            className={`rounded-2xl border p-3.5 space-y-3 transition-all ${
              luzSolvente
                ? "bg-emerald-50/40 border-emerald-300 shadow-2xs"
                : "bg-slate-50/70 border-slate-200/90"
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
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                  luzSolvente
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                }`}
              >
                {luzSolvente ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Solvente</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Pendiente</span>
                  </>
                )}
              </button>
            </div>

            {/* Input Nº de Cuenta Contrato / Referencia */}
            <div className="space-y-1">
              <label
                htmlFor="luzFacturaInput"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
              >
                Cuenta Contrato / Referencia
              </label>
              <input
                id="luzFacturaInput"
                type="text"
                value={luzNumeroFactura}
                onChange={(e) => setLuzNumeroFactura(e.target.value)}
                placeholder="Ej: 100002345678"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
              />
            </div>

            {/* Comprobante / Recibo Adjunto */}
            <div className="space-y-1 pt-1 border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Comprobante / Recibo (PDF o Foto)
              </span>
              {luzComprobanteUrl ? (
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <a
                    href={luzComprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-emerald-800 font-bold hover:underline truncate"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate text-[11px]">Ver Comprobante</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setLuzComprobanteUrl("")}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar comprobante"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer transition-colors active:scale-98">
                  {isUploadingLuz ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-[#175E38]" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Adjuntar Recibo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={isUploadingLuz}
                    onChange={(e) => handleSubirArchivo("luz", e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: Agua Potable (Hidroandes / Hidrosuroeste) */}
          <div
            className={`rounded-2xl border p-3.5 space-y-3 transition-all ${
              aguaSolvente
                ? "bg-blue-50/40 border-blue-300 shadow-2xs"
                : "bg-slate-50/70 border-slate-200/90"
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
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                  aguaSolvente
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                }`}
              >
                {aguaSolvente ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Solvente</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Pendiente</span>
                  </>
                )}
              </button>
            </div>

            {/* Input Nº de Cuenta Contrato / Factura */}
            <div className="space-y-1">
              <label
                htmlFor="aguaFacturaInput"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
              >
                Nº Factura / Contrato
              </label>
              <input
                id="aguaFacturaInput"
                type="text"
                value={aguaNumeroFactura}
                onChange={(e) => setAguaNumeroFactura(e.target.value)}
                placeholder="Ej: H-987654"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* Comprobante / Recibo Adjunto */}
            <div className="space-y-1 pt-1 border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Comprobante / Recibo (PDF o Foto)
              </span>
              {aguaComprobanteUrl ? (
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <a
                    href={aguaComprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-blue-800 font-bold hover:underline truncate"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate text-[11px]">Ver Comprobante</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setAguaComprobanteUrl("")}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar comprobante"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer transition-colors active:scale-98">
                  {isUploadingAgua ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Adjuntar Recibo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={isUploadingAgua}
                    onChange={(e) => handleSubirArchivo("agua", e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Observaciones Opcionales */}
        <div className="space-y-1">
          <label
            htmlFor="observacionesServiciosInput"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
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
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingLuz || isUploadingAgua}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#175E38] hover:bg-[#124b2d] text-white transition-all shadow-[0_2px_8px_rgba(23,94,56,0.3)] cursor-pointer border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 disabled:opacity-50"
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
