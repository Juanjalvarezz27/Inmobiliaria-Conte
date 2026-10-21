"use client";

import { useState } from "react";
import { User, KeyRound, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { Select } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { CargoEmpleado } from "@prisma/client";
import { CARGO_CONFIG, getFechaLocalHoy, type EmpleadoItem, type PropiedadOpcion } from "./types";
import type { CreateEmpleadoInput } from "@/lib/actions/personal";

interface EmpleadoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleadoAEditar?: EmpleadoItem | null;
  propiedadPreseleccionadaId?: string | null;
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
  propiedadPreseleccionadaId,
  propiedades,
  onSubmit,
  isLoading = false,
}: EmpleadoFormModalProps) {
  const hoyStr = getFechaLocalHoy();

  const opcionesPropiedades = [
    { value: "GENERAL", label: "General / Sin propiedad específico" },
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
  const [cargoPersonalizado, setCargoPersonalizado] = useState(
    empleadoAEditar?.cargoPersonalizado || ""
  );
  const [fechaIngreso, setFechaIngreso] = useState(
    empleadoAEditar?.fechaIngreso ? empleadoAEditar.fechaIngreso.split("T")[0] : hoyStr
  );
  const [salarioMensual, setSalarioMensual] = useState<string>(
    empleadoAEditar?.salarioMensual ? empleadoAEditar.salarioMensual.toString() : ""
  );
  const [propiedadId, setPropiedadId] = useState<string>(
    empleadoAEditar?.propiedadId || propiedadPreseleccionadaId || "GENERAL"
  );
  const [notas, setNotas] = useState(empleadoAEditar?.notas || "");

  // Gestión de contraseña para acceso al portal móvil
  const [passwordTemporal, setPasswordTemporal] = useState("");

  // Sincronizar estado cuando cambia el empleado a editar
  const [prevTarget, setPrevTarget] = useState<{ id?: string; isOpen: boolean; propId?: string | null }>({
    id: empleadoAEditar?.id,
    isOpen,
    propId: propiedadPreseleccionadaId,
  });

  if (
    prevTarget.id !== empleadoAEditar?.id ||
    prevTarget.isOpen !== isOpen ||
    prevTarget.propId !== propiedadPreseleccionadaId
  ) {
    setPrevTarget({ id: empleadoAEditar?.id, isOpen, propId: propiedadPreseleccionadaId });
    if (empleadoAEditar) {
      setNombre(empleadoAEditar.nombre);
      setApellido(empleadoAEditar.apellido || "");
      setCedula(empleadoAEditar.cedula);
      setTelefono(empleadoAEditar.telefono);
      setEmail(empleadoAEditar.email || "");
      setDireccion(empleadoAEditar.direccion || "");
      setCargo(empleadoAEditar.cargo);
      setCargoPersonalizado(empleadoAEditar.cargoPersonalizado || "");
      setFechaIngreso(empleadoAEditar.fechaIngreso ? empleadoAEditar.fechaIngreso.split("T")[0] : hoyStr);
      setSalarioMensual(empleadoAEditar.salarioMensual ? empleadoAEditar.salarioMensual.toString() : "");
      setPropiedadId(empleadoAEditar.propiedadId || "GENERAL");
      setNotas(empleadoAEditar.notas || "");
      setPasswordTemporal("");
    } else {
      setNombre("");
      setApellido("");
      setCedula("");
      setTelefono("+58");
      setEmail("");
      setDireccion("");
      setCargo(CargoEmpleado.CONSERJE);
      setCargoPersonalizado("");
      setFechaIngreso(hoyStr);
      setSalarioMensual("");
      setPropiedadId(propiedadPreseleccionadaId || "GENERAL");
      setNotas("");
      setPasswordTemporal("");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error("El nombre del trabajador es requerido.");
      return;
    }
    if (!cedula.trim()) {
      toast.error("La cédula de identidad es requerida.");
      return;
    }
    if (!telefono.trim() || telefono === "+58") {
      toast.error("El teléfono de contacto es requerido.");
      return;
    }

    if (cargo === CargoEmpleado.OTRO && !cargoPersonalizado.trim()) {
      toast.error("Por favor especifique el nombre del cargo.");
      return;
    }

    // Validación de contraseña si hay correo
    if (!empleadoAEditar && email.trim() && !passwordTemporal.trim()) {
      toast.error("Por favor asigne una contraseña de acceso para el trabajador.");
      return;
    }
    if (passwordTemporal.trim() && passwordTemporal.trim().length < 6) {
      toast.error("La contraseña de acceso debe tener al menos 6 caracteres.");
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
      cargoPersonalizado: cargo === CargoEmpleado.OTRO ? cargoPersonalizado.trim() : null,
      fechaIngreso,
      salarioMensual: salarioMensual ? parseFloat(salarioMensual) : null,
      propiedadId: propiedadId === "GENERAL" ? null : propiedadId,
      notas: notas.trim() || null,
      crearUsuario: Boolean(email.trim()),
      passwordTemporal: passwordTemporal.trim() || null,
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
      title={empleadoAEditar ? "Editar Trabajador" : "Registrar Trabajador"}
      icon={User}
      headerVariant="green"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
                Correo Electrónico (Acceso al Portal Móvil)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: trabajador@inmobiliariaconte.com"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Se utilizará como usuario para el inicio de sesión en el Portal del Trabajador (<code>/empleado</code>).
              </p>
            </div>
          </div>
        </div>

        {/* Sección 2: Ficha Laboral */}
        <div className="space-y-4">
          <FormSectionHeader step={2} title="Ficha Laboral y Cargo" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Propiedad Asignada a ancho completo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Propiedad Asignada
              </label>
              <Select
                value={propiedadId}
                onChange={setPropiedadId}
                options={opcionesPropiedades}
                placeholder="Seleccionar propiedad"
                searchable={true}
                searchPlaceholder="Buscar propiedad..."
                icon={<Building2 className="w-4 h-4 text-slate-400" />}
              />
            </div>

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

            {/* Campo condicional para especificar cargo cuando es OTRO */}
            {cargo === CargoEmpleado.OTRO && (
              <div className="sm:col-span-2 animate-in fade-in-0 duration-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Especificar Cargo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={cargoPersonalizado}
                  onChange={(e) => setCargoPersonalizado(e.target.value)}
                  placeholder="Ej: Pintor, Jardinero..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>
            )}

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
                placeholder="Especialidad o notas del colaborador..."
                rows={3}
                className="w-full p-3 min-h-[84px] rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Acceso al Sistema */}
        <div className="space-y-4">
          <FormSectionHeader step={3} title="Credenciales de Acceso al Portal Móvil" />

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            {/* Estado de la cuenta */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">
                {empleadoAEditar?.usuarioId
                  ? "Cuenta de Acceso Vinculada"
                  : "Acceso al Portal del Trabajador"}
              </span>
              {empleadoAEditar?.usuarioId ? (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  Activa
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  Automática
                </span>
              )}
            </div>

            {/* Input de contraseña */}
            <div className="pt-3 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {empleadoAEditar?.usuarioId
                    ? "Nueva Contraseña (Opcional)"
                    : "Contraseña Inicial de Acceso"}
                </label>
                {empleadoAEditar?.usuarioId && (
                  <span className="text-[11px] font-medium text-slate-400">
                    Dejar en blanco para mantener la actual
                  </span>
                )}
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={passwordTemporal}
                  onChange={(e) => setPasswordTemporal(e.target.value)}
                  placeholder={
                    empleadoAEditar?.usuarioId
                      ? "Dejar en blanco para mantener la actual..."
                      : "Ej: Conte2026*"
                  }
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                {empleadoAEditar?.usuarioId
                  ? "Si el trabajador olvidó su clave, escriba una nueva para reestablecerla de inmediato."
                  : "Contraseña con la que el trabajador iniciará sesión por primera vez."}
              </p>
            </div>
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
