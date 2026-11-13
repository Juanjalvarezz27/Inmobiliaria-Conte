"use client";

import React from "react";
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Eye,
  Store,
  Receipt,
  Calendar,
  Phone,
  Mail,
  Lock,
  Zap,
  Droplets,
  ChevronRight,
  Check,
  Clock,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { EstadoPago } from "@prisma/client";
import { MESES } from "@/lib/date-utils";
import type { PagoItem } from "./types";

// Estilo del sol decorativo en esquina según el estado del cobro
const getPagoCornerSun = (estado: EstadoPago, esPorConfirmar = false) => {
  if (esPorConfirmar) {
    return {
      glow: "bg-blue-500/20",
      ring: "bg-blue-500/[0.08] border-blue-400/25",
      sun: "from-blue-600/30 to-blue-400/5",
    };
  }
  switch (estado) {
    case EstadoPago.PAGADO:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
    case EstadoPago.VENCIDO:
      return {
        glow: "bg-rose-500/20",
        ring: "bg-rose-500/[0.08] border-rose-400/25",
        sun: "from-[#CC1A22]/25 to-rose-400/5",
      };
    case EstadoPago.PARCIAL:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    case EstadoPago.PENDIENTE:
    default:
      return {
        glow: "bg-amber-500/20",
        ring: "bg-amber-500/[0.08] border-amber-400/25",
        sun: "from-amber-600/25 to-amber-400/5",
      };
  }
};

interface PagoCardProps {
  pago: PagoItem;
  nombreMesActual: string;
  ano: number;
  isLoadingDetalle?: boolean;
  compact?: boolean;
  onVerFicha: (pagoId: string) => void;
  onRegistrarPago: (pagoId: string) => void;
  onVerRecibo: (pago: PagoItem) => void;
  onGestionarServicios?: (pago: PagoItem) => void;
}

