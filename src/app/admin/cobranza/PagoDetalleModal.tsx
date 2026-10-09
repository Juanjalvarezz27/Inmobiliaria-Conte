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
      subtitle={`${nombreMes} ${pago.periodoAno} · ${unidad.codigo}`}
      icon={Receipt}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* 1. Métricas Clave de la Cuota (Cuadrícula 2x2 en Móvil / 4 Columnas en Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Monto Facturado */}
          <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Monto Cuota
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5 truncate">
              ${pago.montoEsperado.toFixed(2)}{" "}
              <span className="text-[11px] font-normal text-slate-500">USD</span>
            </p>
          </div>

          {/* Monto Abonado */}
          <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Total Abonado
            </span>
            <p className="text-base sm:text-lg font-black text-emerald-700 font-heading mt-0.5 truncate">
              ${pago.montoPagado.toFixed(2)}{" "}
              <span className="text-[11px] font-normal text-slate-500">USD</span>
            </p>
          </div>

          {/* Saldo Pendiente */}
          <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Saldo Pendiente
            </span>
            <p
              className={`text-base sm:text-lg font-black font-heading mt-0.5 truncate ${
                saldoPendiente > 0 ? "text-rose-600" : "text-slate-800"
              }`}
            >
              ${saldoPendiente.toFixed(2)}{" "}
              <span className="text-[11px] font-normal text-slate-500">USD</span>
            </p>
          </div>

          {/* Estado del Cobro */}
          <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Estado
            </span>
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-lg border truncate ${
                  pago.estado === EstadoPago.PAGADO
                    ? "bg-emerald-100 text-[#124b2d] border-emerald-300"
                    : pago.estado === EstadoPago.VENCIDO
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}
              >
                {pago.estado === EstadoPago.PAGADO ? (
                  <CheckCircle className="w-3 h-3 text-[#175E38] shrink-0" />
                ) : pago.estado === EstadoPago.VENCIDO ? (
                  <AlertTriangle className="w-3 h-3 text-[#CC1A22] shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                )}
                <span className="truncate">
                  {pago.estado === EstadoPago.PAGADO
                    ? "Liquidado"
                    : pago.estado === EstadoPago.VENCIDO
                    ? "En Mora"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "Parcial"
                    : "Por Cobrar"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Amortización y Tiempos */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>Amortización:</span>
              <strong className={pago.estado === EstadoPago.PAGADO ? "text-[#175E38]" : "text-blue-700"}>
                {porcentajeAmortizado}%
              </strong>
              <span className="text-[11px] text-slate-400 font-normal">
                (${pago.montoPagado.toFixed(2)} de ${pago.montoEsperado.toFixed(2)})
              </span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Vence: <strong className="text-slate-700">{fechaVence}</strong>
              {esVencido && diasMora > 0 && (
                <span className="ml-1 text-rose-700 font-bold">({diasMora}d mora)</span>
              )}
              {pago.estado === EstadoPago.PAGADO && fechaPagoStr && (
                <span className="ml-1 text-emerald-700 font-bold">({fechaPagoStr})</span>
              )}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
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

        {/* 2. Inmueble y Espacio Físico */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/80 shadow-2xs shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                Inmueble y Espacio
              </h4>
            </div>
            <Badge variant="info" size="sm" className="shrink-0 whitespace-nowrap">
              {tipoPropiedadLabel}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
            {unidad.imagenes && unidad.imagenes.length > 0 && (
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
                className="relative w-full sm:w-48 md:w-56 h-36 sm:h-auto rounded-xl overflow-hidden border border-slate-200/90 bg-slate-950 group shadow-2xs cursor-pointer hover:border-[#175E38]/60 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-[#175E38]/30"
                title="Haz clic para ver las fotos en tamaño grande"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={unidad.imagenes[0]}
                  alt={unidad.codigo}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm">
                  <Store className="w-3 h-3 text-emerald-400" />
                  <span>{unidad.codigo}</span>
                </div>

                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 shadow-sm">
                  <ZoomIn className="w-3 h-3 text-emerald-400" />
                  <span>{unidad.imagenes.length > 1 ? `${unidad.imagenes.length} fotos` : "Ampliar"}</span>
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-black text-slate-900 text-base leading-tight">
                    {propiedad.nombre}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                    <Store className="w-3 h-3 text-[#175E38]" />
                    <span>{unidad.codigo} • {tipoUnidadLabel}</span>
                  </span>
                </div>

                <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">
                    {propiedad.direccion ? `${propiedad.direccion}, ` : ""}
                    {propiedad.ciudad || "San Cristóbal"}
                  </span>
                </div>

                {propiedad.propietario && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Propietario / Admin:{" "}
                    <span className="text-slate-600 font-semibold">{propiedad.propietario}</span>
                  </p>
                )}
              </div>

              {/* 3 cajas de métricas clave con microcopy conciso sin texto desbordado */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    Espacio
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-heading block mt-0.5 truncate">
                    {unidad.codigo}
                  </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    Nivel
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5 truncate">
                    {unidad.piso || "PB"}
                  </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    Área
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5 truncate">
                    {unidad.areaMt2 ? `${unidad.areaMt2} m²` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Inquilino Titular y Contrato Vinculado (Cuadrícula 50/50) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Sub-tarjeta A: Inquilino Titular */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
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
                <p className="font-heading font-black text-slate-900 text-sm sm:text-base">
                  {inquilino.nombre} {inquilino.apellido || ""}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Doc: {inquilino.documentoIdentidad}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-0.5 text-xs text-slate-600">
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
              </div>
            </div>

            {/* Botón WhatsApp */}
            <div className="pt-2">
              <a
                href={urlWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs font-bold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100 px-3.5 rounded-xl border border-emerald-300 shadow-2xs transition-all active:scale-[0.99] cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>Contactar por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Sub-tarjeta B: Contrato Vinculado */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-200/80 shadow-2xs shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                    Contrato Vinculado
                  </h4>
                </div>
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0 whitespace-nowrap">
                  {contrato.codigo}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vigencia del Contrato
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold mt-1 text-xs font-heading">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {fInicioContrato && fFinContrato
                        ? `${fInicioContrato} — ${fFinContrato}`
                        : "Contrato Vigente"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                      Corte Mensual
                    </span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                      Día {contrato.diaCobro}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                      Garantía
                    </span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                      {contrato.depositoGarantia ? formatCurrency(contrato.depositoGarantia) : "Sin depósito"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Ver PDF Contrato */}
            <div className="pt-2">
              {contrato.documentoUrl ? (
                <a
                  href={contrato.documentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs font-bold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100 px-3.5 rounded-xl border border-emerald-300 shadow-2xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Contrato PDF</span>
                </a>
              ) : (
                <div className="w-full h-11 flex items-center justify-center text-[11px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Sin documento PDF digital
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Libro Mayor de Transacciones (Abonos) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] flex items-center justify-center border border-emerald-200/80 shadow-2xs shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-heading truncate">
                  Libro Mayor de Transacciones
                </h4>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {transacciones.length === 0
                    ? "Sin abonos registrados aún"
                    : `${transacciones.length} ${transacciones.length === 1 ? "abono registrado" : "abonos registrados"}`}
                </p>
              </div>
            </div>

            {/* Botones de acción en la cabecera del libro mayor */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {saldoPendiente > 0 && onRegistrarNuevo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegistrarNuevo(pago);
                  }}
                  className="w-full sm:w-auto h-9 sm:h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Registrar Abono</span>
                </button>
              )}
              {pago.montoPagado > 0 && onVerRecibo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onVerRecibo(pago);
                  }}
                  className={`w-full sm:w-auto h-9 sm:h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                    saldoPendiente <= 0 || !onRegistrarNuevo ? "col-span-2" : ""
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Ver Recibo</span>
                </button>
              )}
            </div>
          </div>

          {/* Listado de Abonos */}
          {transacciones.length === 0 ? (
            <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1.5">
              <CreditCard className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700">No se han registrado pagos o abonos para esta cuota.</p>
              <p className="text-slate-400 text-[11px]">
                Cuando el arrendatario realice un abono total o parcial, podrás registrarlo aquí para amortizar el saldo.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transacciones.map((tx, idx) => {
                const fPago = new Date(tx.fechaPago).toLocaleDateString("es-VE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const esConfirmandoBorrado = confirmandoEliminarId === tx.id;
                const esBorrando = eliminandoId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-[#175E38] text-white font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-black font-heading text-slate-900">
                              +${tx.monto.toFixed(2)} USD
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {METODO_LABELS[tx.metodoPago] || "Método"}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {fPago}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tx.comprobanteUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setVisorImagenes({
                                isOpen: true,
                                images: [tx.comprobanteUrl!],
                                initialIndex: 0,
                                title: `Comprobante #${idx + 1} • ${unidad.codigo}`,
                                subtitle: `${propiedad.nombre} • $${tx.monto.toFixed(2)} USD • Ref: ${tx.referencia || "Sin ref"}`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#175E38] hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">Comprobante</span>
                          </button>
                        )}

                        {onEliminarTransaccion && !esConfirmandoBorrado && (
                          <button
                            type="button"
                            onClick={() => setConfirmandoEliminarId(tx.id)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar este abono individual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detalle secundario del abono: Referencia y Notas */}
                    {(tx.referencia || tx.notas) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                        {tx.referencia && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Ref:</span>
                            <span className="font-mono font-bold text-slate-800">
                              #{tx.referencia}
                            </span>
                          </div>
                        )}
                        {tx.notas && (
                          <div className="text-[10px] text-slate-500 italic truncate max-w-xs">
                            &quot;{tx.notas}&quot;
                          </div>
                        )}
                      </div>
                    )}

                    {/* Alerta de confirmación inline para eliminar abono individual */}
                    {esConfirmandoBorrado && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5 mt-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>¿Eliminar este abono de ${tx.monto.toFixed(2)} USD?</span>
                        </div>
                        <p className="text-[10px] text-rose-700">
                          Se restará del total abonado y el estado de la cuota se actualizará de inmediato.
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
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Eliminando...</span>
                              </>
                            ) : (
                              <span>Sí, Eliminar</span>
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
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
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

        {/* Footer de Acciones del Modal */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {/* Fila principal de botones (Mobile: grid 2 columnas de igual ancho, altura táctil h-11) */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              {(pago.estado === EstadoPago.PAGADO || pago.estado === EstadoPago.PARCIAL) &&
                !confirmandoAnulacion && (
                  <button
                    type="button"
                    onClick={() => setConfirmandoAnulacion(true)}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Anular Cuota Completa</span>
                  </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className={`w-full sm:w-auto px-4 h-11 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer ${
                  pago.estado === EstadoPago.PAGADO && !onVerRecibo ? "col-span-2" : ""
                }`}
              >
                Cerrar
              </button>

              {/* Si está liquidado y hay botón de recibo */}
              {pago.estado === EstadoPago.PAGADO && onVerRecibo && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onVerRecibo(pago);
                  }}
                  className="w-full sm:w-auto px-4 h-11 rounded-xl text-xs sm:text-sm font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] border-b-[3px] border-b-[#121927] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Ver Recibo</span>
                </button>
              )}

              {/* Si hay saldo pendiente (PENDIENTE, VENCIDO, PARCIAL) y hay callback de registrar */}
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
                    className="w-full sm:w-auto px-4 h-11 rounded-xl text-xs sm:text-sm font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] active:translate-y-0.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="truncate">
                      {pago.estado === EstadoPago.PARCIAL ? "Abonar Restante" : "Registrar Pago"}
                    </span>
                  </button>
                )}
            </div>
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
