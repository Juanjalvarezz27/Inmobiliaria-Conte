"use client";

import React from "react";
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Pencil,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  UserCheck,
  Eye,
} from "lucide-react";
import { TipoTransaccionFinanciera } from "@prisma/client";
import type { TransaccionFinancieraItem } from "./types";
import {
  CATEGORIA_CONFIG,
  METODO_PAGO_CONFIG,
  formatearMontoUSD,
} from "./constants";

interface TransaccionCardProps {
  transaccion: TransaccionFinancieraItem;
  onEditar: (item: TransaccionFinancieraItem) => void;
  onEliminar: (item: TransaccionFinancieraItem) => void;
  onVerComprobante: (url: string, titulo: string) => void;
}

export function TransaccionCard({
  transaccion,
  onEditar,
  onEliminar,
  onVerComprobante,
}: TransaccionCardProps) {
  const esEgreso = transaccion.tipo === TipoTransaccionFinanciera.EGRESO;
  const catConfig = CATEGORIA_CONFIG[transaccion.categoria] || CATEGORIA_CONFIG.OTRO;
  const IconoCategoria = catConfig.icon;
  const metodoConfig = METODO_PAGO_CONFIG[transaccion.metodoPago] || METODO_PAGO_CONFIG.EFECTIVO_USD;

  // Formatear fecha legible
  const fechaObj = new Date(transaccion.fecha);
  const fechaFormateada = fechaObj.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="group bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      {/* Efecto Sol / Resplandor Ambiental en Esquina Superior Izquierda */}
      <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
            esEgreso ? "bg-rose-500/15" : "bg-emerald-500/15"
          }`}
        />
        <div
          className={`absolute inset-2 rounded-full border transition-all duration-500 ${
            esEgreso
              ? "border-rose-400/25 bg-rose-500/[0.04]"
              : "border-emerald-400/25 bg-emerald-500/[0.04]"
          }`}
        />
        <div
          className={`absolute inset-4 rounded-full bg-gradient-to-br to-transparent transition-transform duration-500 group-hover:scale-125 ${
            esEgreso ? "from-rose-500/20" : "from-emerald-500/20"
          }`}
        />
      </div>

      {/* Contenido Superior */}
      <div className="p-4 sm:p-5 relative z-10 space-y-3.5">
        {/* Cabecera: Badge de Tipo/Categoría y Botones de Acción */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                esEgreso
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-[#175E38] border-emerald-200"
              }`}
            >
              {esEgreso ? (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              )}
              {esEgreso ? "Gasto Operativo" : "Ingreso Extra"}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${catConfig.colorBadge}`}
            >
              <IconoCategoria className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[130px]">{catConfig.label}</span>
            </span>
          </div>

          {/* Botones de acción rápida: Editar y Eliminar */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEditar(transaccion)}
              className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              title="Editar movimiento"
              aria-label="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEliminar(transaccion)}
              className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              title="Eliminar movimiento"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Monto principal en tipografía destacada */}
        <div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-2xl sm:text-3xl font-black font-heading tracking-tight ${
                esEgreso ? "text-slate-900" : "text-[#175E38]"
              }`}
            >
              {esEgreso ? "-" : "+"} {formatearMontoUSD(transaccion.monto)}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mt-1 leading-snug">
            {transaccion.concepto}
          </h3>
        </div>

        {/* Datos clave: Centro de costo (Propiedad) y Beneficiario */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
          {/* Propiedad / Centro de costo */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">
              {transaccion.propiedad ? (
                <>
                  <span className="font-semibold text-slate-800">
                    {transaccion.propiedad.nombre}
                  </span>
                  {transaccion.unidad && (
                    <span className="text-slate-500"> • {transaccion.unidad.codigo}</span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 italic">Inmobiliaria General (Corporativo)</span>
              )}
            </span>
          </div>

          {/* Beneficiario / Proveedor */}
          {transaccion.beneficiario && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                <span className="text-slate-400">Para:</span>{" "}
                <span className="font-semibold text-slate-700">
                  {transaccion.beneficiario}
                </span>
              </span>
            </div>
          )}

          {/* Fecha y Método de pago */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{fechaFormateada}</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-600">{metodoConfig.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Acciones (Grid 50/50 de 2 Columnas Obligatorio) */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
        {transaccion.comprobanteUrl ? (
          <button
            onClick={() =>
              onVerComprobante(
                transaccion.comprobanteUrl!,
                `${transaccion.concepto} - ${formatearMontoUSD(transaccion.monto)}`
              )
            }
            className="w-full h-10 px-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
            title="Ver soporte digital"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ver Factura</span>
          </button>
        ) : (
          <div className="w-full h-10 px-2.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100/80 border border-slate-200/60 flex items-center justify-center gap-1 select-none">
            <FileText className="w-3.5 h-3.5 shrink-0 opacity-50" />
            <span className="truncate">Sin Factura</span>
          </div>
        )}

        <button
          onClick={() => onEditar(transaccion)}
          className="w-full h-10 px-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
        >
          <Pencil className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span className="truncate">Editar</span>
        </button>
      </div>
    </div>
  );
}
