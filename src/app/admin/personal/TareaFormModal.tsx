"use client";

import React, { useState } from "react";
import { Plus, Building2, User, AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { PrioridadTarea } from "@prisma/client";
import { PRIORIDAD_TAREA_CONFIG, type EmpleadoItem, type PropiedadOpcion } from "./types";
import type { CreateTareaInput } from "@/lib/actions/personal";

interface TareaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleados: EmpleadoItem[];
  propiedades: PropiedadOpcion[];
  empleadoPreseleccionado?: EmpleadoItem | null;
  onSubmit: (data: CreateTareaInput) => Promise<boolean>;
  isLoading?: boolean;
}

const OPCIONES_PRIORIDAD = Object.entries(PRIORIDAD_TAREA_CONFIG).map(([key, config]) => ({
  value: key,
  label: config.label,
}));

export function TareaFormModal({
  isOpen,
  onClose,
  empleados,
  propiedades,
  empleadoPreseleccionado,
  onSubmit,
  isLoading = false,
}: TareaFormModalProps) {
  const hoyStr = new Date().toISOString().split("T")[0];

  const [empleadoId, setEmpleadoId] = useState(
    empleadoPreseleccionado?.id || (empleados.length > 0 ? empleados[0].id : "")
  );
  const [propiedadId, setPropiedadId] = useState("GENERAL");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadTarea>(PrioridadTarea.NORMAL);
  const [fechaLimite, setFechaLimite] = useState(hoyStr);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Opciones de empleados para Select
  const opcionesEmpleados = empleados
    .filter((e) => e.activo)
    .map((e) => ({
      value: e.id,
      label: `${e.nombre} ${e.apellido || ""}`.trim(),
      sublabel: e.cedula,
    }));

  // Opciones de propiedades para Select
  const opcionesPropiedades = [
    { value: "GENERAL", label: "General / Sin inmueble específico", sublabel: "Operaciones de sede" },
    ...propiedades.map((p) => ({
      value: p.id,
      label: p.nombre,
      sublabel: p.ciudad,
    })),
  ];

  // Sincronizar preselección
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (empleadoPreseleccionado) {
        setEmpleadoId(empleadoPreseleccionado.id);
      } else if (empleados.length > 0) {
        setEmpleadoId(empleados[0].id);
      }
      setPropiedadId("GENERAL");
      setTitulo("");
      setDescripcion("");
      setPrioridad(PrioridadTarea.NORMAL);
      setFechaLimite(hoyStr);
      setErrorLocal(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!empleadoId) {
      setErrorLocal("Debe seleccionar un colaborador responsable.");
      return;
    }
    if (!titulo.trim()) {
      setErrorLocal("El título o labor a realizar es obligatorio.");
      return;
    }

    const payload: CreateTareaInput = {
      empleadoId,
      propiedadId: propiedadId === "GENERAL" ? null : propiedadId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      prioridad,
      fechaLimite,
    };

    const exito = await onSubmit(payload);
    if (exito) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Nueva Tarea"
      subtitle="Generar orden de trabajo con responsable y nivel de urgencia"
      icon={Plus}
      headerVariant="green"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorLocal && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorLocal}
          </div>
        )}

        <FormSectionHeader step={1} title="Destino y Responsable de la Tarea" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Empleado Responsable */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Colaborador Responsable <span className="text-rose-500">*</span>
            </label>
            <Select
              value={empleadoId}
              onChange={setEmpleadoId}
              options={opcionesEmpleados}
              placeholder="Seleccionar colaborador"
              searchable={true}
              searchPlaceholder="Buscar por nombre o cédula..."
              icon={<User className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Inmueble Asignado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Inmueble / Centro de Trabajo
            </label>
            <Select
              value={propiedadId}
              onChange={setPropiedadId}
              options={opcionesPropiedades}
              placeholder="Seleccionar inmueble"
              searchable={true}
              searchPlaceholder="Buscar inmueble..."
              icon={<Building2 className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        <FormSectionHeader step={2} title="Detalle de la Labor y Urgencia" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Título de la tarea */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Labor a Realizar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Mantenimiento preventivo a bombas de agua del CC"
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
            />
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nivel de Prioridad <span className="text-rose-500">*</span>
            </label>
            <Select
              value={prioridad}
              onChange={(val) => setPrioridad(val as PrioridadTarea)}
              options={OPCIONES_PRIORIDAD}
              placeholder="Seleccionar prioridad"
            />
          </div>

          {/* Fecha Límite */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Fecha Límite de Entrega
            </label>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white cursor-pointer"
            />
          </div>

          {/* Descripción detallada */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Instrucciones Específicas / Observaciones
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Revisar presostato, limpiar filtros de succión y tomar fotografía de los manómetros al culminar."
              rows={3}
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Asignar</span>}
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
                  <span>Asignando...</span>
                </>
              ) : (
                <span>Confirmar Asignación</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
