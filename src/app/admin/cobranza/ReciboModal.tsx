"use client";

import React from "react";
import Link from "next/link";
import {
  Receipt,
  Sparkles,
  FileText,
  ArrowRight,
  Building2,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  MapPin,
  FileCheck2,
  Hash,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { WhatsAppIcon, getWhatsAppUrl } from "@/app/admin/propiedades/constants";
import { MetodoPago } from "@prisma/client";
import type { PagoItem } from "./types";

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
  if (!pago) return null;

  const contrato = pago.contrato;
  const inquilino = contrato.inquilino;
  const unidad = contrato.unidad;
  const propiedad = unidad.propiedad;

  const nombreMes = NOMBRES_MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
  const periodoTexto = `${nombreMes} ${pago.periodoAno}`;

  const fechaPagoStr = pago.fechaPago
    ? new Date(pago.fechaPago).toLocaleDateString("es-VE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Fecha no registrada";

  const inquilinoNombreCompleto = inquilino.apellido
    ? `${inquilino.nombre} ${inquilino.apellido}`
    : inquilino.nombre;

  const documentoInquilino = inquilino.documentoIdentidad || null;

  const numeroReciboPreliminar = `REC-${pago.periodoAno}${String(pago.periodoMes).padStart(2, "0")}-${contrato.codigo}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recibo de Cobranza"
      subtitle={`Comprobante digital • ${numeroReciboPreliminar}`}
      icon={Receipt}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="p-4 sm:p-6 space-y-5">
        {/* Banner de Próxima Integración con el Módulo de Facturación */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-white p-4 sm:p-5 shadow-xs">
          {/* Resplandor ambiental de fondo */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 sm:gap-4 relative z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(79,70,229,0.35)]">
              <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
                  Próxima Integración
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Módulo de Facturación & Recibos
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 leading-snug">
                Emisión de Comprobantes Oficiales en Camino
              </h3>

              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Próximamente, al presionar este botón se conectará directamente con el{" "}
                <strong className="text-slate-800">Módulo de Facturación y Recibos</strong>, permitiendo emitir recibos membretados oficiales con formato institucional de Inmobiliaria Conté, descarga en PDF y envío automático por correo electrónico al arrendatario.
              </p>

              <div className="mt-3.5 pt-3 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Puedes explorar las capacidades del módulo en desarrollo:
                </span>
                <Link
                  href="/admin/facturacion"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Módulo de Facturación</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen del Recibo Operativo Asentado */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Cabecera del Comprobante */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Comprobante de Cobranza
              </p>
              <h4 className="text-base sm:text-lg font-black font-heading text-slate-900 flex items-center gap-2">
                <span>{numeroReciboPreliminar}</span>
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pagado y Solvente
              </span>
            </div>
          </div>

          {/* Importe Principal */}
          <div className="bg-gradient-to-r from-emerald-50/70 via-slate-50 to-white rounded-xl border border-emerald-200/70 p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Monto Cancelado
              </p>
              <p className="text-2xl sm:text-3xl font-black font-heading text-emerald-900">
                ${pago.montoPagado.toFixed(2)}{" "}
                <span className="text-xs font-bold text-emerald-700 uppercase">
                  {contrato.moneda || "USD"}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Período Correspondiente
              </p>
              <p className="text-sm font-bold text-slate-800 flex items-center justify-end gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-[#175E38]" />
                {periodoTexto}
              </p>
            </div>
          </div>

          {/* Datos Estructurados del Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* Arrendatario */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>Arrendatario / Inquilino</span>
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">
                {inquilinoNombreCompleto}
              </p>
              {documentoInquilino && (
                <p className="text-xs text-slate-500">
                  Doc: <span className="font-semibold text-slate-700">{documentoInquilino}</span>
                </p>
              )}
              {inquilino.telefono && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={getWhatsAppUrl(inquilino.telefono)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 transition-all"
                  >
                    <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                  <span className="text-[11px] text-slate-500">{inquilino.telefono}</span>
                </div>
              )}
            </div>

            {/* Inmueble y Espacio */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Inmueble y Espacio</span>
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">
                {propiedad.nombre}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Espacio {unidad.codigo}</span>
                {propiedad.ciudad && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-slate-500">
                      <MapPin className="w-3 h-3" /> {propiedad.ciudad}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Contrato: <span className="font-semibold text-slate-700">{contrato.codigo}</span>
              </p>
            </div>

            {/* Fecha y Método */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                <span>Transacción y Método</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                Método:{" "}
                <span className="text-slate-900 font-bold">
                  {pago.metodoPago ? METODO_LABELS[pago.metodoPago] : "Efectivo / No especificado"}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Fecha asentada:{" "}
                <span className="font-medium text-slate-700">{fechaPagoStr}</span>
              </p>
            </div>

            {/* Referencia Bancaria */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                <Hash className="w-3.5 h-3.5 text-slate-600" />
                <span>Referencia Bancaria</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-800">
                {pago.referencia ? `#${pago.referencia}` : "Sin referencia bancaria"}
              </p>
              {pago.comprobanteUrl ? (
                <a
                  href={pago.comprobanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-800 underline mt-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver comprobante adjunto</span>
                </a>
              ) : (
                <p className="text-[11px] text-slate-400">Sin archivo adjunto</p>
              )}
            </div>
          </div>

          {/* Desglose de Abonos Registrados si existen en el libro mayor */}
          {pago.transacciones && pago.transacciones.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Desglose de Transacciones en el Libro Mayor ({pago.transacciones.length})
              </span>
              <div className="space-y-1.5">
                {pago.transacciones.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">
                        {new Date(tx.fechaPago).toLocaleDateString("es-VE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 font-medium">
                        {METODO_LABELS[tx.metodoPago] || "Método"}
                      </span>
                      {tx.referencia && (
                        <span className="font-mono text-[11px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          Ref: #{tx.referencia}
                        </span>
                      )}
                    </div>
                    <span className="font-black font-heading text-emerald-800 self-end sm:self-auto">
                      +${tx.monto.toFixed(2)} USD
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas u Observaciones si existen */}
          {pago.notas && (
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Notas de cobranza: </span>
              {pago.notas}
            </div>
          )}
        </div>

        {/* Footer de Acciones del Modal */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 h-10 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all cursor-pointer shadow-xs active:translate-y-0.5"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
