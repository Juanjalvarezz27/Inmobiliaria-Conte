"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FileText,
  User,
  Store,
  Calendar,
  Clock,
  ExternalLink,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Check,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EstadoContrato } from "@prisma/client";
import { formatCurrency, WhatsAppIcon, getWhatsAppUrl } from "@/lib/formatters";
import type { ContratoConRelaciones } from "./types";
import { ContratoDepositoSection } from "./detalle/ContratoDepositoSection";
import { ContratoPagosSection } from "./detalle/ContratoPagosSection";

interface ContratoDetalleModalProps {
  isOpen: boolean;
  contrato: ContratoConRelaciones | null;
  onClose: () => void;
  onEditar: () => void;
  onCambiarEstado: (id: string, nuevoEstado: EstadoContrato) => void;
  onFinalizarORescindir?: (contrato: ContratoConRelaciones, modo: "finalizar" | "rescindir") => void;
  onContratoActualizado?: (contrato: ContratoConRelaciones) => void;
  isPending?: boolean;
  isLoadingPagos?: boolean;
}

// Modal visor de detalles completos del contrato y documento firmado
export function ContratoDetalleModal({
  isOpen,
  contrato,
  onClose,
  onEditar,
  onCambiarEstado,
  onFinalizarORescindir,
  onContratoActualizado,
  isPending = false,
  isLoadingPagos = false,
}: ContratoDetalleModalProps) {
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);
  const menuEstadoRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de estados al hacer clic afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuEstadoRef.current && !menuEstadoRef.current.contains(e.target as Node)) {
        setMenuEstadoAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuEstadoAbierto(false);
    };
    if (menuEstadoAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuEstadoAbierto]);

  const estadoBadgeConfig = useMemo(() => {
    switch (contrato?.estado) {
      case EstadoContrato.ACTIVO:
        return { label: "Activo", badgeClass: "bg-emerald-100 text-[#124b2d] border-emerald-300" };
      case EstadoContrato.POR_VENCER:
        return { label: "Por Vencer", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" };
      case EstadoContrato.FINALIZADO:
        return { label: "Finalizado", badgeClass: "bg-slate-200 text-slate-800 border-slate-300" };
      case EstadoContrato.RESCINDIDO:
        return { label: "Rescindido", badgeClass: "bg-rose-100 text-rose-800 border-rose-300" };
      default:
        return { label: contrato?.estado || "", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  }, [contrato?.estado]);

  const pagos = contrato?.pagos;

  // Ordenar cronológicamente ascendente
  const pagosOrdenados = useMemo(() => {
    if (!pagos) return [];
    return [...pagos].sort((a, b) => {
      if (a.periodoAno !== b.periodoAno) return a.periodoAno - b.periodoAno;
      return a.periodoMes - b.periodoMes;
    });
  }, [pagos]);

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
      title="Ficha Integral del Contrato"
      subtitle={`${contrato.codigo} • ${contrato.inquilino.nombre} ${contrato.inquilino.apellido || ""}`}
      icon={FileText}
      maxWidth="3xl"
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Encabezado Principal de Resumen */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50/80 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  {contrato.codigo}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${estadoBadgeConfig.badgeClass}`}>
                  {estadoBadgeConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Registrado el {new Date(contrato.createdAt).toLocaleDateString("es-VE")}
              </p>
            </div>

            {/* Canon mensual destacado */}
            <div className="sm:text-right bg-emerald-50/60 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-emerald-100 sm:border-0">
              <span className="text-[10px] font-bold text-[#175E38] uppercase tracking-wider block">
                Canon Mensual
              </span>
              <span className="text-xl sm:text-2xl font-black font-heading text-slate-900 block leading-tight">
                {formatCurrency(contrato.montoAlquiler)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">USD / mes</span>
            </div>
          </div>
        </div>

        {/* Tarjetas de Inquilino y Espacio Alquilado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card Inquilino */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Inquilino Responsable</span>
              </h4>
              {contrato.inquilino.telefono && (
                <a
                  href={getWhatsAppUrl(contrato.inquilino.telefono)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Contactar por WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 font-heading">
                {contrato.inquilino.nombre} {contrato.inquilino.apellido || ""}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                C.I. / RIF: {contrato.inquilino.documentoIdentidad}
              </p>
              {contrato.inquilino.telefono && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Tel: {contrato.inquilino.telefono}
                </p>
              )}
              {contrato.inquilino.email && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Email: {contrato.inquilino.email}
                </p>
              )}
            </div>
          </div>

          {/* Card Inmueble y Unidad */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Inmueble / Unidad</span>
            </h4>
            <div>
              <p className="text-sm font-extrabold text-slate-900 font-heading">
                {contrato.unidad.propiedad.nombre}
              </p>
              <p className="text-xs font-bold text-[#175E38] mt-0.5">
                Unidad: {contrato.unidad.codigo}
                {contrato.unidad.piso && ` · Piso ${contrato.unidad.piso}`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Tipo: {contrato.unidad.tipo}
                {contrato.unidad.areaMt2 && ` · ${contrato.unidad.areaMt2} m²`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {contrato.unidad.propiedad.ciudad}
              </p>
            </div>
          </div>
        </div>

        {/* Vigencia y Plazos */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Vigencia y Términos Temporales</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha Inicio
              </span>
              <span className="font-black text-slate-800 text-xs sm:text-sm mt-0.5 block">
                {fInicio}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha Vencimiento
              </span>
              <span className="font-black text-slate-800 text-xs sm:text-sm mt-0.5 block">
                {fFin}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-100 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Día de Cobro
              </span>
              <span className="font-black text-slate-800 text-xs sm:text-sm mt-0.5 block">
                Día {contrato.diaCobro || 1} de cada mes
              </span>
            </div>
          </div>

          {/* Días restantes con barra indicadora */}
          {contrato.estado === EstadoContrato.ACTIVO && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 ${
                    diffDias <= 30 ? "text-amber-700" : "text-[#175E38]"
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Plazo restante
                </span>
              </div>
              <span
                className={`font-black font-heading text-xs px-2.5 py-0.5 rounded-lg border ${
                  diffDias <= 30
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-emerald-100 text-[#124b2d] border-emerald-300"
                }`}
              >
                {diffDias > 0 ? `${diffDias} días restantes` : "Vencimiento alcanzado"}
              </span>
            </div>
          )}
        </div>

        {/* Custodia y Trazabilidad del Depósito en Garantía */}
        <ContratoDepositoSection
          contrato={contrato}
          onFinalizarORescindir={onFinalizarORescindir}
          onContratoActualizado={onContratoActualizado}
        />

        {/* Historial y Cronograma de Mensualidades (Cobranza) */}
        <ContratoPagosSection
          pagosOrdenados={pagosOrdenados}
          isLoadingPagos={isLoadingPagos}
          onClose={onClose}
        />

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Menú de Cambio Rápido de Estado */}
          <div ref={menuEstadoRef} className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMenuEstadoAbierto(!menuEstadoAbierto)}
              disabled={isPending}
              className="w-full sm:w-auto h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100/80 text-slate-800 font-bold text-xs flex items-center justify-between sm:justify-start gap-2.5 transition-all cursor-pointer shadow-2xs active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
              title="Cambiar estado del contrato"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin shrink-0" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span className="whitespace-nowrap">Cambiar Estado</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${estadoBadgeConfig.badgeClass}`}>
                  {estadoBadgeConfig.label}
                </span>
              </div>
              <ChevronUp
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 sm:ml-1 ${
                  menuEstadoAbierto ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuEstadoAbierto && (
              <div className="absolute left-0 bottom-full mb-2 w-full sm:w-60 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-40 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Seleccionar nuevo estado
                </div>
                {[
                  { est: EstadoContrato.ACTIVO, label: "Activo / Vigente", icon: CheckCircle2, color: "text-emerald-700", bgHover: "hover:bg-emerald-50/70" },
                  { est: EstadoContrato.POR_VENCER, label: "Por Vencer", icon: AlertTriangle, color: "text-amber-700", bgHover: "hover:bg-amber-50/70" },
                  { est: EstadoContrato.FINALIZADO, label: "Finalizar Contrato", icon: XCircle, color: "text-slate-700", bgHover: "hover:bg-slate-100" },
                  { est: EstadoContrato.RESCINDIDO, label: "Rescindir Contrato", icon: XCircle, color: "text-rose-700", bgHover: "hover:bg-rose-50/70" },
                ].map(({ est, label, icon: Icon, color, bgHover }) => {
                  const esSeleccionado = contrato.estado === est;
                  return (
                    <button
                      key={est}
                      type="button"
                      onClick={() => {
                        setMenuEstadoAbierto(false);
                        if (est === EstadoContrato.FINALIZADO || est === EstadoContrato.RESCINDIDO) {
                          if (onFinalizarORescindir) {
                            onFinalizarORescindir(
                              contrato,
                              est === EstadoContrato.FINALIZADO ? "finalizar" : "rescindir"
                            );
                          } else {
                            onCambiarEstado(contrato.id, est);
                          }
                        } else {
                          onCambiarEstado(contrato.id, est);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${bgHover} ${color} ${
                        esSeleccionado ? "bg-slate-100/90 font-bold" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                      </div>
                      {esSeleccionado && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botones Cerrar y Editar Contrato */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto sm:min-w-[110px] h-11 px-4 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center active:translate-y-0.5 shadow-2xs"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={onEditar}
              className="w-full sm:w-auto sm:min-w-[160px] h-11 inline-flex items-center justify-center gap-1.5 px-4 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] rounded-xl hover:bg-[#124b2d] transition-all shadow-[0_2px_8px_rgba(23,94,56,0.25)] cursor-pointer active:translate-y-0.5"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
              <span>Editar Contrato</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
