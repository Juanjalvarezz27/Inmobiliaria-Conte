"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { EstadoAsistencia } from "@prisma/client";
import { ESTADO_ASISTENCIA_CONFIG, type EmpleadoItem } from "./types";
import type { RegistrarAsistenciaInput } from "@/lib/actions/personal";

interface AsistenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoItem | null;
  onSubmit: (data: RegistrarAsistenciaInput) => Promise<boolean>;
  isLoading?: boolean;
}

const OPCIONES_ESTADO = Object.entries(ESTADO_ASISTENCIA_CONFIG).map(([key, config]) => ({
  value: key,
  label: config.label,
}));

export function AsistenciaModal({
  isOpen,
  onClose,
  empleado,
  onSubmit,
  isLoading = false,
}: AsistenciaModalProps) {
  const hoyStr = new Date().toISOString().split("T")[0];
  const ahoraHora = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const [fecha, setFecha] = useState(hoyStr);
  const [horaEntrada, setHoraEntrada] = useState(ahoraHora);
  const [horaSalida, setHoraSalida] = useState("");
  const [estado, setEstado] = useState<EstadoAsistencia>(
    empleado?.asistenciaHoy?.estado || EstadoAsistencia.PRESENTE
  );
  const [ubicacionEntrada, setUbicacionEntrada] = useState(
    empleado?.asistenciaHoy?.ubicacionEntrada || "Administración Central"
  );
  const [observaciones, setObservaciones] = useState(
    empleado?.asistenciaHoy?.observaciones || ""
  );

  // Sincronizar al abrir el modal para un trabajador
  const [prevTarget, setPrevTarget] = useState<{ id?: string; isOpen: boolean }>({
    id: empleado?.id,
    isOpen,
  });

  if (prevTarget.id !== empleado?.id || prevTarget.isOpen !== isOpen) {
    setPrevTarget({ id: empleado?.id, isOpen });
    if (empleado?.asistenciaHoy) {
      const entradaDate = new Date(empleado.asistenciaHoy.horaEntrada);
      const salidaDate = empleado.asistenciaHoy.horaSalida ? new Date(empleado.asistenciaHoy.horaSalida) : null;

      setFecha(empleado.asistenciaHoy.fecha.split("T")[0]);
      setHoraEntrada(entradaDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      setHoraSalida(salidaDate ? salidaDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
      setEstado(empleado.asistenciaHoy.estado);
      setUbicacionEntrada(empleado.asistenciaHoy.ubicacionEntrada || "Administración Central");
      setObservaciones(empleado.asistenciaHoy.observaciones || "");
    } else {
      setFecha(hoyStr);
      setHoraEntrada(ahoraHora);
      setHoraSalida("");
      setEstado(EstadoAsistencia.PRESENTE);
      setUbicacionEntrada("Administración Central");
      setObservaciones("");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleado) return;

    // Construcción de timestamps ISO combinando fecha y hora
    const [hE, mE] = horaEntrada.split(":");
    const entradaDate = new Date(fecha);
    entradaDate.setHours(parseInt(hE, 10), parseInt(mE, 10), 0);

    let salidaIso: string | null = null;
    if (horaSalida) {
      const [hS, mS] = horaSalida.split(":");
      const salidaDate = new Date(fecha);
      salidaDate.setHours(parseInt(hS, 10), parseInt(mS, 10), 0);
      salidaIso = salidaDate.toISOString();
    }

    const payload: RegistrarAsistenciaInput = {
      empleadoId: empleado.id,
      fecha,
      horaEntrada: entradaDate.toISOString(),
      horaSalida: salidaIso,
      estado,
      ubicacionEntrada,
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
      subtitle={`Registro diario para ${empleado.nombre} ${empleado.apellido || ""}`}
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

          {/* Estado de puntualidad */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Estado de Puntualidad <span className="text-rose-500">*</span>
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

          {/* Ubicación / Centro de Marcaje */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Centro Comercial / Ubicación de Entrada
            </label>
            <input
              type="text"
              value={ubicacionEntrada}
              onChange={(e) => setUbicacionEntrada(e.target.value)}
              placeholder="Ej: CC Las Américas, Galpón Principal, Sede Central"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
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
              placeholder="Ej: Permiso médico justificado, llegada demorada por lluvia torrencial."
              rows={2}
              className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
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
