"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Receipt,
  CheckCircle2,
  ZoomIn,
  Eye,
  Download,
  ExternalLink,
  ArrowLeft,
  Loader2,
  User,
  Building2,
  Calendar,
  CreditCard,
  Share2,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { Modal, ImageViewerModal } from "@/components/ui";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { toast } from "sonner";
import { MetodoPago } from "@prisma/client";
import type { PagoItem } from "./types";
import { construirReciboPdf } from "./generarReciboPdf";

interface ReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: PagoItem | null;
}

const METODO_LABELS: Record<MetodoPago, string> = {
  EFECTIVO_USD: "Efectivo (USD)",
  TRANSFERENCIA: "Transferencia Bancaria",
  PAGO_MOVIL: "Pago Móvil",
  ZELLE: "Zelle",
  OTRO: "Otro Método",
};

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function ReciboModal({ isOpen, onClose, pago }: ReciboModalProps) {
  const [visorImagenAbierto, setVisorImagenAbierto] = useState(false);
  const [modoPdf, setModoPdf] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Limpiar memoria y restablecer modo al cerrar o cambiar comprobante
  useEffect(() => {
    if (!isOpen) {
      setModoPdf(false);
      setModalCompartirAbierto(false);
      setCopiado(false);
      setCompartiendo(false);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPdfBlob(null);
    }
  }, [isOpen, pago?.id]);

  // Liberar URL de memoria al desmontar el componente
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!pago) return null;

  const contrato = pago.contrato;
  const inquilino = contrato.inquilino;
  const unidad = contrato.unidad;
  const propiedad = unidad.propiedad;

  const nombreMes = NOMBRES_MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
  const periodoTexto = `${nombreMes} ${pago.periodoAno}`;

  const fechaEmisionStr = pago.fechaPago
    ? new Date(pago.fechaPago).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const fechaVenceStr = pago.fechaVencimiento
    ? new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "N/A";

  const inquilinoNombreCompleto = (
    inquilino.apellido
      ? `${inquilino.nombre} ${inquilino.apellido}`
      : inquilino.nombre
  ).toUpperCase();

  // Nombre del documento sanitizado para descargas y envíos: Nombre del Cliente - Nombre de la Propiedad
  const nombreLimpioCliente = (
    inquilino.apellido
      ? `${inquilino.nombre} ${inquilino.apellido}`
      : inquilino.nombre
  )
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim();

  const nombreLimpiaPropiedad = propiedad.nombre
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim();

  const nombreArchivoPdf = `${nombreLimpioCliente} - ${nombreLimpiaPropiedad}`;

  const documentoInquilino = inquilino.documentoIdentidad || "No registrado";
  const numeroReciboPreliminar = `REC-${pago.periodoAno}${String(pago.periodoMes).padStart(2, "0")}-${contrato.codigo}`;
  const saldoRestante = Math.max(0, pago.montoEsperado - pago.montoPagado);
  const esSolvente = pago.montoPagado >= pago.montoEsperado;

  // Obtiene o genera el Blob del PDF en memoria
  const asegurarPdfBlob = async (): Promise<Blob> => {
    if (pdfBlob) return pdfBlob;
    const blob = await construirReciboPdf(pago);
    setPdfBlob(blob);
    if (!pdfUrl) {
      setPdfUrl(URL.createObjectURL(blob));
    }
    return blob;
  };

  const handlePrevisualizarPdf = async () => {
    try {
      setGenerandoPdf(true);
      let urlActual = pdfUrl;
      if (!urlActual) {
        const blob = await asegurarPdfBlob();
        urlActual = URL.createObjectURL(blob);
        setPdfUrl(urlActual);
      }
      setModoPdf(true);
    } catch (err) {
      console.error("Error al construir PDF:", err);
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleDescargarPdf = async () => {
    try {
      let urlActual = pdfUrl;
      if (!urlActual) {
        const blob = await asegurarPdfBlob();
        urlActual = URL.createObjectURL(blob);
        setPdfUrl(urlActual);
      }
      const enlace = document.createElement("a");
      enlace.href = urlActual;
      enlace.download = `${nombreArchivoPdf}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    }
  };

  const handleAbrirPestana = async () => {
    try {
      let urlActual = pdfUrl;
      if (!urlActual) {
        const blob = await asegurarPdfBlob();
        urlActual = URL.createObjectURL(blob);
        setPdfUrl(urlActual);
      }
      window.open(urlActual, "_blank");
    } catch (err) {
      console.error("Error al abrir pestaña:", err);
    }
  };

  // Mensaje y enlaces de compartición
  const telLimpio = inquilino.telefono ? inquilino.telefono.replace(/[^0-9]/g, "") : "";
  const mensajeCompartir = `Estimado(a) ${inquilino.nombre}, le saludamos de Inmobiliaria Conté C.A.\n\nLe compartimos su Nota de Entrega oficial (${numeroReciboPreliminar}) por un monto de $${pago.montoPagado.toFixed(2)} USD correspondiente al período ${periodoTexto} del espacio ${unidad.codigo} (${propiedad.nombre}).\n\nMétodo: ${pago.metodoPago ? METODO_LABELS[pago.metodoPago] : "Efectivo"}${pago.referencia ? ` (Ref: #${pago.referencia})` : ""}.\nEstado: ${esSolvente ? "SOLVENTE" : "ABONO PARCIAL"}.\n\n¡Muchas gracias por su puntualidad!`;

  const urlWhatsapp = telLimpio
    ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeCompartir)}`
    : `https://wa.me/?text=${encodeURIComponent(mensajeCompartir)}`;

  const urlCorreo = `mailto:${inquilino.email || ""}?subject=${encodeURIComponent(
    `Nota de Entrega Oficial ${numeroReciboPreliminar} - Inmobiliaria Conté C.A.`
  )}&body=${encodeURIComponent(mensajeCompartir)}`;

  const handleCompartir = async () => {
    try {
      setCompartiendo(true);
      const blob = await asegurarPdfBlob();
      const archivo = new File([blob], `${nombreArchivoPdf}.pdf`, {
        type: "application/pdf",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [archivo] })
      ) {
        await navigator.share({
          title: nombreArchivoPdf,
          text: `Comprobante de cobranza oficial (${numeroReciboPreliminar}) - Inmobiliaria Conté C.A.`,
          files: [archivo],
        });
        return;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
    } finally {
      setCompartiendo(false);
    }

    // Si Web Share API no está disponible para archivos (ej. en desktop), abrir modal de opciones
    setModalCompartirAbierto(true);
  };

  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensajeCompartir);
      setCopiado(true);
      toast.success("Detalles del comprobante copiados al portapapeles");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar el texto");
    }
  };

  return (
    <>
      {/* Regla CSS para impresión perfecta en tamaño carta / voucher */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #nota-de-entrega-imprimible,
          #nota-de-entrega-imprimible * {
            visibility: visible !important;
          }
          #nota-de-entrega-imprimible {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Nota de Entrega Oficial"
        subtitle={`Comprobante • #${numeroReciboPreliminar}`}
        icon={Receipt}
        headerVariant="green"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {modoPdf && pdfUrl ? (
            /* Vista de Previsualización del PDF Generado */
            <div className="space-y-3">
              {/* Barra superior de herramientas del PDF */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2">
                {/* Botón Volver */}
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => setModoPdf(false)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                    <span>Volver a la Nota</span>
                  </button>

                  <span className="sm:hidden text-[11px] font-mono font-bold text-slate-500">
                    PDF Oficial
                  </span>
                </div>

                {/* Acciones principales: Grid 2 columnas en mobile | Flex a la derecha en Desktop */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 pt-1 sm:pt-0 border-t border-slate-200/60 sm:border-t-0">
                  <button
                    type="button"
                    onClick={handleCompartir}
                    disabled={compartiendo}
                    className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    title="Compartir documento por WhatsApp, Correo u otras aplicaciones"
                  >
                    {compartiendo ? (
                      <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>Compartir</span>
                  </button>

                  {/* En Desktop: Botón Ver PDF */}
                  <a
                    href={pdfUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-2xs transition-all items-center gap-1.5 cursor-pointer"
                    title="Ver PDF en pantalla completa en una nueva pestaña"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver PDF</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDescargarPdf}
                    className="w-full sm:w-auto px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
                    title="Descargar archivo PDF oficial"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>

              {/* Visor de Documento: Iframe en Desktop (>= sm) | Tarjeta Ejecutiva en Mobile (< sm) */}
              <div className="hidden sm:block w-full h-[600px] rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner">
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-none"
                  title={nombreArchivoPdf}
                />
              </div>

              {/* Vista Mobile (< sm): Tarjeta Nativa de Documento PDF */}
              <div className="sm:hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 border border-slate-200/90 rounded-2xl p-5 text-center space-y-4 shadow-2xs">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 mx-auto flex items-center justify-center shadow-2xs">
                  <Receipt className="w-8 h-8 text-[#175E38]" />
                </div>

                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                    Documento Listo
                  </span>
                  <h4 className="text-sm font-black text-slate-900 font-heading pt-1">
                    Nota de Entrega Generada
                  </h4>
                  <p className="text-xs font-mono font-bold text-slate-700 truncate px-2">
                    {nombreArchivoPdf}.pdf
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Comprobante Oficial #{numeroReciboPreliminar}
                  </p>
                </div>

                <div className="pt-1">
                  <a
                    href={pdfUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span>Ver PDF en Pantalla Completa</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Vista del Documento Oficial Nota de Entrega */
            <>
              <div
                id="nota-de-entrega-imprimible"
                className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-slate-200/90 shadow-xs font-sans text-slate-800 text-xs sm:text-sm select-text space-y-3 sm:space-y-4"
              >
                {/* Cabecera Membretada Oficial */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200/90">
                  {/* Logotipo y Datos de la Empresa */}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 sm:w-18 sm:h-18 shrink-0 bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-1 shadow-2xs flex items-center justify-center overflow-hidden">
                      <Image
                        src="/Logo.png"
                        alt="Inmobiliaria Conté C.A."
                        width={68}
                        height={68}
                        unoptimized
                        className="object-contain w-full h-full"
                        priority
                      />
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <h3 className="font-black text-slate-900 tracking-tight text-xs sm:text-base uppercase font-heading truncate sm:overflow-visible">
                        INMOBILIARIA CONTÉ C.A.
                      </h3>
                      <div className="text-[11px] sm:text-xs text-slate-600 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-slate-800 whitespace-nowrap">RIF: J-30510225-2</span>
                        <span className="text-slate-300">·</span>
                        <span className="whitespace-nowrap">Telf: 0272-236.62.16</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight sm:leading-normal max-w-md">
                        <span className="sm:hidden">Trujillo, Edo. Trujillo</span>
                        <span className="hidden sm:inline">Av. 19 de Abril, Edif. San Marcos, Piso 1, Apt. 1, Sector El Matacho. Trujillo, Edo. Trujillo.</span>
                      </p>
                    </div>
                  </div>

                  {/* Título de Documento y Número de Control */}
                  <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 space-y-1 sm:space-y-1.5 sm:text-right sm:shrink-0">
                    {/* Fila en móvil: Título a la izquierda, Badge a la derecha | En Desktop: Título arriba */}
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="font-heading text-xs sm:text-lg font-black text-slate-900 tracking-wider">
                        NOTA DE ENTREGA
                      </span>
                      <span
                        className={`sm:hidden inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                          esSolvente
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                            : "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{esSolvente ? "SOLVENTE" : "ABONO"}</span>
                      </span>
                    </div>

                    {/* Número de comprobante */}
                    <div className="flex sm:justify-end">
                      <span className="inline-block font-mono text-[10px] sm:text-sm font-bold text-slate-700 bg-slate-100 px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg border border-slate-200/70 whitespace-nowrap">
                        # {numeroReciboPreliminar}
                      </span>
                    </div>

                    {/* Badge en Desktop (>= sm) */}
                    <div className="hidden sm:block">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                          esSolvente
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                            : "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{esSolvente ? "CONTADO · SOLVENTE" : "ABONO PARCIAL"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Paneles de Datos Estructurados (Arrendatario & Fechas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  {/* Panel Arrendatario */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-2.5">
                    <div className="flex items-center gap-2 text-slate-500 pb-1.5 border-b border-slate-200/60">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#175E38]" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Información del Cliente</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo</span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 font-heading uppercase block truncate mt-0.5">
                        {inquilinoNombreCompleto}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">C.I. / RIF</span>
                        <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate">{documentoInquilino}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono truncate block mt-0.5">{inquilino.telefono || "No registrado"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel Espacio y Plazos */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-2.5">
                    <div className="flex items-center gap-2 text-slate-500 pb-1.5 border-b border-slate-200/60">
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1C2539]" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Inmueble y Fechas</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ubicación / Propiedad</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 font-heading uppercase block truncate mt-0.5">
                        {propiedad.nombre}, {propiedad.ciudad || "Trujillo"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emisión</span>
                        <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate">{fechaEmisionStr}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vencimiento</span>
                        <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate">{fechaVenceStr}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desglose de Concepto Arrendatario: Mobile Card (< sm) */}
                <div className="sm:hidden bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#1C2539] text-white font-mono">
                        {unidad.codigo}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 truncate">
                        Canon de Alquiler
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/70">
                      Cant: 1
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-snug">
                    Alquiler del Espacio {unidad.codigo} ({propiedad.nombre})
                  </p>

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total a Pagar:
                    </span>
                    <span className="text-sm font-black text-slate-900 font-heading">
                      ${pago.montoEsperado.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Desglose de Concepto Arrendatario: Tabla Desktop (>= sm & Impresión) */}
                <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 uppercase text-[11px] tracking-wider font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3.5">Espacio</th>
                        <th className="py-2.5 px-3.5">Descripción del Concepto</th>
                        <th className="py-2.5 px-2 text-center">Cant</th>
                        <th className="py-2.5 px-3.5 text-right">Precio Unit.</th>
                        <th className="py-2.5 px-3.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-sans">
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-900 border border-slate-200/80 whitespace-nowrap">
                            {unidad.codigo}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-medium">
                          Alquiler del Espacio {unidad.codigo} ({propiedad.nombre})
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs">
                            1
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-slate-700">
                          ${pago.montoEsperado.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-slate-950 font-heading">
                          ${pago.montoEsperado.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Franja Sobria de Período Liquidado */}
                <div className="bg-gradient-to-r from-emerald-50/70 via-slate-50 to-emerald-50/70 border border-emerald-200/70 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#175E38]" />
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
                      Período Liquidado:
                    </span>
                  </div>
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-white border border-emerald-200 shadow-2xs text-[11px] sm:text-xs font-black text-[#175E38] font-heading uppercase">
                    {periodoTexto}
                  </span>
                </div>

                {/* Detalle de Liquidación y Totales (Distribución Ejecutiva en 2 Tarjetas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  {/* Tarjeta Detalle del Pago */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between space-y-2.5 sm:space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 pb-1.5 border-b border-slate-200/60 mb-2 sm:mb-2.5">
                        <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Detalle del Pago</span>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Método:</span>
                          <span className="font-bold text-slate-900 bg-white px-2 sm:px-2.5 py-0.5 rounded-md border border-slate-200/80 shadow-2xs text-[11px] sm:text-xs">
                            {pago.metodoPago ? METODO_LABELS[pago.metodoPago] : "Efectivo"}
                          </span>
                        </div>
                        {pago.referencia && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Referencia:</span>
                            <span className="font-mono font-bold text-slate-900 bg-white px-2 sm:px-2.5 py-0.5 rounded-md border border-slate-200/80 shadow-2xs text-[11px] sm:text-xs">
                              #{pago.referencia}
                            </span>
                          </div>
                        )}
                        {pago.notas && (
                          <div className="text-[10px] sm:text-[11px] text-slate-500 italic pt-0.5 sm:pt-1">
                            Nota: {pago.notas}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vista Previa del Comprobante / Soporte Bancario Subido */}
                    {pago.comprobanteUrl ? (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-[#175E38]" />
                            <span>Comprobante de Pago Subido</span>
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Adjunto
                          </span>
                        </div>

                        <div
                          onClick={() => setVisorImagenAbierto(true)}
                          className="group relative h-28 sm:h-32 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                          title="Clic para ampliar comprobante en pantalla completa"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pago.comprobanteUrl}
                            alt="Comprobante de pago subido"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg bg-black/75 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ampliar Comprobante</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="p-2 rounded-xl bg-slate-100/80 border border-slate-200/70 text-center">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Liquidación en Efectivo • Sin voucher digital
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta Resumen Financiero */}
                  <div className="bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/40 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between space-y-2.5 sm:space-y-3">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200/60">
                        Resumen de Cobro
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Subtotal / Canon:</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">${pago.montoEsperado.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-1.5 sm:pt-2 border-t border-slate-200/80 space-y-1">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#175E38]">
                          Total Cancelado:
                        </span>
                        <span className="text-base sm:text-xl font-black text-[#175E38] font-heading whitespace-nowrap">
                          ${pago.montoPagado.toFixed(2)} USD
                        </span>
                      </div>
                      {saldoRestante > 0 && (
                        <div className="flex justify-between items-center text-[11px] sm:text-xs font-bold text-rose-700 bg-rose-50 px-2 sm:px-2.5 py-1 rounded-lg border border-rose-200">
                          <span>Saldo Pendiente:</span>
                          <span>${saldoRestante.toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción: Compartir & Previsualizar PDF */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-center print:hidden">
                <button
                  type="button"
                  onClick={handleCompartir}
                  disabled={compartiendo}
                  className="w-full sm:w-auto sm:min-w-[160px] px-4 h-11 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 disabled:opacity-60"
                  title="Compartir documento por WhatsApp, Correo u otras aplicaciones"
                >
                  {compartiendo ? (
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
                  ) : (
                    <Share2 className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span>Compartir</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrevisualizarPdf}
                  disabled={generandoPdf}
                  className="w-full sm:w-auto sm:min-w-[190px] px-5 h-11 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] shadow-[0_2px_8px_rgba(23,94,56,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 disabled:opacity-60"
                >
                  {generandoPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Construyendo PDF...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 shrink-0" />
                      <span>Previsualizar PDF</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal de Compartir Alternativo / Opciones Desktop */}
      <Modal
        isOpen={modalCompartirAbierto}
        onClose={() => setModalCompartirAbierto(false)}
        title="Compartir Comprobante"
        subtitle={`Nota de Entrega #${numeroReciboPreliminar}`}
        icon={Share2}
        headerVariant="green"
        maxWidth="md"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecciona el canal por el cual deseas enviar los detalles de este comprobante oficial a{" "}
            <strong className="text-slate-900 font-bold">{inquilinoNombreCompleto}</strong>:
          </p>

          <div className="space-y-2">
            {/* Opción WhatsApp */}
            <a
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-slate-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block font-heading">
                    Enviar por WhatsApp
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {inquilino.telefono ? `Chat directo con ${inquilino.telefono}` : "Abrir WhatsApp Web o Móvil"}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-white rounded-lg border border-emerald-200 shadow-2xs shrink-0 group-hover:bg-[#175E38] group-hover:text-white transition-colors">
                Abrir
              </span>
            </a>

            {/* Opción Correo Electrónico */}
            <a
              href={urlCorreo}
              className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block font-heading">
                    Enviar por Correo Electrónico
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {inquilino.email ? inquilino.email : "Redactar en cliente de correo"}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0 group-hover:bg-[#1C2539] group-hover:text-white transition-colors">
                Redactar
              </span>
            </a>

            {/* Opción Copiar Detalles */}
            <button
              type="button"
              onClick={handleCopiarMensaje}
              className="w-full group flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  {copiado ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <span className="text-xs font-bold text-slate-900 block font-heading">
                    {copiado ? "¡Detalles Copiados!" : "Copiar Resumen Formal"}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    Copiar el mensaje para pegarlo en cualquier chat
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs shrink-0 group-hover:bg-slate-200 transition-colors">
                {copiado ? "Listo" : "Copiar"}
              </span>
            </button>
          </div>

          {/* Consejo para computadoras de escritorio */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-500">
            <Download className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-700 font-semibold">Consejo para Desktop:</strong> Para adjuntar el archivo PDF en WhatsApp Web o correo desde una computadora, haz clic en{" "}
              <button
                type="button"
                onClick={() => {
                  setModalCompartirAbierto(false);
                  handleDescargarPdf();
                }}
                className="font-bold text-[#175E38] underline hover:text-[#124b2d] cursor-pointer"
              >
                Descargar PDF
              </button>{" "}
              y arrástralo directamente a tu conversación.
            </p>
          </div>
        </div>
      </Modal>

      {/* Visor de Comprobante Bancario Adjunto */}
      {pago.comprobanteUrl && (
        <ImageViewerModal
          isOpen={visorImagenAbierto}
          onClose={() => setVisorImagenAbierto(false)}
          images={[pago.comprobanteUrl]}
          initialIndex={0}
          title={`Soporte Bancario • ${numeroReciboPreliminar}`}
          subtitle={`${propiedad.nombre} · ${unidad.codigo} · $${pago.montoPagado.toFixed(2)} USD`}
        />
      )}
    </>
  );
}
