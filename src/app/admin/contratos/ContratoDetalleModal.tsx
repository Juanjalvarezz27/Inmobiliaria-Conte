"use client";

import React, { useState } from "react";
import {
  FileText,
  User,
  Store,
  Calendar,
  ExternalLink,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EstadoContrato } from "@prisma/client";
import { formatCurrency, WhatsAppIcon, getWhatsAppUrl } from "../propiedades/constants";
import type { ContratoConRelaciones } from "./types";

interface ContratoDetalleModalProps {
  isOpen: boolean;
  contrato: ContratoConRelaciones | null;
  onClose: () => void;
  onEditar: () => void;
  onCambiarEstado: (id: string, nuevoEstado: EstadoContrato) => void;
  isPending?: boolean;
}

// Modal visor de detalles completos del contrato y documento firmado
export function ContratoDetalleModal({
  isOpen,
  contrato,
  onClose,
  onEditar,
  onCambiarEstado,
  isPending = false,
}: ContratoDetalleModalProps) {
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);

  if (!contrato) return null;

  const fInicio = new Date(contrato.fechaInicio).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const fFin = new Date(contrato.fechaFin).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Cálculo de días restantes
  const hoy = new Date();
  const finDate = new Date(contrato.fechaFin);
  const diffTime = finDate.getTime() - hoy.getTime();
  const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contrato: ${contrato.codigo}`}
      subtitle={`${contrato.unidad.codigo} · ${contrato.unidad.propiedad.nombre}`}
      icon={FileText}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Métricas Principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Canon Mensual */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Canon Mensual
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(contrato.montoAlquiler)}
            </p>
          </div>

          {/* Depósito en Garantía */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Depósito Garantía
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              {formatCurrency(contrato.depositoGarantia)}
            </p>
          </div>

          {/* Día de Corte */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Día de Cobro
            </span>
            <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
              Día {contrato.diaCobro}
            </p>
          </div>

          {/* Estado del Contrato */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estado
            </span>
            <div className="mt-1">
              <Badge
                variant={
                  contrato.estado === EstadoContrato.ACTIVO
                    ? "DISPONIBLE"
                    : contrato.estado === EstadoContrato.POR_VENCER
                    ? "OCUPADO"
                    : "INACTIVO"
                }
                dot
                size="sm"
              >
                {contrato.estado === EstadoContrato.ACTIVO
                  ? "Activo / Vigente"
                  : contrato.estado === EstadoContrato.POR_VENCER
                  ? "Por Vencer"
                  : contrato.estado === EstadoContrato.FINALIZADO
                  ? "Finalizado"
                  : "Rescindido"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sección: Partes y Ubicación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Ficha Inquilino */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Arrendatario</span>
            </h4>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {contrato.inquilino.nombre} {contrato.inquilino.apellido ?? ""}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Doc: <span className="font-semibold text-slate-700">{contrato.inquilino.documentoIdentidad}</span>
              </p>
            </div>
            <div className="pt-1">
              <a
                href={getWhatsAppUrl(contrato.inquilino.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="underline decoration-emerald-300 underline-offset-2">
                  {contrato.inquilino.telefono}
                </span>
              </a>
            </div>
          </div>

          {/* Ficha Inmueble y Espacio */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span>Espacio Arrendado</span>
            </h4>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {contrato.unidad.codigo}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {contrato.unidad.propiedad.nombre} · {contrato.unidad.propiedad.ciudad}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {contrato.unidad.propiedad.direccion}
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Vigencia y Plazos */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Vigencia del Contrato</span>
            </h4>
            {contrato.estado === EstadoContrato.ACTIVO && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] shrink-0 ${
                  diffDias <= 30
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {diffDias > 0 ? `${diffDias} días restantes` : "Vencimiento alcanzado"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha de Inicio
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading block mt-0.5">
                {fInicio}
              </span>
            </div>

            <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha de Vencimiento
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading block mt-0.5">
                {fFin}
              </span>
            </div>
          </div>
        </div>

        {/* Documento PDF Firmado */}
        {contrato.documentoUrl ? (
          <div className="p-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 via-white to-slate-50/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#175E38]/10 text-[#175E38] border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading">
                  Copia Digital del Contrato Firmado (PDF)
                </p>
              </div>
            </div>

            <a
              href={contrato.documentoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer whitespace-nowrap active:translate-y-0.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ver Documento</span>
            </a>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <p className="text-xs text-slate-500">
              No se ha subido una copia escaneada o digital de este contrato firmado.
            </p>
          </div>
        )}

        {/* Observaciones / Notas */}
        {contrato.notas && (
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observaciones y Cláusulas
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {contrato.notas}
            </p>
          </div>
        )}

        {/* Pie de Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Menú de Cambio Rápido de Estado */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuEstadoAbierto(!menuEstadoAbierto)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Cambiar Estado: {contrato.estado}</span>
            </button>

            {menuEstadoAbierto && (
              <div className="absolute left-0 bottom-full mb-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 space-y-0.5">
                {[
                  { est: EstadoContrato.ACTIVO, label: "Activo / Vigente", icon: CheckCircle2, color: "text-emerald-700" },
                  { est: EstadoContrato.POR_VENCER, label: "Por Vencer", icon: AlertTriangle, color: "text-amber-700" },
                  { est: EstadoContrato.FINALIZADO, label: "Finalizar Contrato", icon: XCircle, color: "text-slate-700" },
                  { est: EstadoContrato.RESCINDIDO, label: "Rescindir Contrato", icon: XCircle, color: "text-rose-700" },
                ].map(({ est, label, icon: Icon, color }) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => {
                      onCambiarEstado(contrato.id, est);
                      setMenuEstadoAbierto(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center justify-between cursor-pointer ${color}`}
                  >
                    <span>{label}</span>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={onEditar}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#175E38] rounded-xl hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar Contrato</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
