"use client";

import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Briefcase,
  KeyRound,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Building2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import {
  CARGO_CONFIG,
  ESTADO_ASISTENCIA_CONFIG,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";

interface EmpleadoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoItem | null;
  tareasEmpleado: TareaEmpleadoItem[];
  asistenciasEmpleado: RegistroAsistenciaItem[];
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onSeleccionarTarea: (tarea: TareaEmpleadoItem) => void;
}

export function EmpleadoDetalleModal({
  isOpen,
  onClose,
  empleado: emp,
  tareasEmpleado,
  asistenciasEmpleado,
  onAsignarTarea,
  onRegistrarAsistencia,
  onSeleccionarTarea,
}: EmpleadoDetalleModalProps) {
  if (!emp) return null;

  const cargoConfig = CARGO_CONFIG[emp.cargo];
  const nombreCompleto = `${emp.nombre} ${emp.apellido || ""}`.trim();
  const cleanPhone = emp.telefono.replace(/[^\d+]/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.replace("+", "")}` : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha Integral del Colaborador"
      subtitle={`${nombreCompleto} • ${cargoConfig.label}`}
      icon={User}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Cabecera de la ficha */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs ${cargoConfig.badgeClass}`}
                >
                  {cargoConfig.label}
                </span>
                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                  {emp.cedula}
                </span>
                {emp.activo ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Activo
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    Inactivo
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-900 mt-2">
                {nombreCompleto}
              </h2>
            </div>

            {/* Acciones directas */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegistrarAsistencia(emp);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Asistencia</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAsignarTarea(emp);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Asignar Tarea</span>
              </button>
            </div>
          </div>

          {/* Información de Contacto y Datos Laborales */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/80 text-xs">
            {/* Teléfono y WhatsApp */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Teléfono de Contacto
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{emp.telefono}</span>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-all"
                    title="Abrir WhatsApp"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                  </a>
                )}
              </div>
            </div>

            {/* Inmueble Asignado */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Inmueble Asignado
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                <span className="truncate">
                  {emp.propiedad ? emp.propiedad.nombre : "Sede Central"}
                </span>
              </div>
            </div>

            {/* Correo y Cuenta */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Portal Móvil
              </span>
              {emp.usuarioId ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{emp.email || "Cuenta Activa"}</span>
                </div>
              ) : (
                <span className="text-slate-400 font-medium">Sin cuenta vinculada</span>
              )}
            </div>

            {/* Fecha de Ingreso y Salario */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Ingreso & Honorarios
              </span>
              <span className="font-bold text-slate-800 block">
                {new Date(emp.fechaIngreso).toLocaleDateString("es-VE", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {emp.salarioMensual ? (
                <span className="text-[11px] font-semibold text-[#175E38]">
                  ${emp.salarioMensual.toFixed(2)} USD / mes
                </span>
              ) : null}
            </div>
          </div>

          {emp.direccion && (
            <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{emp.direccion}</span>
            </div>
          )}

          {emp.notas && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600">
              <span className="font-bold text-slate-700 mr-1.5">Notas:</span>
              {emp.notas}
            </div>
          )}
        </div>

        {/* 4 Métricas Clave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Total Tareas
            </span>
            <span className="text-xl font-black font-heading text-slate-900 mt-0.5 block">
              {emp._count.tareas}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">
              Pendientes
            </span>
            <span className="text-xl font-black font-heading text-amber-800 mt-0.5 block">
              {emp.tareasPendientesCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
            <span className="text-[10px] uppercase font-bold text-[#175E38] block">
              Asistencias
            </span>
            <span className="text-xl font-black font-heading text-[#175E38] mt-0.5 block">
              {emp._count.asistencias}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Estado Hoy
            </span>
            <div className="mt-1">
              {emp.asistenciaHoy ? (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                    ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].badgeClass
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].dotColor
                    }`}
                  />
                  {ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].label}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Sin marcaje</span>
              )}
            </div>
          </div>
        </div>

        {/* Tareas Asignadas al Colaborador */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
              Tareas Asignadas ({tareasEmpleado.length})
            </h4>
          </div>

          {tareasEmpleado.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No tiene tareas asignadas actualmente.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {tareasEmpleado.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onClose();
                    onSeleccionarTarea(t);
                  }}
                  className="p-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#175E38] hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{t.titulo}</h5>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {t.propiedadNombre || "Sede General"} • Límite:{" "}
                      {t.fechaLimite
                        ? new Date(t.fechaLimite).toLocaleDateString("es-VE")
                        : "Sin fecha"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                      t.estado === "COMPLETADA"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : t.estado === "EN_PROCESO"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {t.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
