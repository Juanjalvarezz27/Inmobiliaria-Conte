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
      title={`Detalle de Ticket — ${ticket.codigo}`}
      icon={Wrench}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Encabezado y Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div>
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
            <h3 className="text-base sm:text-lg font-black font-heading text-slate-900 mt-1.5">
              {ticket.titulo}
            </h3>
          </div>

          <div className="text-right text-xs text-slate-500">
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
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-800">
                Inquilino: {ticket.inquilino.nombre} {ticket.inquilino.apellido || ""}
              </span>
              <span className="text-slate-400">({ticket.inquilino.documentoIdentidad})</span>
            </div>

            {ticket.inquilino.telefono && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`https://wa.me/${ticket.inquilino.telefono.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-all flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`tel:${ticket.inquilino.telefono}`}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1"
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
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1C2539] text-white flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Técnico Especialista
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {ticket.empleado
                  ? `${ticket.empleado.nombre} ${ticket.empleado.apellido || ""}`
                  : "Sin técnico asignado todavía"}
              </p>
              {ticket.empleado && (
                <p className="text-[11px] text-slate-500">
                  {ticket.empleado.cargo.replace(/_/g, " ")} • {ticket.empleado.telefono}
                </p>
              )}
            </div>
          </div>

          {esActivo && (
            <button
              type="button"
              onClick={() => onAbrirAsignar(ticket)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#175E38] border border-[#175E38]/30 hover:bg-emerald-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
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
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Notas y Seguimiento Administrativo
            </label>
            <button
              type="button"
              onClick={handleGuardarNotas}
              disabled={isSavingNotas}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
            >
              {isSavingNotas ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Guardar Notas</span>
            </button>
          </div>
          <textarea
            value={notasAdmin}
            onChange={(e) => setNotasAdmin(e.target.value)}
            placeholder="Anotaciones privadas visibles solo para administradores..."
            rows={2}
            maxLength={400}
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] resize-none"
          />
        </div>

        {/* Sección de Cancelación (Solo tickets activos) */}
        {esActivo && (
          <div className="pt-2 border-t border-slate-100">
            {!mostrarCancelar ? (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  ¿Deseas desestimar o cancelar este reporte?
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarCancelar(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  Cancelar este Ticket
                </button>
              </div>
            ) : (
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-bold text-rose-800">
                  Confirmar Cancelación del Ticket
                </p>
                <input
                  type="text"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Explica el motivo (ej: Reporte duplicado, resuelto por el inquilino...)"
                  className="w-full h-9 px-3 rounded-lg border border-rose-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarCancelar(false)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarCancelacion}
                    disabled={isCanceling}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-[#CC1A22] text-white hover:bg-[#a81219] flex items-center gap-1.5"
                  >
                    {isCanceling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Confirmar Cancelación</span>
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
            className="w-full sm:w-auto min-w-[120px] h-10 px-4 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </Modal>
  );
}
