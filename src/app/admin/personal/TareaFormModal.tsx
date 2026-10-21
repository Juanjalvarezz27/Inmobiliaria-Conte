"use client";

import React, { useState, useMemo } from "react";
import { Plus, Building2, User, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { getFechaLocalHoy, type EmpleadoItem, type PropiedadOpcion } from "./types";
import type { CreateTareaInput } from "@/lib/actions/personal";

interface TareaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleados: EmpleadoItem[];
  propiedades: PropiedadOpcion[];
  empleadoPreseleccionado?: EmpleadoItem | null;
  propiedadPreseleccionadaId?: string | null;
  onSubmit: (data: CreateTareaInput) => Promise<boolean>;
  isLoading?: boolean;
}

export function TareaFormModal({
  isOpen,
  onClose,
  empleados,
  propiedades,
  empleadoPreseleccionado,
  propiedadPreseleccionadaId,
  onSubmit,
  isLoading = false,
}: TareaFormModalProps) {
  const hoyStr = getFechaLocalHoy();

  const [empleadoId, setEmpleadoId] = useState(
    empleadoPreseleccionado?.id || (empleados.length > 0 ? empleados[0].id : "")
  );
  const [propiedadId, setPropiedadId] = useState(
    propiedadPreseleccionadaId || "GENERAL"
  );
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState(hoyStr);
  const [requiereEvidencia, setRequiereEvidencia] = useState(false);

  // Empleado seleccionado actualmente
  const empleadoActual = useMemo(
    () => empleados.find((e) => e.id === empleadoId) || null,
    [empleados, empleadoId]
  );

  // Determinar si el trabajador tiene un inmueble específico asignado
  const tienePropiedadFija = Boolean(
    empleadoActual?.propiedadId && empleadoActual.propiedadId !== "GENERAL"
  );

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
    { value: "GENERAL", label: "General / Sin propiedad específico" },
    ...propiedades.map((p) => ({
      value: p.id,
      label: p.nombre,
      sublabel: p.ciudad,
    })),
  ];

  // Sincronizar preselección al abrir el modal o cambiar el target
  const [prevTarget, setPrevTarget] = useState<{
    isOpen: boolean;
    empId?: string;
    propId?: string | null;
  }>({
    isOpen,
    empId: empleadoPreseleccionado?.id,
    propId: propiedadPreseleccionadaId,
  });

  if (
    prevTarget.isOpen !== isOpen ||
    prevTarget.empId !== empleadoPreseleccionado?.id ||
    prevTarget.propId !== propiedadPreseleccionadaId
  ) {
    setPrevTarget({
      isOpen,
      empId: empleadoPreseleccionado?.id,
      propId: propiedadPreseleccionadaId,
    });
    if (isOpen) {
      const empInit = empleadoPreseleccionado || (empleados.length > 0 ? empleados[0] : null);
      const empIdInit = empInit?.id || "";
      setEmpleadoId(empIdInit);

      if (empInit?.propiedadId && empInit.propiedadId !== "GENERAL") {
        setPropiedadId(empInit.propiedadId);
      } else {
        setPropiedadId(propiedadPreseleccionadaId || "GENERAL");
      }
      setTitulo("");
      setDescripcion("");
      setFechaLimite(hoyStr);
      setRequiereEvidencia(false);
    }
  }

  // Al cambiar el trabajador responsable, auto-asignar su propiedad base
  const handleCambioEmpleado = (nuevoId: string) => {
    setEmpleadoId(nuevoId);
    const emp = empleados.find((e) => e.id === nuevoId);
    if (emp?.propiedadId && emp.propiedadId !== "GENERAL") {
      setPropiedadId(emp.propiedadId);
    } else {
      setPropiedadId("GENERAL");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empleadoId) {
      toast.error("Debe seleccionar un trabajador responsable.");
      return;
    }
    if (!titulo.trim()) {
      toast.error("El título o labor a realizar es obligatorio.");
      return;
    }

    const propiedadFinal = tienePropiedadFija
      ? empleadoActual!.propiedadId!
      : propiedadId === "GENERAL"
      ? null
      : propiedadId;

    const payload: CreateTareaInput = {
      empleadoId,
      propiedadId: propiedadFinal,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      fechaLimite,
      requiereEvidencia,
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
      icon={Plus}
      headerVariant="green"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionHeader step={1} title="Destino y Responsable de la Tarea" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Empleado Responsable */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Trabajador Responsable <span className="text-rose-500">*</span>
            </label>
            <Select
              value={empleadoId}
              onChange={handleCambioEmpleado}
              options={opcionesEmpleados}
              placeholder="Seleccionar trabajador"
              searchable={true}
              searchPlaceholder="Buscar por nombre o cédula..."
              icon={<User className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Propiedad Asignada */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Propiedad
              </label>
              {tienePropiedadFija ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Sede Fija
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  Flotante / Seleccionable
                </span>
              )}
            </div>
            <Select
              value={tienePropiedadFija ? (empleadoActual?.propiedadId || propiedadId) : propiedadId}
              onChange={setPropiedadId}
              options={opcionesPropiedades}
              placeholder="Seleccionar propiedad"
              searchable={!tienePropiedadFija}
              disabled={tienePropiedadFija}
              searchPlaceholder="Buscar propiedad..."
              icon={<Building2 className="w-4 h-4 text-slate-400" />}
            />
            {tienePropiedadFija && (
              <p className="text-[11px] text-slate-500 mt-1">
                Fijada automáticamente según el inmueble base del colaborador.
              </p>
            )}
          </div>
        </div>

        <FormSectionHeader step={2} title="Detalle de la Labor" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Título de la tarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Labor a Realizar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Mantenimiento de bomba"
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
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
              placeholder="Instrucciones o detalles de la labor..."
              rows={3}
              className="w-full p-3 min-h-[84px] rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
            />
          </div>

          {/* Opción de solicitar evidencia fotográfica */}
          <div className="sm:col-span-2">
            <div
              onClick={() => setRequiereEvidencia(!requiereEvidencia)}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                requiereEvidencia
                  ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40 shadow-2xs"
                  : "bg-slate-50 border-slate-200/90 hover:bg-slate-100/60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    requiereEvidencia
                      ? "bg-[#175E38] text-white shadow-xs"
                      : "bg-white text-slate-400 border border-slate-200"
                  }`}
                >
                  <Camera className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Solicitar evidencia fotográfica al completar
                    </span>
                    {requiereEvidencia && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                        Requerido
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 sm:line-clamp-none">
                    {requiereEvidencia
                      ? "El trabajador deberá adjuntar fotografías del trabajo realizado para poder marcar la orden como completada."
                      : "No se exigirán fotografías para finalizar la labor (ahorra espacio y agiliza el cierre)."}
                  </p>
                </div>
              </div>

              {/* Toggle switch visual */}
              <div
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requiereEvidencia ? "bg-[#175E38]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    requiereEvidencia ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
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
              className="w-full h-11 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Asignar</span>
              )}
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
                  <span>Procesando...</span>
                </>
              ) : (
                <span>Asignar Tarea</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
