"use client";

import React, { useState } from "react";
import {
  DollarSign,
  User,
  Store,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Maximize2,
  FileText,
  CreditCard,
  Mail,
  Phone,
  ZoomIn,
  Trash2,
  Plus,
  Receipt,
  History,
} from "lucide-react";
import { Modal, ImageViewerModal } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import {
  formatCurrency,
  TIPO_PROPIEDAD_LABEL,
  TIPO_UNIDAD_LABEL,
} from "@/app/admin/propiedades/constants";
import { EstadoPago, MetodoPago, TipoPersona } from "@prisma/client";
import type { PagoItem } from "./types";
import { toast } from "sonner";

interface PagoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: PagoItem | null;
  onAnular: (pagoId: string) => Promise<boolean>;
  onEliminarTransaccion?: (transaccionId: string) => Promise<boolean>;
  onRegistrarNuevo?: (pago: PagoItem) => void;
  onVerRecibo?: (pago: PagoItem) => void;
  isLoading?: boolean;
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

export function PagoDetalleModal({
  isOpen,
  onClose,
  pago,
  onAnular,
  onEliminarTransaccion,
  onRegistrarNuevo,
  onVerRecibo,
  isLoading = false,
}: PagoDetalleModalProps) {
  const [confirmandoAnulacion, setConfirmandoAnulacion] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [confirmandoEliminarId, setConfirmandoEliminarId] = useState<string | null>(null);

  // Estado para visualizador de imágenes en pantalla grande
  const [visorImagenes, setVisorImagenes] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex?: number;
    title?: string;
    subtitle?: string;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  if (!pago) return null;

  const contrato = pago.contrato;
  const inquilino = contrato.inquilino;
  const unidad = contrato.unidad;
  const propiedad = unidad.propiedad;
  const saldoPendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);
  const porcentajeAmortizado = Math.min(
    100,
    Math.round((pago.montoPagado / (pago.montoEsperado || 1)) * 100)
  );

  const nombreMes = NOMBRES_MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;

  // Formateo de fechas
  const fechaVence = new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const fechaPagoStr = pago.fechaPago
    ? new Date(pago.fechaPago).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const fInicioContrato = contrato.fechaInicio
    ? new Date(contrato.fechaInicio).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const fFinContrato = contrato.fechaFin
    ? new Date(contrato.fechaFin).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Cálculo de días de mora o vigencia
  const ahora = new Date();
  const fechaVenceDate = new Date(pago.fechaVencimiento);
  const esVencido = pago.estado === EstadoPago.VENCIDO;
  const diffMs = ahora.getTime() - fechaVenceDate.getTime();
  const diasMora = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // Enlace y mensaje contextual de WhatsApp
  const telLimpio = inquilino.telefono.replace(/[^0-9]/g, "");
  let mensajeWp = "";
  if (pago.estado === EstadoPago.PAGADO) {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le confirmamos que hemos recibido satisfactoriamente su pago de $${pago.montoPagado.toFixed(2)} USD por concepto de la mensualidad de ${nombreMes} ${pago.periodoAno} del espacio ${unidad.codigo} en ${propiedad.nombre}. ¡Muchas gracias por su puntualidad!`;
  } else if (pago.estado === EstadoPago.VENCIDO) {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le escribimos cordialmente para recordarle que la mensualidad de ${nombreMes} ${pago.periodoAno} ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} en ${propiedad.nombre} se encuentra vencida desde el ${fechaVence}. Agradecemos gestionar la cancelación a la brevedad y compartir el comprobante.`;
  } else if (pago.estado === EstadoPago.PARCIAL) {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le recordamos que para la mensualidad de ${nombreMes} ${pago.periodoAno} del espacio ${unidad.codigo} en ${propiedad.nombre} mantiene un saldo pendiente de $${saldoPendiente.toFixed(2)} USD. Agradecemos coordinar la cancelación del restante.`;
  } else {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le recordamos que la mensualidad de ${nombreMes} ${pago.periodoAno} ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} en ${propiedad.nombre} tiene como fecha de cobro el ${fechaVence}. Quedamos atentos para recibir el comprobante.`;
  }
  const urlWhatsapp = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeWp)}`;

  const tipoPropiedadLabel = propiedad.tipo ? TIPO_PROPIEDAD_LABEL[propiedad.tipo] : "Inmueble";
  const tipoUnidadLabel = unidad.tipo ? TIPO_UNIDAD_LABEL[unidad.tipo] : "Espacio Comercial";

  const handleEjecutarAnulacion = async () => {
    setAnulando(true);
    try {
      const exito = await onAnular(pago.id);
      if (exito) {
        toast.success("Pago anulado exitosamente. Se restableció el estado del cobro.");
        setConfirmandoAnulacion(false);
        onClose();
      }
    } finally {
      setAnulando(false);
    }
  };

  const handleEliminarTransaccionIndividual = async (transaccionId: string) => {
    if (!onEliminarTransaccion) return;
    setEliminandoId(transaccionId);
    try {
      const exito = await onEliminarTransaccion(transaccionId);
      if (exito) {
        setConfirmandoEliminarId(null);
      }
    } finally {
      setEliminandoId(null);
    }
  };

  const transacciones = pago.transacciones || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmandoAnulacion(false);
        setConfirmandoEliminarId(null);
        onClose();
      }}
      title="Ficha Detallada de Cobranza"
      subtitle={`Período: ${nombreMes} ${pago.periodoAno} • ${unidad.codigo}`}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Banner Financiero Principal: Estado de la Cuota y Montos */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-slate-100/50 border border-slate-200/90 border-b-[3px] border-b-slate-300/80 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                  pago.estado === EstadoPago.PAGADO
                    ? "bg-emerald-100 text-[#175E38] border border-emerald-200"
                    : pago.estado === EstadoPago.VENCIDO
                    ? "bg-rose-100 text-[#CC1A22] border border-rose-200"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}
              >
                {pago.estado === EstadoPago.PAGADO ? (
                  <CheckCircle className="w-6 h-6 stroke-[2.2]" />
                ) : pago.estado === EstadoPago.VENCIDO ? (
                  <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                ) : (
                  <Clock className="w-6 h-6 stroke-[2.2]" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Estado del Cobro
                </span>
                <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 truncate">
                  {pago.estado === EstadoPago.PAGADO
                    ? "Cobro Liquidado (Pagado)"
                    : pago.estado === EstadoPago.VENCIDO
                    ? "Cuota Vencida en Mora"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "Abono Parcial Registrado"
                    : "Cuota por Cobrar"}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                  <span>Vence: {fechaVence}</span>
                  {esVencido && diasMora > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                      {diasMora === 1 ? "1 día de mora" : `${diasMora} días en mora`}
                    </span>
                  )}
                  {pago.estado === EstadoPago.PAGADO && fechaPagoStr && (
                    <span className="text-emerald-700 font-semibold">
                      • Liquidado el {fechaPagoStr}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/90 flex sm:flex-col justify-between items-baseline sm:items-end">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Monto Facturado
                </span>
                <div className="text-xl sm:text-2xl font-black font-heading text-slate-900">
                  ${pago.montoEsperado.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-500">USD</span>
                </div>
              </div>
              <div className="space-y-0.5 sm:mt-1">
                {pago.montoPagado > 0 && (
                  <div className="text-xs font-bold text-emerald-700">
                    Abonado: ${pago.montoPagado.toFixed(2)} USD
                  </div>
                )}
                {saldoPendiente > 0 && pago.estado === EstadoPago.PARCIAL && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-block">
                    Saldo pendiente: ${saldoPendiente.toFixed(2)} USD
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de progreso de amortización de la cuota */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <span>Progreso de Amortización:</span>
                <strong className={pago.estado === EstadoPago.PAGADO ? "text-[#175E38]" : "text-blue-700"}>
                  {porcentajeAmortizado}%
                </strong>
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                ${pago.montoPagado.toFixed(2)} de ${pago.montoEsperado.toFixed(2)} USD
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pago.estado === EstadoPago.PAGADO
                    ? "bg-[#175E38]"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "bg-blue-600"
                    : "bg-slate-300"
                }`}
                style={{ width: `${porcentajeAmortizado}%` }}
              />
            </div>
          </div>
        </div>

        {/* 1. Bloque: Inmueble y Espacio Físico (Showcase Ancho Completo) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/80 shadow-2xs shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                Inmueble & Espacio Físico
              </h4>
            </div>
            <Badge variant="info" size="sm" className="shrink-0 whitespace-nowrap">
              {tipoPropiedadLabel}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            {unidad.imagenes && unidad.imagenes.length > 0 ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setVisorImagenes({
                    isOpen: true,
                    images: unidad.imagenes || [],
                    initialIndex: 0,
                    title: `${unidad.codigo} • ${propiedad.nombre}`,
                    subtitle: `${tipoUnidadLabel} • ${propiedad.ciudad || "San Cristóbal"}`,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setVisorImagenes({
                      isOpen: true,
                      images: unidad.imagenes || [],
                      initialIndex: 0,
                      title: `${unidad.codigo} • ${propiedad.nombre}`,
                      subtitle: `${tipoUnidadLabel} • ${propiedad.ciudad || "San Cristóbal"}`,
                    });
                  }
                }}
                className="relative w-full sm:w-60 md:w-64 aspect-[16/10] sm:aspect-auto sm:min-h-[150px] rounded-xl overflow-hidden border border-slate-200/90 bg-slate-950 group shadow-2xs cursor-pointer hover:border-[#175E38]/60 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-[#175E38]/30"
                title="Haz clic para ver las fotos en tamaño grande"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={unidad.imagenes[0]}
                  alt={unidad.codigo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                  <Store className="w-3 h-3 text-emerald-400" />
                  <span>{unidad.codigo}</span>
                </div>

                {unidad.imagenes.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-medium shadow-sm">
                    {unidad.imagenes.length} fotos
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[1.5px]">
                  <div className="px-3 py-1.5 rounded-lg bg-black/75 text-white flex items-center gap-1.5 shadow-md border border-white/20">
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Click para ampliar foto</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg leading-tight">
                    {propiedad.nombre}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                    <Store className="w-3 h-3 text-[#175E38]" />
                    <span>{unidad.codigo} • {tipoUnidadLabel}</span>
                  </span>
                </div>

                <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {propiedad.direccion ? `${propiedad.direccion}, ` : ""}
                    {propiedad.ciudad || "San Cristóbal"}
                  </span>
                </div>

                {propiedad.propietario && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Propietario / Administración:{" "}
                    <span className="text-slate-600 font-semibold">{propiedad.propietario}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Espacio
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-heading block mt-0.5 truncate">
                    {unidad.codigo}
                  </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center justify-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>Nivel / Piso</span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5 truncate">
                    {unidad.piso || "PB"}
                  </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center justify-center gap-1">
                    <Maximize2 className="w-3 h-3 text-slate-400" />
                    <span>Área Metraje</span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5 truncate">
                    {unidad.areaMt2 ? `${unidad.areaMt2} m²` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Cuadrícula Equilibrada 50/50: Inquilino Titular vs Contrato Vinculado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Sub-tarjeta A: Inquilino Titular y Contacto Directo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/80 shadow-2xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                    Inquilino Titular
                  </h4>
                </div>
                <Badge
                  variant={inquilino.tipoPersona === TipoPersona.JURIDICA ? "info" : "neutral"}
                  size="sm"
                  className="shrink-0 whitespace-nowrap"
                >
                  {inquilino.tipoPersona === TipoPersona.JURIDICA ? "Persona Jurídica" : "Persona Natural"}
                </Badge>
              </div>

              <div>
                <p className="font-heading font-black text-slate-900 text-base">
                  {inquilino.nombre} {inquilino.apellido || ""}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Doc: {inquilino.documentoIdentidad}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono font-medium">{inquilino.telefono}</span>
                </div>
                {inquilino.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{inquilino.email}</span>
                  </div>
                )}
                {inquilino.telefonoSecundario && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">Tel. Sec: {inquilino.telefonoSecundario}</span>
                  </div>
                )}
                {inquilino.direccion && (
                  <div className="flex items-start gap-2 text-slate-500 text-[11px] pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{inquilino.direccion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botón oficial de WhatsApp */}
            <div className="pt-2">
              <a
                href={urlWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2.5 rounded-xl border border-emerald-300 shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>Contactar por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Sub-tarjeta B: Contrato Vinculado */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-200/80 shadow-2xs shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                    Contrato Vinculado
                  </h4>
                </div>
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 whitespace-nowrap">
                  {contrato.codigo}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vigencia del Contrato
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold mt-1 text-xs sm:text-sm font-heading">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {fInicioContrato && fFinContrato
                        ? `${fInicioContrato} — ${fFinContrato}`
                        : "Contrato Vigente"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Corte Mensual
                    </span>
                    <span className="text-xs font-bold text-slate-900 block mt-1">
                      Día {contrato.diaCobro} de cada mes
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Depósito Garantía
                    </span>
                    <span className="text-xs font-bold text-slate-900 block mt-1">
                      {contrato.depositoGarantia ? formatCurrency(contrato.depositoGarantia) : "Sin depósito"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {contrato.documentoUrl ? (
                <a
                  href={contrato.documentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2.5 rounded-xl border border-emerald-300 shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Contrato PDF Firmado</span>
                </a>
              ) : (
                <div className="w-full text-center py-2 text-[11px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Sin documento PDF digital cargado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Sección: Historial de Abonos y Transacciones (Libro Mayor 1:N) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-200/80 shadow-2xs shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                  Libro Mayor de Transacciones (Abonos)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {transacciones.length === 0
                    ? "Sin abonos registrados aún"
                    : `${transacciones.length} ${transacciones.length === 1 ? "abono registrado" : "abonos registrados"} para este período`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saldoPendiente > 0 && onRegistrarNuevo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegistrarNuevo(pago);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Abono</span>
                </button>
              )}
              {pago.montoPagado > 0 && onVerRecibo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onVerRecibo(pago);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ver Recibo</span>
                </button>
              )}
            </div>
          </div>

          {/* Listado de Abonos */}
          {transacciones.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
              <CreditCard className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700">No se han registrado pagos o abonos para esta cuota.</p>
              <p className="text-slate-400">
                Cuando el arrendatario realice un pago total o parcial, podrás registrarlo aquí para amortizar el saldo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transacciones.map((tx, idx) => {
                const fPago = new Date(tx.fechaPago).toLocaleDateString("es-VE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const esConfirmandoBorrado = confirmandoEliminarId === tx.id;
                const esBorrando = eliminandoId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[#175E38] text-white font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-heading text-slate-900">
                              +${tx.monto.toFixed(2)} USD
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {METODO_LABELS[tx.metodoPago] || "Método desconocido"}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            Abonado el {fPago}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {tx.comprobanteUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setVisorImagenes({
                                isOpen: true,
                                images: [tx.comprobanteUrl!],
                                initialIndex: 0,
                                title: `Comprobante de Abono #${idx + 1} • ${unidad.codigo}`,
                                subtitle: `${propiedad.nombre} • $${tx.monto.toFixed(2)} USD • Ref: ${tx.referencia || "Sin ref"}`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#175E38] hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Comprobante</span>
                          </button>
                        )}

                        {onEliminarTransaccion && !esConfirmandoBorrado && (
                          <button
                            type="button"
                            onClick={() => setConfirmandoEliminarId(tx.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar este abono individual"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detalle secundario del abono: Referencia y Notas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">Referencia:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {tx.referencia ? `#${tx.referencia}` : "Sin referencia"}
                        </span>
                      </div>

                      {tx.notas && (
                        <div className="text-[11px] text-slate-500 italic truncate max-w-sm">
                          &quot;{tx.notas}&quot;
                        </div>
                      )}
                    </div>

                    {/* Alerta de confirmación inline para eliminar abono individual */}
                    {esConfirmandoBorrado && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2 mt-2">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>¿Eliminar este abono de ${tx.monto.toFixed(2)} USD?</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          Se restará del total abonado y el estado de la cuota se recalculará automáticamente.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setConfirmandoEliminarId(null)}
                            disabled={esBorrando}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarTransaccionIndividual(tx.id)}
                            disabled={esBorrando}
                            className="px-3 py-1 rounded-md text-xs font-bold bg-[#CC1A22] text-white hover:bg-[#a81219] flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {esBorrando ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Eliminando...</span>
                              </>
                            ) : (
                              <span>Sí, Eliminar Abono</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerta de confirmación para anular pago completo */}
        {confirmandoAnulacion && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex items-start gap-2.5 text-rose-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>
                ¿Estás seguro de anular la cuota completa? Se eliminarán todos los abonos y transacciones registradas de este período, restaurando el saldo total pendiente.
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoAnulacion(false)}
                disabled={anulando}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEjecutarAnulacion}
                disabled={anulando}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#CC1A22] text-white hover:bg-[#a81219] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {anulando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Anulando...</span>
                  </>
                ) : (
                  <span>Sí, Anular Todo</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer de Acciones */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            {(pago.estado === EstadoPago.PAGADO || pago.estado === EstadoPago.PARCIAL) &&
              !confirmandoAnulacion && (
                <button
                  type="button"
                  onClick={() => setConfirmandoAnulacion(true)}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Anular Cuota Completa</span>
                </button>
              )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 h-10 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            {(pago.estado === EstadoPago.PENDIENTE ||
              pago.estado === EstadoPago.VENCIDO ||
              pago.estado === EstadoPago.PARCIAL) &&
              onRegistrarNuevo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegistrarNuevo(pago);
                  }}
                  className="w-full sm:w-auto px-4 h-10 rounded-xl text-xs sm:text-sm font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] active:translate-y-0.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{pago.estado === EstadoPago.PARCIAL ? "Abonar Restante" : "Registrar Pago"}</span>
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Visor de Imágenes en Pantalla Completa / Ampliada */}
      <ImageViewerModal
        isOpen={visorImagenes.isOpen}
        onClose={() => setVisorImagenes((prev) => ({ ...prev, isOpen: false }))}
        images={visorImagenes.images}
        initialIndex={visorImagenes.initialIndex}
        title={visorImagenes.title}
        subtitle={visorImagenes.subtitle}
      />
    </Modal>
  );
}
