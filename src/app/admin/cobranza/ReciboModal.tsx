"use client";

import React, { useState } from "react";
import {
  Receipt,
  Building2,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  MapPin,
  Hash,
  ZoomIn,
} from "lucide-react";
import { Modal, ImageViewerModal } from "@/components/ui";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
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
  const [visorImagenAbierto, setVisorImagenAbierto] = useState(false);

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

  // Mensaje oficial y enlace de WhatsApp para compartir el recibo
  const telLimpio = inquilino.telefono ? inquilino.telefono.replace(/[^0-9]/g, "") : "";
  const mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le compartimos su comprobante de pago digital (${numeroReciboPreliminar}) por un monto de $${pago.montoPagado.toFixed(2)} USD correspondiente a la mensualidad de ${periodoTexto} del espacio ${unidad.codigo} en ${propiedad.nombre}. ¡Muchas gracias por su puntualidad!`;
  const urlWhatsapp = telLimpio ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeWp)}` : "";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Recibo de Cobranza"
        subtitle={`Comprobante digital • ${numeroReciboPreliminar}`}
        icon={Receipt}
        headerVariant="green"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Tarjeta del Recibo Operativo Asentado */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3.5">
            {/* Cabecera del Comprobante */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Comprobante Oficial
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5">
                  {numeroReciboPreliminar}
                </span>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pagado y Solvente</span>
                </span>
              </div>
            </div>

            {/* Importe Principal */}
            <div className="bg-gradient-to-r from-emerald-50/80 via-slate-50 to-white rounded-xl border border-emerald-200/80 p-3 sm:p-4 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Monto Cancelado
                </span>
                <p className="text-2xl sm:text-3xl font-black font-heading text-emerald-900 mt-0.5">
                  ${pago.montoPagado.toFixed(2)}{" "}
                  <span className="text-xs font-bold text-emerald-700 uppercase">
                    {contrato.moneda || "USD"}
                  </span>
                </p>
              </div>

              <div className="xs:text-right">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Período
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center xs:justify-end gap-1.5 mt-0.5 font-heading">
                  <Calendar className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                  <span>{periodoTexto}</span>
                </p>
              </div>
            </div>

            {/* Datos Estructurados del Pago (2 columnas en escritorio / 1 en móvil) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 pt-0.5">
              {/* Arrendatario */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                    <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Inquilino Titular</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-1">
                    {inquilinoNombreCompleto}
                  </p>
                  {documentoInquilino && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Doc: <span className="font-semibold text-slate-700">{documentoInquilino}</span>
                    </p>
                  )}
                </div>

                {inquilino.telefono && (
                  <div className="pt-1.5">
                    <a
                      href={urlWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-all shadow-2xs active:scale-95"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                      <span>{inquilino.telefono}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Inmueble y Espacio */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Inmueble y Espacio</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-1">
                  {propiedad.nombre}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                  <span className="font-semibold text-slate-800">Espacio {unidad.codigo}</span>
                  {propiedad.ciudad && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-slate-500 text-[11px]">
                        <MapPin className="w-3 h-3 shrink-0" /> {propiedad.ciudad}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Contrato: <span className="font-semibold text-slate-700">{contrato.codigo}</span>
                </p>
              </div>

              {/* Transacción y Método */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Transacción y Método</span>
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-1">
                  Método:{" "}
                  <span className="text-slate-900 font-bold">
                    {pago.metodoPago ? METODO_LABELS[pago.metodoPago] : "Efectivo / No especificado"}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Fecha: <span className="font-medium text-slate-700">{fechaPagoStr}</span>
                </p>
              </div>

              {/* Referencia Bancaria */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                    <Hash className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Referencia Bancaria</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                    {pago.referencia ? `#${pago.referencia}` : "Sin referencia"}
                  </p>
                </div>

                {pago.comprobanteUrl && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setVisorImagenAbierto(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#175E38] hover:text-[#124b2d] bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Ver Comprobante</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Desglose de Abonos Registrados si existen en el libro mayor */}
            {pago.transacciones && pago.transacciones.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Desglose de Abonos Registrados ({pago.transacciones.length})
                </span>
                <div className="space-y-1.5">
                  {pago.transacciones.map((tx, idx) => (
                    <div
                      key={tx.id}
                      className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded-md bg-[#175E38] text-white font-black text-[10px] flex items-center justify-center shrink-0">
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
                          <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            #{tx.referencia}
                          </span>
                        )}
                      </div>
                      <span className="font-black font-heading text-emerald-800 self-end xs:self-auto">
                        +${tx.monto.toFixed(2)} USD
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas u Observaciones si existen */}
            {pago.notas && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Notas: </span>
                {pago.notas}
              </div>
            )}
          </div>

          {/* Footer de Acciones del Modal (Cuadrícula simétrica móvil h-11) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className={`w-full sm:w-auto px-5 h-11 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer ${
                  !urlWhatsapp ? "col-span-2" : ""
                }`}
              >
                Cerrar
              </button>

              {urlWhatsapp && (
                <a
                  href={urlWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 h-11 rounded-xl text-xs sm:text-sm font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5"
                >
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span className="truncate">Enviar Recibo</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Visor de Comprobante Adjunto si existe */}
      {pago.comprobanteUrl && (
        <ImageViewerModal
          isOpen={visorImagenAbierto}
          onClose={() => setVisorImagenAbierto(false)}
          images={[pago.comprobanteUrl]}
          initialIndex={0}
          title={`Comprobante • ${numeroReciboPreliminar}`}
          subtitle={`${propiedad.nombre} · ${unidad.codigo} · $${pago.montoPagado.toFixed(2)} USD`}
        />
      )}
    </>
  );
}
