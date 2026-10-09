"use client";

import React from "react";
import {
  FileText,
  User,
  Store,
  Pencil,
  Trash2,
  Archive,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EstadoContrato, EstadoDeposito } from "@prisma/client";
import {
  formatCurrency,
  WhatsAppIcon,
  getWhatsAppUrl,
} from "../propiedades/constants";
import type { ContratoConRelaciones } from "./types";

// Sol decorativo en esquina según el estado del contrato
const getContratoCornerSun = (estado: EstadoContrato) => {
  switch (estado) {
    case EstadoContrato.ACTIVO:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
    case EstadoContrato.POR_VENCER:
      return {
        glow: "bg-amber-500/20",
        ring: "bg-amber-500/[0.08] border-amber-400/25",
        sun: "from-amber-600/25 to-amber-400/5",
      };
    case EstadoContrato.RESCINDIDO:
      return {
        glow: "bg-rose-500/20",
        ring: "bg-rose-500/[0.08] border-rose-400/25",
        sun: "from-[#CC1A22]/25 to-rose-400/5",
      };
    case EstadoContrato.FINALIZADO:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    default:
      return {
        glow: "bg-slate-500/20",
        ring: "bg-slate-500/[0.08] border-slate-400/25",
        sun: "from-slate-600/25 to-slate-400/5",
      };
  }
};

interface ContratoCardProps {
  contrato: ContratoConRelaciones;
  isPending?: boolean;
  onVerDetalle: (c: ContratoConRelaciones) => void;
  onEditar: (c: ContratoConRelaciones) => void;
  onEliminarOArchivar: (c: ContratoConRelaciones) => void;
  onFinalizar: (c: ContratoConRelaciones) => void;
  onReactivar: (id: string, nuevoEstado: EstadoContrato) => void;
}

