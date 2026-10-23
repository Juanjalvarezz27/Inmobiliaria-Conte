"use client";

import React from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { EstadoPago } from "@prisma/client";
import { NOMBRES_MESES } from "@/lib/date-utils";
import type { ContratoConRelaciones } from "../types";

interface ContratoPagosSectionProps {
  pagosOrdenados?: ContratoConRelaciones["pagos"];
  isLoadingPagos?: boolean;
  onClose: () => void;
}

export function ContratoPagosSection({
  pagosOrdenados = [],
  isLoadingPagos = false,
  onClose,
}: ContratoPagosSectionProps) {
  const listaPagos = pagosOrdenados || [];
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
          <CircleDollarSign className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">Cronograma y Mensualidades del Contrato</span>
        </h4>
        <Link
          href="/admin/cobranza"
          onClick={onClose}
          className="text-[11px] font-bold text-[#175E38] hover:text-[#124b2d] flex items-center gap-1 shrink-0 transition-colors"
        >
          <span>Ver cobranza</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoadingPagos ? (
        <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#175E38]" />
          <span>Cargando historial de pagos...</span>
        </div>
      ) : listaPagos.length > 0 ? (
        <div className="space-y-2">
          {listaPagos.map((p) => {
            const nombreMes = NOMBRES_MESES[p.periodoMes] || `Mes ${p.periodoMes}`;
            const hoy = new Date();
            const mesActual = hoy.getMonth() + 1;
            const anoActual = hoy.getFullYear();
            const esFuturo =
              p.periodoAno > anoActual || (p.periodoAno === anoActual && p.periodoMes > mesActual);

            const fPago = p.fechaPago
              ? new Date(p.fechaPago).toLocaleDateString("es-VE", {
                  day: "2-digit",
                  month: "short",
                })
              : null;

            return (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {nombreMes} {p.periodoAno}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {p.estado === EstadoPago.PAGADO && fPago ? (
                        <span className="text-emerald-700 font-medium">
                          {esFuturo ? `Pagado anticipado el ${fPago}` : `Pagado el ${fPago}`}
                        </span>
                      ) : p.estado === EstadoPago.VENCIDO ? (
                        <span className="text-rose-600 font-medium">Vencido en mora</span>
                      ) : p.estado === EstadoPago.PARCIAL ? (
                        <span className="text-blue-700 font-medium">Abono parcial registrado</span>
                      ) : esFuturo ? (
                        <span className="text-slate-500 font-medium">Próximo período programado</span>
                      ) : (
                        <span>Por cobrar</span>
                      )}
                      {p.referencia && ` · Ref: ${p.referencia}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-200/60">
                  <div className="text-right">
                    <span className="text-xs font-black font-heading text-slate-900">
                      ${(p.estado === EstadoPago.PAGADO ? p.montoPagado : p.montoEsperado).toFixed(2)}{" "}
                      <span className="text-[10px] font-semibold text-slate-400">USD</span>
                    </span>
                    {p.estado === EstadoPago.PARCIAL && (
                      <span className="block text-[10px] text-blue-700 font-semibold">
                        Abonado: ${p.montoPagado.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Badge de Estado */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${
                      p.estado === EstadoPago.PAGADO
                        ? "bg-emerald-50 text-[#175E38] border-emerald-200/90"
                        : p.estado === EstadoPago.VENCIDO
                        ? "bg-rose-50 text-[#CC1A22] border-rose-200/90"
                        : p.estado === EstadoPago.PARCIAL
                        ? "bg-blue-50 text-blue-700 border-blue-200/90"
                        : esFuturo
                        ? "bg-slate-100 text-slate-600 border-slate-200/90"
                        : "bg-amber-50 text-amber-700 border-amber-200/90"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.estado === EstadoPago.PAGADO
                          ? "bg-[#175E38]"
                          : p.estado === EstadoPago.VENCIDO
                          ? "bg-[#CC1A22]"
                          : p.estado === EstadoPago.PARCIAL
                          ? "bg-blue-600"
                          : esFuturo
                          ? "bg-slate-400"
                          : "bg-amber-500"
                      }`}
                    />
                    <span>
                      {p.estado === EstadoPago.PAGADO
                        ? esFuturo
                          ? "Adelantado"
                          : "Pagado"
                        : p.estado === EstadoPago.VENCIDO
                        ? "En Mora"
                        : p.estado === EstadoPago.PARCIAL
                        ? "Parcial"
                        : esFuturo
                        ? "Programado"
                        : "Pendiente"}
                    </span>
                  </span>

                  {p.comprobanteUrl && (
                    <a
                      href={p.comprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
                      title="Ver comprobante adjunto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400">
          Aún no hay mensualidades generadas para este contrato.
        </div>
      )}
    </div>
  );
}
