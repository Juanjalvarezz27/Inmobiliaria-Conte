"use client";

import React from "react";
import Image from "next/image";
import {
  Wrench,
  Clock,
  CheckCircle2,
  Building2,
  Store,
  User,
  Phone,
  MessageCircle,
  Eye,
  Camera,
  Calendar,
  ShieldCheck,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  FileText,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
} from "@/lib/constants/mantenimiento";
import { CategoriaTicket, EstadoTicket } from "@prisma/client";
import { formatearFechaNumerica } from "@/lib/date-utils";
import type { TicketItem } from "@/lib/actions/mantenimiento";

interface InquilinoTicketFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
  onVerFotos: (fotos: string[], index: number, title: string) => void;
}

function getCategoriaIcon(cat: CategoriaTicket) {
  switch (cat) {
    case CategoriaTicket.ELECTRICIDAD:
      return <Zap className="w-4 h-4 text-amber-500 shrink-0" />;
    case CategoriaTicket.PLOMERIA:
      return <Droplets className="w-4 h-4 text-blue-500 shrink-0" />;
    case CategoriaTicket.FILTRACIONES:
      return <CloudRain className="w-4 h-4 text-cyan-500 shrink-0" />;
    case CategoriaTicket.CERRAJERIA:
      return <Key className="w-4 h-4 text-amber-600 shrink-0" />;
    case CategoriaTicket.CLIMATIZACION:
      return <Wind className="w-4 h-4 text-teal-500 shrink-0" />;
    case CategoriaTicket.AREAS_COMUNES:
      return <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />;
    case CategoriaTicket.PINTURA_ALBANILERIA:
      return <Paintbrush className="w-4 h-4 text-orange-500 shrink-0" />;
    default:
      return <Wrench className="w-4 h-4 text-slate-500 shrink-0" />;
  }
}

