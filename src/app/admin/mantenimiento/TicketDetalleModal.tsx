"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Store,
  User,
  Phone,
  MessageCircle,
  Eye,
  Camera,
  Calendar,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  HelpCircle,
  UserCheck,
  FileText,
  Save,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import {
  actualizarNotasAdminAction,
  cancelarTicketAction,
  type TicketItem,
  type TecnicoDisponible,
} from "@/lib/actions/mantenimiento";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
} from "@/lib/constants/mantenimiento";
import {
  CategoriaTicket,
  EstadoTicket,
} from "@prisma/client";
import { WhatsAppIcon, getWhatsAppUrl } from "@/lib/formatters";
import { formatearFechaNumerica } from "@/lib/date-utils";

interface TicketDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
  onAbrirAsignar: (ticket: TicketItem) => void;
  onVerFotos: (fotos: string[], index: number, title: string) => void;
  onSuccess: () => void;
}

export function TicketDetalleModal({
  isOpen,
  onClose,
  ticket,
  onAbrirAsignar,
  onVerFotos,
  onSuccess,
}: TicketDetalleModalProps) {
  const [notasAdmin, setNotasAdmin] = useState<string>(ticket?.notasAdmin || "");
  const [isSavingNotas, setIsSavingNotas] = useState<boolean>(false);
  const [mostrarCancelar, setMostrarCancelar] = useState<boolean>(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>("");
  const [isCanceling, setIsCanceling] = useState<boolean>(false);
  // Sincronizar notas cuando cambia el ticket
  React.useEffect(() => {
    if (ticket) {
      setNotasAdmin(ticket.notasAdmin || "");
      setMostrarCancelar(false);
      setMotivoCancelacion("");
    }
  }, [ticket]);

  if (!ticket) return null;

  const catCfg = CATEGORIAS_TICKET[ticket.categoria];
  const estCfg = ESTADOS_TICKET[ticket.estado];
  const esActivo =
    ticket.estado !== EstadoTicket.RESUELTO &&
    ticket.estado !== EstadoTicket.CANCELADO;

  const handleGuardarNotas = async () => {
    try {
      setIsSavingNotas(true);
      const res = await actualizarNotasAdminAction(
        ticket.id,
        notasAdmin.trim() || undefined
      );

      if (res.success) {
        toast.success("Notas administrativas actualizadas.");
        onSuccess();
      } else {
        toast.error(res.error || "No se pudieron guardar las notas.");
      }
    } catch (err) {
      console.error("Error al actualizar notas:", err);
      toast.error("Error inesperado al guardar notas.");
    } finally {
      setIsSavingNotas(false);
    }
  };

  const handleConfirmarCancelacion = async () => {
    if (!motivoCancelacion.trim() || motivoCancelacion.trim().length < 5) {
      toast.error("Por favor ingresa un motivo claro para cancelar el ticket (mínimo 5 caracteres).");
      return;
    }

    try {
      setIsCanceling(true);
      const res = await cancelarTicketAction(
        ticket.id,
        motivoCancelacion.trim()
      );

      if (res.success) {
        toast.success("Ticket cancelado exitosamente.");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "No se pudo cancelar el ticket.");
      }
    } catch (err) {
      console.error("Error al cancelar ticket:", err);
      toast.error("Error inesperado al cancelar.");
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de Avería"
      icon={Wrench}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Encabezado y Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {ticket.codigo}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl border ${estCfg.badgeBg} ${estCfg.badgeText} ${estCfg.badgeBorder}`}
              >
                {estCfg.label}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black font-heading text-slate-900 mt-1.5 break-words">
              {ticket.titulo}
            </h3>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 shrink-0">
            <p className="font-semibold text-slate-700">{ticket.propiedad.nombre}</p>
            <p className="text-[11px] text-slate-400">
              {ticket.unidad ? `Local ${ticket.unidad.codigo}` : "Áreas Comunes"} •{" "}
              {ticket.propiedad.ciudad}
            </p>
          </div>
        </div>

        {/* Datos Clave en Cajas Grid (Distribución 2 en 2) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Especialidad
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block truncate" title={ticket.categoriaPersonalizada || catCfg.label}>
              {ticket.categoria === CategoriaTicket.OTRO && ticket.categoriaPersonalizada
                ? ticket.categoriaPersonalizada
                : catCfg.label}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Reportado el
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
              {formatearFechaNumerica(ticket.createdAt)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Solicitante
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block truncate">
              {ticket.inquilino ? ticket.inquilino.nombre : "Administración"}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Estado Actual
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block truncate">
              {estCfg.label}
            </span>
          </div>
        </div>

        {/* Contacto del Inquilino (si existe) */}
        {ticket.inquilino && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-800 truncate">
                Inquilino: {ticket.inquilino.nombre} {ticket.inquilino.apellido || ""}
              </span>
              {ticket.inquilino.documentoIdentidad && (
                <span className="text-slate-400 shrink-0 text-[11px]">({ticket.inquilino.documentoIdentidad})</span>
              )}
            </div>

            {ticket.inquilino.telefono && (
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getWhatsAppUrl(
                    ticket.inquilino.telefono,
                    `Hola ${ticket.inquilino.nombre}, le contactamos desde la Administracion de Inmobiliaria Conte respecto a su reporte de mantenimiento ${ticket.codigo}: ${ticket.titulo} en ${ticket.propiedad.nombre}${ticket.unidad ? `, Local ${ticket.unidad.codigo}` : ""}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-all flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`tel:${ticket.inquilino.telefono}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{ticket.inquilino.telefono}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Descripción de la Falla */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Descripción Detallada
          </label>
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {ticket.descripcion}
          </div>
        </div>

        {/* Fotos de la Avería */}
        {ticket.fotosAveria.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-[#175E38]" />
              Evidencias Fotográficas Iniciales ({ticket.fotosAveria.length})
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
                  className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#175E38] transition-all cursor-pointer"
                >
                  <Image
                    src={foto}
                    alt={`Avería ${idx + 1}`}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Técnico Asignado */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#1C2539] text-white flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Técnico Especialista
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
                {ticket.empleado
                  ? `${ticket.empleado.nombre} ${ticket.empleado.apellido || ""}`
                  : "Sin técnico asignado todavía"}
              </p>
              {ticket.empleado && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-[11px] text-slate-500 truncate">
                    {ticket.empleado.cargo.replace(/_/g, " ")} • {ticket.empleado.telefono}
                  </p>
                  {ticket.empleado.telefono && (
                    <a
                      href={getWhatsAppUrl(
                        ticket.empleado.telefono,
                        `Hola ${ticket.empleado.nombre}, te contactamos desde Administracion respecto a la orden de mantenimiento asignada ${ticket.codigo}: ${ticket.titulo} en ${ticket.propiedad.nombre}${ticket.unidad ? `, Local ${ticket.unidad.codigo}` : ""}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Contactar al técnico vía WhatsApp"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] hover:scale-105 active:scale-95 transition-all border border-emerald-300/40"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {esActivo && (
            <button
              type="button"
              onClick={() => onAbrirAsignar(ticket)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-[#175E38] border border-[#175E38]/30 hover:bg-emerald-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5 text-center flex items-center justify-center"
            >
              {ticket.empleado ? "Cambiar Técnico" : "Asignar Técnico"}
            </button>
          )}
        </div>

        {/* Sección de Resolución / Finiquito Técnico */}
        {ticket.estado === EstadoTicket.RESUELTO && (
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#175E38] font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Trabajo Concluido y Liquidado</span>
              </div>
              {ticket.fechaFiniquito && (
                <span className="text-xs font-medium text-slate-500">
                  Resuelto el {formatearFechaNumerica(ticket.fechaFiniquito)}
                </span>
              )}
            </div>

            {ticket.notasCierre && (
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold block text-slate-900 mb-1">
                  Informe de Reparación del Especialista:
                </span>
                {ticket.notasCierre}
              </div>
            )}

            {/* Fotos de Finiquito */}
            {ticket.fotosFiniquito.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-700 block">
                  Fotografías del Trabajo Finalizado ({ticket.fotosFiniquito.length})
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
                          `Fotos de Finiquito — ${ticket.codigo}`
                        )
                      }
                      className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-200 bg-white hover:border-[#175E38] transition-all cursor-pointer"
                    >
                      <Image
                        src={foto}
                        alt={`Finiquito ${idx + 1}`}
                        fill
                        sizes="160px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motivo de Cancelación (Si está cancelado) */}
        {ticket.estado === EstadoTicket.CANCELADO && ticket.motivoCancelacion && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800">
            <span className="font-bold block mb-0.5">Ticket Cancelado</span>
            Motivo: {ticket.motivoCancelacion}
          </div>
        )}

        {/* Notas Administrativas Internas */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Notas y Seguimiento Administrativo</span>
          </label>
          <textarea
            value={notasAdmin}
            onChange={(e) => setNotasAdmin(e.target.value)}
            placeholder="Anotaciones privadas visibles solo para administradores..."
            rows={3}
            maxLength={400}
            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none transition-all placeholder:text-slate-400"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGuardarNotas}
              disabled={isSavingNotas}
              className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
            >
              {isSavingNotas ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Save className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Guardar Notas Internas</span>
            </button>
          </div>
        </div>

        {/* Sección de Cancelación / Desestimar Ticket */}
        {esActivo && (
          <div className="pt-2 border-t border-slate-100">
            {!mostrarCancelar ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>¿Deseas desestimar o anular esta avería del registro activo?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarCancelar(true)}
                  className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Cancelar este Ticket</span>
                </button>
              </div>
            ) : (
              <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Confirmar Cancelación de la Incidencia</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Indica el motivo por el cual se anula este ticket para mantener registro en el historial administrativo:
                </p>
                <input
                  type="text"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej: Reporte duplicado, resuelto por el inquilino o error de tipificación..."
                  className="w-full h-10 px-3 rounded-xl border border-rose-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarCancelar(false)}
                    className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarCancelacion}
                    disabled={isCanceling}
                    className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold bg-[#CC1A22] text-white hover:bg-[#a81219] transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5"
                  >
                    {isCanceling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">Confirmar Cancelación</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-w-[140px] h-11 px-5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5 flex items-center justify-center"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </Modal>
  );
}