export function ContratoCard({
  contrato: c,
  isPending = false,
  onVerDetalle,
  onEditar,
  onEliminarOArchivar,
  onFinalizar,
  onReactivar,
}: ContratoCardProps) {
  const cornerSun = getContratoCornerSun(c.estado);
  const fFin = new Date(c.fechaFin).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const nombreInquilino = `${c.inquilino.nombre} ${c.inquilino.apellido ?? ""}`.trim();

  return (
    <div
      key={c.id}
      className="group/contractcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Sol decorativo en esquina */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
        <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
        <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
        <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/contractcard:scale-125`} />
      </div>

      <div className="p-5 sm:p-5.5 space-y-4 relative z-10 flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Header con Badge de Estado y Botones de Acción */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <Badge
              variant={
                c.estado === EstadoContrato.ACTIVO
                  ? "DISPONIBLE"
                  : c.estado === EstadoContrato.POR_VENCER
                  ? "OCUPADO"
                  : c.estado === EstadoContrato.FINALIZADO
                  ? "FINALIZADO"
                  : "RESCINDIDO"
              }
              dot
              size="sm"
            >
              {c.estado === EstadoContrato.ACTIVO
                ? "Activo"
                : c.estado === EstadoContrato.POR_VENCER
                ? "Por Vencer"
                : c.estado === EstadoContrato.FINALIZADO
                ? "Finalizado"
                : "Rescindido"}
            </Badge>

            {/* Botones rápidos Editar / Eliminar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Editar */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onEditar(c)}
                  disabled={isPending}
                  title="Editar contrato"
                  aria-label="Editar contrato"
                  className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                  <span>Editar</span>
                </div>
              </div>

              {/* Eliminar o Archivar / Rescindir */}
              <div className="relative group/btn">
                <button
                  type="button"
                  onClick={() => onEliminarOArchivar(c)}
                  disabled={isPending}
                  title={
                    (c._count?.pagos ?? 0) > 0
                      ? "Archivar / Rescindir contrato (preserva historial contable)"
                      : "Eliminar contrato"
                  }
                  aria-label={
                    (c._count?.pagos ?? 0) > 0
                      ? "Archivar o rescindir contrato"
                      : "Eliminar contrato"
                  }
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                    (c._count?.pagos ?? 0) > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900"
                      : "bg-rose-50 text-rose-600 border-rose-200/90 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800"
                  }`}
                >
                  {(c._count?.pagos ?? 0) > 0 ? (
                    <Archive className="w-3.5 h-3.5" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                  <span>
                    {(c._count?.pagos ?? 0) > 0 ? "Archivar / Rescindir" : "Eliminar"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Código de Contrato y Espacio Asignado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md inline-block tracking-wider">
                {c.codigo}
              </span>
              <span className="text-xs font-medium text-slate-400 capitalize">
                • {c.unidad.tipo.toLowerCase()}
              </span>
            </div>

            {/* Identificador del Espacio */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#175E38]/10 text-[#175E38] border border-[#175E38]/20 shadow-2xs">
                <Store className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                <span className="text-xs font-black font-heading tracking-wide">
                  Espacio {c.unidad.codigo}
                </span>
              </div>
              {c.unidad.piso && (
                <span className="text-xs text-slate-500 font-medium">
                  · Piso {c.unidad.piso}
                </span>
              )}
              {c.unidad.areaMt2 && (
                <span className="text-xs text-slate-500 font-medium">
                  · {c.unidad.areaMt2} m²
                </span>
              )}
            </div>
          </div>

          {/* Inquilino y WhatsApp */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-900 truncate">
                  {nombreInquilino}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                {c.inquilino.documentoIdentidad}
              </span>
            </div>

            <div className="pt-0.5">
              <a
                href={getWhatsAppUrl(c.inquilino.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                title="Contactar al inquilino"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950"
              >
                <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                <span className="underline decoration-emerald-300 underline-offset-2">
                  {c.inquilino.telefono}
                </span>
              </a>
            </div>
          </div>

          {/* Vigencia y Mensualidad */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Vencimiento */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Vencimiento
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-slate-800 font-bold text-xs sm:text-sm font-heading">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{fFin}</span>
              </div>
            </div>

            {/* Mensualidad Destacada */}
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-2.5 flex flex-col justify-between text-right">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                Mensualidad
              </span>
              <div className="mt-0.5">
                <span className="text-base sm:text-lg font-black text-[#175E38] font-heading tracking-tight">
                  {formatCurrency(c.montoAlquiler)}
                </span>
                <span className="text-[11px] font-bold text-emerald-700/80 ml-0.5">
                  /mes
                </span>
              </div>
            </div>
          </div>

          {/* Píldora de Depósito en Garantía */}
          {c.depositoGarantia && c.depositoGarantia > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                <span className="truncate">Depósito:</span>
                <strong className="text-slate-900 shrink-0">{formatCurrency(c.depositoGarantia)}</strong>
              </div>
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0 ${
                  c.depositoEstado === EstadoDeposito.COBRADO
                    ? "bg-emerald-100 text-emerald-800"
                    : c.depositoEstado === EstadoDeposito.PENDIENTE
                    ? "bg-amber-100 text-amber-800"
                    : c.depositoEstado === EstadoDeposito.REEMBOLSADO
                    ? "bg-blue-100 text-blue-800"
                    : c.depositoEstado === EstadoDeposito.RETENIDO
                    ? "bg-rose-100 text-rose-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {c.depositoEstado === EstadoDeposito.COBRADO
                  ? "En Custodia"
                  : c.depositoEstado === EstadoDeposito.PENDIENTE
                  ? "Por Cobrar"
                  : c.depositoEstado === EstadoDeposito.REEMBOLSADO
                  ? "Reembolsado"
                  : c.depositoEstado === EstadoDeposito.RETENIDO
                  ? "Retenido"
                  : "Liq. Parcial"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer 50/50: Ver Contrato y Cambiar Estado */}
      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
        <button
          type="button"
          onClick={() => onVerDetalle(c)}
          className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
          title="Ver detalles completos del contrato"
        >
          <FileText className="w-3.5 h-3.5 text-slate-200 shrink-0" />
          <span className="truncate">Ver Contrato</span>
        </button>

        {c.estado === EstadoContrato.ACTIVO || c.estado === EstadoContrato.POR_VENCER ? (
          <button
            type="button"
            onClick={() => onFinalizar(c)}
            className="w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-2xs"
            title="Finalizar contrato y liberar espacio"
          >
            <span className="truncate">Finalizar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReactivar(c.id, EstadoContrato.ACTIVO)}
            className="w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 bg-[#175E38] text-white hover:bg-[#124b2d] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
            title="Reactivar contrato"
          >
            <span className="truncate">Reactivar</span>
          </button>
        )}
      </div>
    </div>
  );
}
