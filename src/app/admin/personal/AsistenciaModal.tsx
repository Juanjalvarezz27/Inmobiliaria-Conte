"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { EstadoAsistencia } from "@prisma/client";
import {
  ESTADO_ASISTENCIA_CONFIG,
  getFechaLocalHoy,
  type EmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";
import type { RegistrarAsistenciaInput } from "@/lib/actions/personal";

interface AsistenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoItem | null;
  onSubmit: (data: RegistrarAsistenciaInput) => Promise<boolean>;
  isLoading?: boolean;
  registroEditar?: RegistroAsistenciaItem | null;
  fechaPreseleccionada?: string;
}

const OPCIONES_ESTADO = [
  { value: EstadoAsistencia.PRESENTE, label: "Presente" },
  { value: EstadoAsistencia.FALTA_INJUSTIFICADA, label: "Ausente" },
  { value: EstadoAsistencia.FALTA_JUSTIFICADA, label: "Justificado" },
];

function normalizarEstadoAsistencia(estado?: EstadoAsistencia | null): EstadoAsistencia {
  if (!estado) return EstadoAsistencia.PRESENTE;
  if (estado === EstadoAsistencia.FALTA_JUSTIFICADA || estado === EstadoAsistencia.PERMISO) {
    return EstadoAsistencia.FALTA_JUSTIFICADA;
  }
  if (estado === EstadoAsistencia.FALTA_INJUSTIFICADA) {
    return EstadoAsistencia.FALTA_INJUSTIFICADA;
  }
  return EstadoAsistencia.PRESENTE;
}

export function AsistenciaModal({
  isOpen,
  onClose,
  empleado,
  onSubmit,
  isLoading = false,
  registroEditar = null,
  fechaPreseleccionada,
}: AsistenciaModalProps) {
  const hoyStr = getFechaLocalHoy();
  const ahoraHora = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const [fecha, setFecha] = useState(hoyStr);
  const [horaEntrada, setHoraEntrada] = useState(ahoraHora);
  const [horaSalida, setHoraSalida] = useState("");
  const [estado, setEstado] = useState<EstadoAsistencia>(
    normalizarEstadoAsistencia(empleado?.asistenciaHoy?.estado)
  );
  const [observaciones, setObservaciones] = useState(
    empleado?.asistenciaHoy?.observaciones || ""
  );

  // Sincronizar al abrir el modal para un trabajador o registro específico
  const [prevTarget, setPrevTarget] = useState<{
    id?: string;
    registroId?: string;
    isOpen: boolean;
  }>({
    id: empleado?.id,
    registroId: registroEditar?.id,
    isOpen,
  });

  if (
    prevTarget.id !== empleado?.id ||
    prevTarget.registroId !== registroEditar?.id ||
    prevTarget.isOpen !== isOpen
  ) {
    setPrevTarget({
      id: empleado?.id,
      registroId: registroEditar?.id,
      isOpen,
    });

    if (registroEditar) {
      const entradaDate = new Date(registroEditar.horaEntrada);
      const salidaDate = registroEditar.horaSalida ? new Date(registroEditar.horaSalida) : null;

      setFecha(registroEditar.fecha.split("T")[0]);
      setHoraEntrada(
        entradaDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
      setHoraSalida(
        salidaDate
          ? salidaDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : ""
      );
      // Si es una inasistencia que se va a regularizar, sugerimos PRESENTE para agilizar el flujo
      setEstado(
        registroEditar.estado === EstadoAsistencia.FALTA_INJUSTIFICADA
          ? EstadoAsistencia.PRESENTE
          : normalizarEstadoAsistencia(registroEditar.estado)
      );
      setObservaciones(
        registroEditar.observaciones?.includes("Inasistencia automática")
          ? "Regularización de asistencia por omisión de marcaje."
          : registroEditar.observaciones || ""
      );
    } else if (empleado?.asistenciaHoy && (!fechaPreseleccionada || fechaPreseleccionada === hoyStr)) {
      const entradaDate = new Date(empleado.asistenciaHoy.horaEntrada);
      const salidaDate = empleado.asistenciaHoy.horaSalida
        ? new Date(empleado.asistenciaHoy.horaSalida)
        : null;

      setFecha(empleado.asistenciaHoy.fecha.split("T")[0]);
      setHoraEntrada(
        entradaDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
      setHoraSalida(
        salidaDate
          ? salidaDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : ""
      );
      setEstado(normalizarEstadoAsistencia(empleado.asistenciaHoy.estado));
      setObservaciones(empleado.asistenciaHoy.observaciones || "");
    } else {
      setFecha(fechaPreseleccionada || hoyStr);
      setHoraEntrada(ahoraHora);
      setHoraSalida("");
      setEstado(EstadoAsistencia.PRESENTE);
      setObservaciones("");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleado) return;

    if (!fecha) {
      toast.error("La fecha de la jornada es obligatoria.");
      return;
    }
    if (!horaEntrada) {
      toast.error("La hora de entrada es obligatoria.");
      return;
    }

    // Construcción de timestamps locales seguros combinando fecha YYYY-MM-DD y hora HH:mm
    const [year, month, day] = fecha.split("-").map(Number);
    const [hE, mE] = horaEntrada.split(":").map(Number);
    const entradaDate = new Date(year, month - 1, day, hE, mE, 0);

    let salidaIso: string | null = null;
    if (horaSalida) {
      const [hS, mS] = horaSalida.split(":").map(Number);
      const salidaDate = new Date(year, month - 1, day, hS, mS, 0);
      salidaIso = salidaDate.toISOString();
    }

    const payload: RegistrarAsistenciaInput = {
      empleadoId: empleado.id,
      fecha,
      horaEntrada: entradaDate.toISOString(),
      horaSalida: salidaIso,
      estado,
      observaciones: observaciones.trim() || null,
    };

    const exito = await onSubmit(payload);
    if (exito) {
      onClose();
    }
  };

  if (!empleado) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Control de Asistencia"
      icon={Clock}
      headerVariant="green"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionHeader step={1} title="Jornada y Horarios de Marcaje" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Fecha de la Jornada <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white cursor-pointer"
            />
          </div>

          {/* Estado de asistencia */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Estado de Asistencia <span className="text-rose-500">*</span>
            </label>
            <Select
              value={estado}
              onChange={(val) => setEstado(val as EstadoAsistencia)}
              options={OPCIONES_ESTADO}
              placeholder="Seleccionar estado"
            />
          </div>

          {/* Hora de Entrada */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hora de Entrada <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
            />
          </div>

          {/* Hora de Salida */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hora de Salida (Opcional)
            </label>
            <input
              type="time"
              value={horaSalida}
              onChange={(e) => setHoraSalida(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
            />
          </div>

          {/* Observaciones o Justificación */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observaciones o Motivo (Si aplica)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Motivo o justificación..."
              rows={3}
              className="w-full p-3 min-h-[84px] rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-2">
          <div className="grid grid-cols-2 gap-2.5 w-full h-11 sm:hidden">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Guardar</span>}
            </button>
          </div>

          <div className="hidden sm:flex sm:items-center sm:justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="min-w-[130px] h-11 px-5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="min-w-[180px] h-11 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Confirmar Asistencia</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