export function InquilinoTicketFichaModal({
  isOpen,
  onClose,
  ticket,
  onVerFotos,
}: InquilinoTicketFichaModalProps) {
  if (!ticket) return null;

  const catCfg = CATEGORIAS_TICKET[ticket.categoria];
  const estCfg = ESTADOS_TICKET[ticket.estado];
  const pasoActual = estCfg.paso;
  const esCancelado = ticket.estado === EstadoTicket.CANCELADO;
  const esResuelto = ticket.estado === EstadoTicket.RESUELTO;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha de Incidencia — ${ticket.codigo}`}
      icon={Wrench}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-slate-800">
        {/* Cabecera: Código, Estado y Fecha */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {ticket.codigo}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${estCfg.badgeBg} ${estCfg.badgeText} ${estCfg.badgeBorder}`}
            >
              {esResuelto ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38] stroke-[2.5]" />
              ) : ticket.estado === EstadoTicket.EN_PROCESO ? (
                <Wrench className="w-3.5 h-3.5 text-blue-800" />
              ) : esCancelado ? (
                <XCircle className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-800" />
              )}
              <span>{estCfg.label}</span>
            </span>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Reportado: {formatearFechaNumerica(ticket.createdAt)}
          </span>
        </div>

        {/* Título y Especialidad */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            {getCategoriaIcon(ticket.categoria)}
            <span className="font-semibold">
              {ticket.categoria === CategoriaTicket.OTRO && ticket.categoriaPersonalizada
                ? ticket.categoriaPersonalizada
                : catCfg.label}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black font-heading text-slate-900 leading-snug">
            {ticket.titulo}
          </h3>
        </div>

        {/* Ubicación del Inmueble y Local */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
            <Building2 className="w-4 h-4 text-[#175E38] shrink-0" />
            <span className="truncate">{ticket.propiedad.nombre}</span>
            <span className="text-slate-400 font-normal truncate">({ticket.propiedad.direccion})</span>
          </p>
          <p className="text-slate-600 flex items-center gap-1.5 text-xs">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold">
              {ticket.unidad
                ? `Local ${ticket.unidad.codigo}${ticket.unidad.piso ? ` (Piso ${ticket.unidad.piso})` : ""}`
                : "Áreas Comunes / Fachada"}
            </span>
          </p>
        </div>

        {/* Stepper de Progreso Visual */}
        {!esCancelado && (
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Progreso de Atención
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { paso: 1, label: "Pendiente" },
                { paso: 2, label: "En Proceso" },
                { paso: 3, label: "Resuelto" },
              ].map((step) => {
                const completado = pasoActual >= step.paso;
                const actual = pasoActual === step.paso;
                return (
                  <div key={step.paso} className="text-center">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        completado ? "bg-[#175E38]" : "bg-slate-200"
                      } ${actual ? "ring-2 ring-[#175E38]/30" : ""}`}
                    />
                    <span
                      className={`block text-[10px] font-bold mt-1 truncate ${
                        actual
                          ? "text-[#175E38]"
                          : completado
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalle de la Falla Reportada */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Descripción de la Falla</span>
          </label>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {ticket.descripcion}
          </div>
        </div>

        {/* Fotos Iniciales Reportadas por el Inquilino */}
        {ticket.fotosAveria.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Fotos Adjuntas Iniciales ({ticket.fotosAveria.length})</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ticket.fotosAveria.map((foto, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onVerFotos(
                      ticket.fotosAveria,
                      idx,
                      `Evidencia de Avería — ${ticket.codigo}`
                    )
                  }
                  className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#175E38] transition-all cursor-pointer shadow-2xs"
                >
                  <Image
                    src={foto}
                    alt={`Foto ${idx + 1}`}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Técnico Asignado por Administración */}
        {ticket.empleado && (
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#175E38] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Técnico Asignado
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {ticket.empleado.nombre} {ticket.empleado.apellido || ""}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {ticket.empleado.cargo.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            {ticket.empleado.telefono && (
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://wa.me/${ticket.empleado.telefono.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:brightness-105 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`tel:${ticket.empleado.telefono}`}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Reparación Concluida y Fotos del Arreglo */}
        {esResuelto && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-[#175E38] font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Trabajo Concluido y Verificado</span>
              </div>
              {ticket.fechaFiniquito && (
                <span className="text-xs font-semibold text-emerald-800">
                  Resuelto el {formatearFechaNumerica(ticket.fechaFiniquito)}
                </span>
              )}
            </div>

            {ticket.notasCierre && (
              <div className="bg-white p-3 rounded-xl border border-emerald-200/70 text-xs text-slate-700 leading-relaxed shadow-2xs">
                <span className="font-bold block text-[11px] uppercase tracking-wider text-emerald-900 mb-0.5">
                  Nota del Técnico / Administrador:
                </span>
                <p className="italic text-slate-800">"{ticket.notasCierre}"</p>
              </div>
            )}

            {ticket.fotosFiniquito.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#175E38]" />
                  <span>Fotos de la Reparación Realizada ({ticket.fotosFiniquito.length})</span>
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ticket.fotosFiniquito.map((foto, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        onVerFotos(
                          ticket.fotosFiniquito,
                          idx,
                          `Fotos de Reparación Concluida — ${ticket.codigo}`
                        )
                      }
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 bg-white hover:border-[#175E38] transition-all cursor-pointer shadow-xs"
                    >
                      <Image
                        src={foto}
                        alt={`Reparación ${idx + 1}`}
                        fill
                        sizes="160px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motivo de Cancelación */}
        {esCancelado && ticket.motivoCancelacion && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
            <span className="font-bold block uppercase text-[10px] tracking-wider text-rose-900">
              Incidencia Cancelada:
            </span>
            <p>{ticket.motivoCancelacion}</p>
          </div>
        )}

        {/* Botón de Cierre Inferior */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-heading font-black text-xs text-white bg-[#1C2539] hover:bg-[#2a3754] border-b-[2px] border-b-slate-900 active:translate-y-0.5 transition-all shadow-xs flex items-center justify-center cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </Modal>
  );
}

