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
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { EstadoPago } from "@prisma/client";
import type { PagoItem } from "./types";

// Estilo del sol decorativo en esquina según el estado del cobro
const getPagoCornerSun = (estado: EstadoPago) => {
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
  onVerFicha: (pagoId: string) => void;
  onRegistrarPago: (pagoId: string) => void;
  onVerRecibo: (pago: PagoItem) => void;
}

export function PagoCard({
  pago,
  nombreMesActual,
  ano,
  isLoadingDetalle = false,
  onVerFicha,
  onRegistrarPago,
  onVerRecibo,
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
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le escribimos para recordarle que el pago de la mensualidad ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} se encuentra vencido desde el día de corte. Agradecemos coordinar la cancelación a la brevedad.`;
  } else {
    mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le recordamos que la mensualidad ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} vence próximamente. Quedamos a su orden para recibir el comprobante.`;
  }
  const urlWhatsapp = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeWp)}`;
  const cornerSun = getPagoCornerSun(pago.estado);

  return (
    <div
      key={pago.id}
      className="group/pagocard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Sol decorativo en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
        <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/pagocard:scale-125`} />
      </div>

      {/* Contenido Interior de la Tarjeta */}
      <div className="p-5 sm:p-6 relative z-10 space-y-4 flex-1 flex flex-col justify-between">
        {/* Fila 1: Estado a la izquierda y Espacio/Local a la derecha */}
        <div className="flex items-center justify-between gap-2">
          {/* Badge de Estado */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shrink-0 ${
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

          {/* Identificador de Espacio / Local */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 text-slate-700 font-bold text-xs border border-slate-200/80 shrink-0 max-w-[130px]">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{unidad.codigo}</span>
          </span>
        </div>

        {/* Fila 2: Identidad del Inquilino y Propiedad */}
        <div className="pt-0.5">
          <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 truncate tracking-tight">
            {inquilino.nombre} {inquilino.apellido || ""}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{unidad.propiedad.nombre}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 font-mono text-[11px] shrink-0">
              {inquilino.documentoIdentidad}
            </span>
          </p>
        </div>

        {/* Fila 3: Bloque de Contacto Directo y WhatsApp */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/70 text-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-mono">{inquilino.telefono}</span>
          </span>
          <a
            href={urlWhatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors shrink-0 hover:scale-105 active:scale-95"
            title="Enviar recordatorio por WhatsApp"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Fila 4: Bloque Financiero en 2 Cajas Métricas Estructuradas */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Caja 1: Monto de la Mensualidad o Abonado */}
          <div
            className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between ${
              pago.estado === EstadoPago.PAGADO
                ? "bg-emerald-50/70 border-emerald-200/80"
                : pago.estado === EstadoPago.PARCIAL
                ? "bg-blue-50/70 border-blue-200/80"
                : "bg-slate-50/90 border-slate-200/80"
            }`}
          >
            <span
              className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate ${
                pago.estado === EstadoPago.PAGADO
                  ? "text-emerald-800"
                  : pago.estado === EstadoPago.PARCIAL
                  ? "text-blue-800"
                  : "text-slate-400"
              }`}
            >
              {pago.estado === EstadoPago.PAGADO
                ? "Mensualidad Pagada"
                : pago.estado === EstadoPago.PARCIAL
                ? "Ya Abonado"
                : "Mensualidad"}
            </span>
            <div className="mt-1.5 flex items-baseline truncate">
              <span
                className={`text-lg sm:text-xl font-black font-heading tracking-tight ${
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
                <span className="text-[10px] font-bold text-slate-400 ml-1 truncate">
                  / ${pago.montoEsperado.toFixed(2)}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 ml-1">USD</span>
              )}
            </div>
          </div>

          {/* Caja 2: Fecha de Vencimiento / Estado / Resta por pagar */}
          <div
            className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between text-right ${
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
              className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate ${
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
            <div className="mt-1.5 flex items-baseline justify-end truncate">
              {pago.estado === EstadoPago.PAGADO ? (
                <span className="inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-bold text-[#175E38]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Al día</span>
                </span>
              ) : pago.estado === EstadoPago.PARCIAL ? (
                <>
                  <span className="text-lg sm:text-xl font-black font-heading tracking-tight text-amber-700">
                    ${saldoPendiente.toFixed(2)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">USD</span>
                </>
              ) : (
                <span
                  className={`inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-bold ${
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
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2.5 relative z-10">
        <button
          type="button"
          onClick={() => onVerFicha(pago.id)}
          disabled={isLoadingDetalle}
          className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-60"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Ver Ficha</span>
        </button>

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
          className={`w-full h-10 px-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 ${
            pago.estado === EstadoPago.PAGADO
              ? "bg-indigo-600 hover:bg-indigo-700 border-b-[3px] border-b-indigo-800 shadow-[0_2px_8px_rgba(79,70,229,0.35)]"
              : "bg-[#175E38] hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
          }`}
        >
          {pago.estado === EstadoPago.PAGADO ? (
            <>
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Recibo</span>
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
      </div>
    </div>
  );
}
