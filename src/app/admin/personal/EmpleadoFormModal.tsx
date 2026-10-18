"use client";

import { useState } from "react";
import { User, KeyRound, Loader2, RefreshCw, Building2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { CargoEmpleado } from "@prisma/client";
import { CARGO_CONFIG, type EmpleadoItem, type PropiedadOpcion } from "./types";
import type { CreateEmpleadoInput } from "@/lib/actions/personal";

interface EmpleadoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleadoAEditar?: EmpleadoItem | null;
  propiedades: PropiedadOpcion[];
  onSubmit: (data: CreateEmpleadoInput) => Promise<boolean>;
  isLoading?: boolean;
}

const OPCIONES_CARGO = Object.entries(CARGO_CONFIG).map(([key, config]) => ({
  value: key,
  label: config.label,
}));

export function EmpleadoFormModal({
  isOpen,
  onClose,
  empleadoAEditar,
  propiedades,
  onSubmit,
  isLoading = false,
}: EmpleadoFormModalProps) {
  const hoyStr = new Date().toISOString().split("T")[0];

  const opcionesPropiedades = [
    { value: "GENERAL", label: "Sede Central / Multipropiedad", sublabel: "Operaciones globales" },
    ...propiedades.map((p) => ({
      value: p.id,
      label: p.nombre,
      sublabel: p.ciudad,
    })),
  ];

  const [nombre, setNombre] = useState(empleadoAEditar?.nombre || "");
  const [apellido, setApellido] = useState(empleadoAEditar?.apellido || "");
  const [cedula, setCedula] = useState(empleadoAEditar?.cedula || "");
  const [telefono, setTelefono] = useState(empleadoAEditar?.telefono || "+58");
  const [email, setEmail] = useState(empleadoAEditar?.email || "");
  const [direccion, setDireccion] = useState(empleadoAEditar?.direccion || "");
  const [cargo, setCargo] = useState<CargoEmpleado>(
    empleadoAEditar?.cargo || CargoEmpleado.CONSERJE
  );
  const [fechaIngreso, setFechaIngreso] = useState(
    empleadoAEditar?.fechaIngreso ? empleadoAEditar.fechaIngreso.split("T")[0] : hoyStr
  );
  const [salarioMensual, setSalarioMensual] = useState<string>(
    empleadoAEditar?.salarioMensual ? empleadoAEditar.salarioMensual.toString() : ""
  );
  const [propiedadId, setPropiedadId] = useState<string>(
    empleadoAEditar?.propiedadId || "GENERAL"
  );
  const [notas, setNotas] = useState(empleadoAEditar?.notas || "");

  // Gestión de credenciales de acceso para el portal móvil
  const [crearUsuario, setCrearUsuario] = useState(Boolean(empleadoAEditar?.usuarioId));
  const [passwordTemporal, setPasswordTemporal] = useState("Conte2026*");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Sincronizar estado cuando cambia el empleado a editar
  const [prevTarget, setPrevTarget] = useState<{ id?: string; isOpen: boolean }>({
    id: empleadoAEditar?.id,
    isOpen,
  });

  if (prevTarget.id !== empleadoAEditar?.id || prevTarget.isOpen !== isOpen) {
    setPrevTarget({ id: empleadoAEditar?.id, isOpen });
    if (empleadoAEditar) {
      setNombre(empleadoAEditar.nombre);
      setApellido(empleadoAEditar.apellido || "");
      setCedula(empleadoAEditar.cedula);
      setTelefono(empleadoAEditar.telefono);
      setEmail(empleadoAEditar.email || "");
      setDireccion(empleadoAEditar.direccion || "");
      setCargo(empleadoAEditar.cargo);
      setFechaIngreso(empleadoAEditar.fechaIngreso ? empleadoAEditar.fechaIngreso.split("T")[0] : hoyStr);
      setSalarioMensual(empleadoAEditar.salarioMensual ? empleadoAEditar.salarioMensual.toString() : "");
      setPropiedadId(empleadoAEditar.propiedadId || "GENERAL");
      setNotas(empleadoAEditar.notas || "");
      setCrearUsuario(Boolean(empleadoAEditar.usuarioId));
    } else {
      setNombre("");
      setApellido("");
      setCedula("");
      setTelefono("+58");
      setEmail("");
      setDireccion("");
      setCargo(CargoEmpleado.CONSERJE);
      setFechaIngreso(hoyStr);
      setSalarioMensual("");
      setPropiedadId("GENERAL");
      setNotas("");
      setCrearUsuario(false);
      setPasswordTemporal("Conte2026*");
    }
    setErrorLocal(null);
  }

  // Generador de contraseña aleatoria
  const generarContrasena = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "C";
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += "*";
    setPasswordTemporal(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!nombre.trim()) {
      setErrorLocal("El nombre es requerido.");
      return;
    }
    if (!cedula.trim()) {
      setErrorLocal("La cédula de identidad es requerida.");
      return;
    }
    if (!telefono.trim() || telefono === "+58") {
      setErrorLocal("El teléfono de contacto es requerido.");
      return;
    }
    if (crearUsuario && !email.trim()) {
      setErrorLocal("Para habilitar acceso al portal es obligatorio ingresar un correo electrónico.");
      return;
    }

    const payload: CreateEmpleadoInput = {
      nombre: nombre.trim(),
      apellido: apellido.trim() || null,
      cedula: cedula.trim().toUpperCase(),
      telefono: telefono.trim(),
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      cargo,
      fechaIngreso,
      salarioMensual: salarioMensual ? parseFloat(salarioMensual) : null,
      propiedadId: propiedadId === "GENERAL" ? null : propiedadId,
      notas: notas.trim() || null,
      crearUsuario,
      passwordTemporal: crearUsuario ? passwordTemporal : null,
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
      title={empleadoAEditar ? "Editar Colaborador" : "Registrar Nuevo Colaborador"}
      subtitle="Control de personal, asignación de tareas y acceso al portal móvil"
      icon={User}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorLocal && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorLocal}
          </div>
        )}

        {/* Sección 1: Datos Personales */}
        <div className="space-y-4">
          <FormSectionHeader step={1} title="Datos Personales y Contacto" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombres <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Carlos Eduardo"
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Apellidos
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej: Pérez Rodríguez"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cédula de Identidad <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: V-18456789"
                required
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white uppercase font-mono"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Teléfono de Contacto (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <PhoneInput
                value={telefono}
                onChange={setTelefono}
                defaultCountryCode="VE"
              />
            </div>

            {/* Correo Electrónico */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Correo Electrónico {crearUsuario && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: colaborador@inmobiliariaconte.com"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Necesario para enviar notificaciones de tareas y permitir acceso a la aplicación web.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 2: Ficha Laboral */}
        <div className="space-y-4">
          <FormSectionHeader step={2} title="Ficha Laboral y Cargo" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Cargo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cargo Operativo <span className="text-rose-500">*</span>
              </label>
              <Select
                value={cargo}
                onChange={(val) => setCargo(val as CargoEmpleado)}
                options={OPCIONES_CARGO}
                placeholder="Seleccionar cargo"
              />
            </div>

            {/* Inmueble Asignado */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Inmueble Asignado / Centro de Trabajo
              </label>
              <Select
                value={propiedadId}
                onChange={setPropiedadId}
                options={opcionesPropiedades}
                placeholder="Seleccionar inmueble o sede"
                searchable={true}
                searchPlaceholder="Buscar inmueble..."
                icon={<Building2 className="w-4 h-4 text-slate-400" />}
              />
            </div>

            {/* Fecha de Ingreso */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Fecha de Ingreso
              </label>
              <input
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white cursor-pointer"
              />
            </div>

            {/* Salario u Honorarios (Opcional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Salario / Honorarios Mensuales ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salarioMensual}
                  onChange={(e) => setSalarioMensual(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            </div>

            {/* Dirección de habitación */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dirección de Habitación
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: San Cristóbal, Sector La Concordia"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
            </div>

            {/* Notas / Observaciones */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observaciones o Especialidad
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Técnico certificado en refrigeración y bombas de agua."
                rows={2}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Acceso al Sistema */}
        <div className="space-y-4">
          <FormSectionHeader step={3} title="Acceso al Portal Móvil" />

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={crearUsuario}
                onChange={(e) => setCrearUsuario(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#175E38] focus:ring-[#175E38] border-slate-300 cursor-pointer"
              />
              <div>
                <span className="text-sm font-bold text-slate-800">
                  Habilitar cuenta de acceso para el colaborador
                </span>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Permite al colaborador ingresar al Portal Móvil (<code>/empleado</code>) para marcar asistencia, visualizar sus tareas diarias y adjuntar fotos de evidencia.
                </p>
              </div>
            </label>

            {crearUsuario && !empleadoAEditar?.usuarioId && (
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Contraseña Inicial de Acceso
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={passwordTemporal}
                      onChange={(e) => setPasswordTemporal(e.target.value)}
                      required={crearUsuario}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generarContrasena}
                    className="h-11 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="Generar contraseña segura"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Generar</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  El colaborador usará su correo electrónico y esta clave para iniciar sesión.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botones de Acción Inferiores */}
        <div className="pt-2">
          {/* Móvil: Grid 50/50 */}
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
                <span>{empleadoAEditar ? "Guardar" : "Registrar"}</span>
              )}
            </button>
          </div>

          {/* Desktop: Centrado con tamaños mínimos */}
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
                <span>{empleadoAEditar ? "Guardar Cambios" : "Completar Registro"}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