export function PagoCard({
  pago,
  nombreMesActual,
  ano,
  isLoadingDetalle = false,
  compact = false,
  onVerFicha,
  onRegistrarPago,
  onVerRecibo,
  onGestionarServicios,
}: PagoCardProps) {
  const inquilino = pago.contrato.inquilino;
  const unidad = pago.contrato.unidad;
  const saldoPendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);
  const telLimpio = inquilino.telefono.replace(/[^0-9]/g, "");

  // Fecha de vencimiento legible
  const fechaVence = new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
  });

  // Enlace de WhatsApp directo con mensaje contextual
  let mensajeWp = "";
  if (pago.estado === EstadoPago.PAGADO) {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le confirmamos que hemos recibido satisfactoriamente su pago de $${pago.montoPagado.toFixed(2)} USD por concepto de arrendamiento del espacio ${unidad.codigo} (${nombreMesActual} ${ano}). ¡Muchas gracias por su puntualidad!`;
  } else if (pago.estado === EstadoPago.VENCIDO) {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le escribimos para recordarle que el pago del canon ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} se encuentra vencido desde el día de corte. Agradecemos coordinar la cancelación a la brevedad.`;
  } else {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le recordamos que el canon ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} vence próximamente. Quedamos a su orden para recibir el comprobante.`;
  }
  const urlWhatsapp = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeWp)}`;
  const esPorConfirmar = Boolean(pago.comprobanteUrl) && pago.estado !== EstadoPago.PAGADO;
  const matchMontoReportado = pago.notas?.match(/\(\$([0-9]+(?:\.[0-9]{1,2})?)\)/);
  const montoReportadoParsed = matchMontoReportado ? parseFloat(matchMontoReportado[1]) : null;
  const esAbonoReportado = Boolean(
    esPorConfirmar && montoReportadoParsed && montoReportadoParsed < saldoPendiente
  );
  const cornerSun = getPagoCornerSun(pago.estado, esPorConfirmar);

  return (
    <div
      key={pago.id}
      className={`group/pagocard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl border border-b-[3px] shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between ${
        esPorConfirmar
          ? "border-blue-300/90 border-b-blue-400/90 ring-2 ring-blue-500/10"
          : "border-slate-200/90 border-b-slate-300/90"
      }`}
    >
      {/* Sol decorativo en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
        <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/pagocard:scale-125`} />
      </div>

      {/* Contenido Interior de la Tarjeta */}
      <div className={`${compact ? "p-3.5 sm:p-4 space-y-2.5" : "p-5 sm:p-6 space-y-4"} relative z-10 flex-1 flex flex-col justify-between`}>
        {/* Fila 1: Estado a la izquierda y Espacio/Local a la derecha */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          {/* Badge de Estado */}
          {esPorConfirmar ? (
            <span className={`inline-flex items-center gap-1.5 ${compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"} font-black bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs shrink-0 rounded-lg`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Por Confirmar</span>
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 ${compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"} rounded-lg font-bold border shrink-0 ${
                pago.estado === EstadoPago.PAGADO
                  ? "bg-emerald-50 text-[#175E38] border-emerald-200/90"
                  : pago.estado === EstadoPago.VENCIDO
                  ? "bg-rose-50 text-[#CC1A22] border-rose-200/90"
                  : pago.estado === EstadoPago.PARCIAL
                  ? "bg-blue-50 text-blue-700 border-blue-200/90"
                  : "bg-amber-50 text-amber-700 border-amber-200/90"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  pago.estado === EstadoPago.PAGADO
                    ? "bg-[#175E38]"
                    : pago.estado === EstadoPago.VENCIDO
                    ? "bg-[#CC1A22]"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "bg-blue-600"
                    : "bg-amber-500"
                }`}
              />
              <span>
                {pago.estado === EstadoPago.PAGADO
                  ? "Pagado"
                  : pago.estado === EstadoPago.VENCIDO
                  ? "Vencido (Mora)"
                  : pago.estado === EstadoPago.PARCIAL
                  ? "Abono Parcial"
                  : "Por Cobrar"}
              </span>
            </span>
          )}

          {/* Identificador de Espacio / Local y Periodo */}
          <div className="flex items-center gap-1 shrink-0">
            {(pago.periodoMes !== undefined && pago.periodoAno !== undefined) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200/80">
                {MESES[pago.periodoMes - 1]} {pago.periodoAno}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 font-bold text-[11px] border border-slate-200/80 shrink-0 max-w-[110px]">
              <Store className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{unidad.codigo}</span>
            </span>
          </div>
        </div>

        {/* Fila 2: Identidad del Inquilino y Propiedad */}
        <div className="pt-0.5">
          <h3 className={`${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"} font-heading font-black text-slate-900 truncate tracking-tight`}>
            {inquilino.nombre} {inquilino.apellido || ""}
          </h3>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{unidad.propiedad.nombre}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 font-mono text-[10px] shrink-0">
              {inquilino.documentoIdentidad}
            </span>
          </p>
        </div>

        {/* Fila 3: Bloque de Contacto Directo y WhatsApp */}
        <div className={`flex items-center justify-between ${compact ? "px-2.5 py-1.5" : "px-3 py-2"} rounded-xl bg-slate-50/90 border border-slate-200/70 text-xs`}>
          <span className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate font-mono">{inquilino.telefono}</span>
          </span>
          <a
            href={urlWhatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors shrink-0 hover:scale-105 active:scale-95"
            title="Enviar recordatorio por WhatsApp"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Fila 4: Bloque Unificado de Servicios Públicos (Fase 27) */}
        {onGestionarServicios && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGestionarServicios(pago);
            }}
            className={`w-full grid grid-cols-2 gap-2 ${
              compact ? "p-1" : "p-1.5"
            } rounded-xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/70 hover:border-slate-300 transition-all cursor-pointer active:scale-[0.99] text-xs`}
            title="Clic para registrar o auditar solvencia de electricidad y agua"
          >
            {/* Badge Luz (Corpoelec) */}
            <span
              className={`inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold border transition-colors ${
                pago.luzSolvente
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
                  : "bg-amber-50 text-amber-800 border-amber-200/90"
              }`}
              title={pago.luzSolvente ? "Electricidad (Corpoelec): Al día" : "Electricidad (Corpoelec): Pendiente"}
            >
              <Zap
                className={`w-3.5 h-3.5 shrink-0 ${
                  pago.luzSolvente ? "text-emerald-600 fill-emerald-500" : "text-amber-500 fill-amber-400"
                }`}
              />
              <span>Luz</span>
              {pago.luzSolvente ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-600 stroke-[2.5] shrink-0" />
              )}
            </span>

            {/* Badge Agua (Azul Hidroandes) */}
            <span
              className={`inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold border transition-colors ${
                pago.aguaSolvente
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
                  : "bg-blue-50 text-blue-700 border-blue-200/90"
              }`}
              title={pago.aguaSolvente ? "Agua Potable: Al día" : "Agua Potable: Pendiente"}
            >
              <Droplets
                className={`w-3.5 h-3.5 shrink-0 ${
                  pago.aguaSolvente ? "text-emerald-600 fill-emerald-500" : "text-blue-500 fill-blue-400"
                }`}
              />
              <span>Agua</span>
              {pago.aguaSolvente ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-blue-600 stroke-[2.5] shrink-0" />
              )}
            </span>
          </button>
        )}

        {/* Fila de Comprobante Reportado */}
        {esPorConfirmar && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200/90 text-xs text-blue-900">
            <span className="flex items-center gap-1.5 font-bold truncate">
              <Receipt className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="truncate text-[11px]">
                {esAbonoReportado && montoReportadoParsed
                  ? `Abono: $${montoReportadoParsed.toFixed(2)} USD`
                  : "Comprobante reportado"}
              </span>
            </span>
            {pago.referencia && (
              <span className="font-mono font-bold text-blue-700 text-[10px] bg-blue-100/90 px-1.5 py-0.5 rounded-md truncate max-w-[110px]">
                Ref: {pago.referencia}
              </span>
            )}
          </div>
        )}

        {/* Fila 4: Bloque Financiero en 2 Cajas Métricas Estructuradas */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* Caja 1: Monto del Canon o Abonado */}
          <div
            className={`${compact ? "p-2.5" : "p-3 sm:p-3.5"} rounded-xl border flex flex-col justify-between ${
              pago.estado === EstadoPago.PAGADO
                ? "bg-emerald-50/70 border-emerald-200/80"
                : pago.estado === EstadoPago.PARCIAL
                ? "bg-blue-50/70 border-blue-200/80"
                : "bg-slate-50/90 border-slate-200/80"
            }`}
          >
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block truncate ${
                pago.estado === EstadoPago.PAGADO
                  ? "text-emerald-800"
                  : pago.estado === EstadoPago.PARCIAL
                  ? "text-blue-800"
                  : "text-slate-400"
              }`}
            >
              {pago.estado === EstadoPago.PAGADO
                ? "Canon Pagado"
                : pago.estado === EstadoPago.PARCIAL
                ? "Ya Abonado"
                : "Canon"}
            </span>
            <div className="mt-1 flex items-baseline truncate">
              <span
                className={`${compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"} font-black font-heading tracking-tight ${
                  pago.estado === EstadoPago.PAGADO
                    ? "text-[#175E38]"
                    : pago.estado === EstadoPago.PARCIAL
                    ? "text-blue-700"
                    : "text-slate-900"
                }`}
              >
                ${(pago.estado === EstadoPago.PAGADO || pago.estado === EstadoPago.PARCIAL ? pago.montoPagado : pago.montoEsperado).toFixed(2)}
              </span>
              {pago.estado === EstadoPago.PARCIAL ? (
                <span className="text-[9px] font-bold text-slate-400 ml-1 truncate">
                  / ${pago.montoEsperado.toFixed(2)}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 ml-1">USD</span>
              )}
            </div>
          </div>

          {/* Caja 2: Fecha de Vencimiento / Estado / Resta por pagar */}
          <div
            className={`${compact ? "p-2.5" : "p-3 sm:p-3.5"} rounded-xl border flex flex-col justify-between text-right ${
              pago.estado === EstadoPago.VENCIDO
                ? "bg-rose-50/70 border-rose-200/80"
                : pago.estado === EstadoPago.PAGADO
                ? "bg-emerald-50/40 border-emerald-200/60"
                : pago.estado === EstadoPago.PARCIAL
                ? "bg-amber-50/70 border-amber-200/80"
                : "bg-slate-50/90 border-slate-200/80"
            }`}
          >
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block truncate ${
                pago.estado === EstadoPago.VENCIDO
                  ? "text-[#CC1A22]"
                  : pago.estado === EstadoPago.PAGADO
                  ? "text-emerald-800"
                  : pago.estado === EstadoPago.PARCIAL
                  ? "text-amber-800"
                  : "text-slate-400"
              }`}
            >
              {pago.estado === EstadoPago.PAGADO
                ? "Estado"
                : pago.estado === EstadoPago.PARCIAL
                ? "Resta"
                : "Corte / Vence"}
            </span>
            <div className="mt-1 flex items-baseline justify-end truncate">
              {pago.estado === EstadoPago.PAGADO ? (
                <span className="inline-flex items-center justify-end gap-1 text-xs font-bold text-[#175E38]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Al día</span>
                </span>
              ) : pago.estado === EstadoPago.PARCIAL ? (
                <>
                  <span className={`${compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"} font-black font-heading tracking-tight text-amber-700`}>
                    ${saldoPendiente.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 ml-1">USD</span>
                </>
              ) : (
                <span
                  className={`inline-flex items-center justify-end gap-1 text-xs font-bold ${
                    pago.estado === EstadoPago.VENCIDO
                      ? "text-[#CC1A22]"
                      : "text-slate-700"
                  }`}
                >
                  {pago.estado === EstadoPago.VENCIDO ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#CC1A22] shrink-0" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{fechaVence}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Acciones (Grid 50/50 simétrico y obligatorio) */}
      <div className={`border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 ${compact ? "p-2.5 gap-2" : "p-3 sm:p-3.5 gap-2.5"} grid grid-cols-2 relative z-10`}>
        <button
          type="button"
          onClick={() => onVerFicha(pago.id)}
          disabled={isLoadingDetalle}
          className={`w-full ${compact ? "h-8.5 text-[11px]" : "h-10 text-xs"} px-2.5 rounded-xl font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-60`}
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Ver Ficha</span>
        </button>

        {pago.estado !== EstadoPago.PAGADO && pago.anteriorImpago ? (
          <div className="w-full relative group/lock">
            <button
              type="button"
              disabled
              className={`w-full ${compact ? "h-8.5 text-[11px]" : "h-10 text-xs"} px-2 rounded-xl font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-1.5 opacity-90 select-none transition-all`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Mes anterior pendiente</span>
            </button>
            <div className="hidden group-hover/lock:block absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] leading-snug rounded-xl shadow-xl text-center z-50 pointer-events-none">
              Por imputación contable secuencial, debes liquidar primero el canon de{" "}
              <strong className="text-emerald-400">
                {MESES[(pago.anteriorImpago.mes || 1) - 1]} {pago.anteriorImpago.ano}
              </strong>{" "}
              (Resta: ${pago.anteriorImpago.saldo.toFixed(2)} USD).
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (pago.estado === EstadoPago.PAGADO) {
                onVerRecibo(pago);
              } else {
                onRegistrarPago(pago.id);
              }
            }}
            disabled={isLoadingDetalle}
            className={`relative w-full ${compact ? "h-8.5 text-[11px]" : "h-10 text-xs"} px-2.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 ${
              pago.estado === EstadoPago.PAGADO
                ? "bg-indigo-600 hover:bg-indigo-700 border-b-[3px] border-b-indigo-800 shadow-[0_2px_8px_rgba(79,70,229,0.35)]"
                : esPorConfirmar
                ? "bg-blue-600 hover:bg-blue-700 border-b-[3px] border-b-blue-800 shadow-[0_2px_8px_rgba(37,99,235,0.35)]"
                : "bg-[#175E38] hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
            }`}
          >
            {esPorConfirmar && (
              <span
                className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-md border-2 border-white ring-1 ring-amber-600/30 pointer-events-none"
                title="Esta acción verifica el comprobante y envía correo al Inquilino"
              >
                <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
              </span>
            )}
            {pago.estado === EstadoPago.PAGADO ? (
              <>
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Recibo</span>
              </>
            ) : esPorConfirmar ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Confirmar Pago</span>
              </>
            ) : (
              <>
                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {pago.estado === EstadoPago.PARCIAL ? "Abonar" : "Registrar Pago"}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
