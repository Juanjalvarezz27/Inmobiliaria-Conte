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
  HelpCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
} from "@/lib/constants/mantenimiento";
import { CategoriaTicket, EstadoTicket } from "@prisma/client";
import { formatearFechaNumerica } from "@/lib/date-utils";
import type { TicketItem } from "@/lib/actions/mantenimiento";

interface TicketFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
  onVerFotos: (fotos: string[], index: number, title: string) => void;
  onFiniquitar?: (ticket: TicketItem) => void;
}

function getCategoriaIcon(cat: CategoriaTicket) {
  switch (cat) {
    case CategoriaTicket.ELECTRICIDAD:
      return <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case CategoriaTicket.PLOMERIA:
      return <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case CategoriaTicket.FILTRACIONES:
      return <CloudRain className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
    case CategoriaTicket.CERRAJERIA:
      return <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    case CategoriaTicket.CLIMATIZACION:
      return <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />;
    case CategoriaTicket.AREAS_COMUNES:
      return <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    case CategoriaTicket.PINTURA_ALBANILERIA:
      return <Paintbrush className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
    default:
      return <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
  }
}

export function TicketFichaModal({
  isOpen,
  onClose,
  ticket,
  onVerFotos,
  onFiniquitar,
}: TicketFichaModalProps) {
  if (!ticket) return null;

  const catCfg = CATEGORIAS_TICKET[ticket.categoria];
  const estCfg = ESTADOS_TICKET[ticket.estado];
  const esResuelto = ticket.estado === EstadoTicket.RESUELTO;
  const esEnProceso = ticket.estado === EstadoTicket.EN_PROCESO;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha de Reparación — ${ticket.codigo}`}
      icon={Wrench}
      headerVariant="green"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-slate-800">
        {/* Cabecera del Ticket */}
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
              ) : esEnProceso ? (
                <Wrench className="w-3.5 h-3.5 text-blue-800" />
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

        {/* Ubicación e Inmueble */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#175E38] shrink-0" />
            <span>{ticket.propiedad.nombre}</span>
            <span className="text-slate-400 font-normal">({ticket.propiedad.direccion})</span>
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

        {/* Contacto del Inquilino (Para coordinar acceso al local) */}
        {ticket.inquilino && (
          <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Inquilino / Contacto
                </span>
                <span className="font-bold text-slate-800 text-xs sm:text-sm truncate block">
                  {ticket.inquilino.nombre} {ticket.inquilino.apellido || ""}
                </span>
              </div>
            </div>

            {ticket.inquilino.telefono && (
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://wa.me/${ticket.inquilino.telefono.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:brightness-105 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`tel:${ticket.inquilino.telefono}`}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Falla Reportada */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Falla Reportada Original</span>
          </label>
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {ticket.descripcion}
          </div>
        </div>

        {/* Instrucciones del Administrador */}
        {ticket.notasAdmin && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1 uppercase text-[10.5px] tracking-wider text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Instrucciones de la Administración
            </span>
            <p className="leading-relaxed">{ticket.notasAdmin}</p>
          </div>
        )}

        {/* Fotografías Iniciales de la Avería */}
        {ticket.fotosAveria.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Evidencias Fotográficas Iniciales ({ticket.fotosAveria.length})</span>
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
                    alt={`Avería ${idx + 1}`}
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

        {/* SECCIÓN CLAVE: EVIDENCIAS DE LA REPARACIÓN SUBIDAS POR EL TRABAJADOR */}
        {esResuelto ? (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3 mt-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-[#175E38] font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Trabajo Concluido y Liquidado</span>
              </div>
              {ticket.fechaFiniquito && (
                <span className="text-xs font-semibold text-emerald-800">
                  Resuelto el {formatearFechaNumerica(ticket.fechaFiniquito)}
                </span>
              )}
            </div>

            {ticket.notasCierre && (
              <div className="bg-white p-3 rounded-xl border border-emerald-200/70 text-xs text-slate-700 leading-relaxed shadow-2xs">
                <span className="font-bold block text-slate-900 mb-1 text-[11px] uppercase tracking-wider text-emerald-900">
                  Informe de Reparación del Trabajador:
                </span>
                <p className="italic text-slate-800">"{ticket.notasCierre}"</p>
              </div>
            )}

            {/* Fotografías del Finiquito/Reparación */}
            {ticket.fotosFiniquito.length > 0 ? (
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
            ) : (
              <p className="text-xs text-slate-500 italic">
                El trabajo fue marcado como resuelto sin evidencias fotográficas adicionales.
              </p>
            )}
          </div>
        ) : esEnProceso ? (
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-xs font-semibold text-blue-900">
                Esta avería está actualmente en curso de reparación.
              </span>
            </div>
            {onFiniquitar && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFiniquitar(ticket);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Finiquitar Ahora
              </button>
            )}
          </div>
        ) : null}

        {/* Botón de Cierre Inferior */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
