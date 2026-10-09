"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Mail,
  MapPin,
  Pencil,
  FileText,
  Plus,
  Store,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  CircleAlert,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { TipoPersona, EstadoPago } from "@prisma/client";
import { WhatsAppIcon, getWhatsAppUrl, formatCurrency } from "../propiedades/constants";
import type { InquilinoConContratos } from "./types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface InquilinoDetalleModalProps {
  isOpen: boolean;
  inquilino: InquilinoConContratos | null;
  onClose: () => void;
  onEditar: () => void;
  onCrearContrato: () => void;
  isLoading?: boolean;
}

// Modal visor de ficha técnica y contratos del inquilino
export function InquilinoDetalleModal({
  isOpen,
  inquilino,
  onClose,
  onEditar,
  onCrearContrato,
  isLoading = false,
}: InquilinoDetalleModalProps) {
  const router = useRouter();
  if (!inquilino) return null;

  const nombreCompleto =
    inquilino.tipoPersona === TipoPersona.NATURAL
      ? `${inquilino.nombre} ${inquilino.apellido ?? ""}`.trim()
      : inquilino.nombre;

  // Diagnóstico de solvencia y cobranzas en contratos activos
  const todosLosPagos = (inquilino.contratos || []).flatMap((c) => c.pagos || []);
  const tieneContratos = (inquilino.contratos || []).length > 0;
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anoActual = hoy.getFullYear();

  // Solvencia exigible: solo evaluamos cuotas devengadas (mes actual o pasados)
  const pagosExigibles = todosLosPagos.filter(
    (p) => p.periodoAno < anoActual || (p.periodoAno === anoActual && p.periodoMes <= mesActual)
  );

  const tieneMora = pagosExigibles.some((p) => p.estado === EstadoPago.VENCIDO);
  const tienePendiente = pagosExigibles.some(
    (p) => p.estado === EstadoPago.PENDIENTE || p.estado === EstadoPago.PARCIAL
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={nombreCompleto}
      subtitle={`Documento: ${inquilino.documentoIdentidad}`}
      icon={inquilino.tipoPersona === TipoPersona.NATURAL ? User : Building2}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Tarjetas de Datos Clave organizadas de 2 en 2 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tipo de Persona */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tipo
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
              {inquilino.tipoPersona === TipoPersona.NATURAL ? "Persona Natural" : "Empresa / Jurídica"}
            </p>
          </div>

          {/* Cédula o RIF */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Documento
            </span>
            <p className="text-xs sm:text-sm font-black text-slate-900 font-heading mt-1">
              {inquilino.documentoIdentidad}
            </p>
          </div>

          {/* Contratos Activos */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Alquileres Activos
            </span>
            <div className="mt-1">
              <Badge variant={inquilino._count.contratos > 0 ? "DISPONIBLE" : "INACTIVO"} dot size="sm">
                {inquilino._count.contratos}{" "}
                {inquilino._count.contratos === 1 ? "espacio" : "espacios"}
              </Badge>
            </div>
          </div>

          {/* Solvencia Financiera */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Solvencia
            </span>
            <div className="mt-1 flex items-center">
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#175E38]" />
                  Consultando...
                </span>
              ) : !tieneContratos ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Sin contratos
                </span>
              ) : tieneMora ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#CC1A22] border border-rose-200">
                  <CircleAlert className="w-3 h-3 text-[#CC1A22]" />
                  En Mora
                </span>
              ) : tienePendiente ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Por Cobrar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-[#175E38]" />
                  Al Día
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contacto y Comunicación Directa */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Información de Contacto
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* WhatsApp Principal */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Teléfono:</span>
              <a
                href={getWhatsAppUrl(inquilino.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir chat en WhatsApp"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                <span className="underline decoration-emerald-300 underline-offset-2">
                  {inquilino.telefono}
                </span>
              </a>
            </div>

            {/* Teléfono Secundario */}
            {inquilino.telefonoSecundario && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Secundario:</span>
                <span className="font-semibold text-slate-700">{inquilino.telefonoSecundario}</span>
              </div>
            )}

            {/* Correo Electrónico */}
            {inquilino.email && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium">Email:</span>
                <a
                  href={`mailto:${inquilino.email}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {inquilino.email}
                </a>
              </div>
            )}

            {/* Dirección */}
            {inquilino.direccion && (
              <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-slate-200/50">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium block">Dirección:</span>
                  <span className="text-slate-700 leading-relaxed">{inquilino.direccion}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Contratos y Espacios Arrendados */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Espacios y Contratos</span>
            </h4>
            {inquilino.contratos && inquilino.contratos.length > 0 && (
              <button
                type="button"
                onClick={onCrearContrato}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-[#175E38] hover:bg-emerald-100 hover:text-[#124b2d] border border-emerald-200/80 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                title="Crear un nuevo contrato para este inquilino"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nuevo Contrato</span>
              </button>
            )}
          </div>

          {inquilino.contratos && inquilino.contratos.length > 0 ? (
            <div className="space-y-2">
              {inquilino.contratos.map((c) => {
                // Ordenar cuotas de este contrato cronológicamente ascendente
                const pagosCronologicos = [...(c.pagos || [])].sort((a, b) =>
                  a.periodoAno !== b.periodoAno ? a.periodoAno - b.periodoAno : a.periodoMes - b.periodoMes
                );

                // 1. Detectar si existe alguna cuota vencida (en mora)
                const primerPagoVencido = pagosCronologicos.find(
                  (p) =>
                    p.estado === EstadoPago.VENCIDO ||
                    (p.estado !== EstadoPago.PAGADO &&
                      p.montoPagado < p.montoEsperado &&
                      hoy > new Date(p.fechaVencimiento))
                );

                // 2. Si no hay mora, encontrar la próxima cuota pendiente por pagar (cronológica)
                const proximoPagoPendiente = pagosCronologicos.find(
                  (p) => p.estado !== EstadoPago.PAGADO && p.montoPagado < p.montoEsperado
                );

                // 3. Si todo el contrato ya fue pagado, tomar el último pago asentado
                const pagosPagados = pagosCronologicos.filter((p) => p.estado === EstadoPago.PAGADO);
                const ultimoPagoPagado = pagosPagados.length > 0 ? pagosPagados[pagosPagados.length - 1] : null;

                // El pago a mostrar como referencia principal
                const pagoReferencia =
                  primerPagoVencido || proximoPagoPendiente || ultimoPagoPagado || (pagosCronologicos[0] ?? null);

                const saldoPendiente = pagoReferencia
                  ? Math.max(0, pagoReferencia.montoEsperado - pagoReferencia.montoPagado)
                  : 0;

                const esPagoFuturo = pagoReferencia
                  ? pagoReferencia.periodoAno > anoActual ||
                    (pagoReferencia.periodoAno === anoActual && pagoReferencia.periodoMes > mesActual)
                  : false;

                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#175E38] flex items-center justify-center shrink-0 border border-emerald-200">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{c.unidad.codigo}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              ({c.codigo})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {c.unidad.propiedad.nombre} · {c.unidad.propiedad.ciudad}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Mensualidad
                          </span>
                          <span className="font-black text-slate-900 text-sm font-heading">
                            {formatCurrency(c.montoAlquiler)}/mes
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              router.push(`/admin/cobranza?search=${encodeURIComponent(c.codigo)}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#175E38] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
                            title="Ver pagos y recibos en el módulo de Cobranza"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#175E38]" />
                            <span className="hidden sm:inline">Cobranza</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              router.push(`/admin/contratos?search=${encodeURIComponent(c.codigo)}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1C2539] hover:bg-[#2a3754] transition-all cursor-pointer shadow-xs active:translate-y-0.5"
                            title="Ver contrato completo"
                          >
                            <span>Ver</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Resumen de mensualidad / estado de cobranza */}
                    {isLoading ? (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <RefreshCw className="w-3 h-3 animate-spin text-[#175E38]" />
                        <span>Consultando estado de cobranza...</span>
                      </div>
                    ) : pagoReferencia ? (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500 font-medium">
                          {primerPagoVencido
                            ? "Período en mora: "
                            : proximoPagoPendiente
                            ? "Próximo período: "
                            : "Último período: "}
                          <strong className="text-slate-700">
                            {MESES[pagoReferencia.periodoMes - 1]} {pagoReferencia.periodoAno}
                          </strong>
                        </span>
                        {primerPagoVencido ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#CC1A22]">
                            <CircleAlert className="w-3 h-3 text-[#CC1A22]" />
                            En Mora ({formatCurrency(saldoPendiente)})
                          </span>
                        ) : pagoReferencia.estado === EstadoPago.PAGADO ? (
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className="inline-flex items-center gap-1 font-bold text-[#175E38]">
                              <CheckCircle2 className="w-3 h-3 text-[#175E38]" />
                              Solvente (Al día)
                            </span>
                            {pagoReferencia.fechaPago && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                · Pagado el{" "}
                                {new Date(pagoReferencia.fechaPago).toLocaleDateString("es-VE", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}{" "}
                                ({formatCurrency(pagoReferencia.montoPagado)})
                              </span>
                            )}
                          </div>
                        ) : pagoReferencia.estado === EstadoPago.PARCIAL ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Abonado ({formatCurrency(pagoReferencia.montoPagado)} / {formatCurrency(pagoReferencia.montoEsperado)})
                          </span>
                        ) : esPagoFuturo ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Programado ({formatCurrency(saldoPendiente)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Por Cobrar ({formatCurrency(saldoPendiente)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic">
                        Sin pagos asentados para este contrato
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Este inquilino no tiene contratos activos en este momento.
              </p>
              <button
                type="button"
                onClick={onCrearContrato}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs active:translate-y-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Asignar Espacio y Crear Contrato</span>
              </button>
            </div>
          )}
        </div>

        {/* Botones de Pie */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
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
            <span>Editar Datos</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
