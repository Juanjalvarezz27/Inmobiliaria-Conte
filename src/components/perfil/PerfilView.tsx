"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  CreditCard,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Calendar,
  Building2,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { notify } from "@/lib/notifications";
import { actualizarPasswordAction, type PerfilUsuarioData } from "@/lib/actions/perfil";

interface PerfilViewProps {
  usuario: PerfilUsuarioData;
}

export function PerfilView({ usuario }: PerfilViewProps) {
  // Estados para el cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(usuario.mustChangePassword);

  // Iniciales para el avatar
  const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido?.charAt(0) || ""}`.toUpperCase();

  // Validación en tiempo real
  const cumpleLongitud = passwordNueva.length >= 6;
  const coinciden = passwordNueva.length > 0 && passwordNueva === passwordConfirmacion;
  const requiereActual = !mustChangePassword;
  const formularioValido = cumpleLongitud && coinciden && (!requiereActual || passwordActual.trim().length > 0);

  // Fecha de registro formateada
  const fechaRegistro = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(usuario.createdAt));

  const roleStyles = {
    ADMIN: {
      label: "ADMINISTRADOR",
      bg: "bg-amber-400/10",
      border: "border-amber-400/30",
      text: "text-amber-300",
      badge: "bg-amber-50 text-amber-800 border-amber-200",
    },
    EMPLEADO: {
      label: "PERSONAL",
      bg: "bg-sky-400/10",
      border: "border-sky-400/30",
      text: "text-sky-300",
      badge: "bg-sky-50 text-sky-800 border-sky-200",
    },
    INQUILINO: {
      label: "INQUILINO",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/30",
      text: "text-emerald-300",
      badge: "bg-emerald-50 text-[#175E38] border-emerald-200",
    },
  }[usuario.rol];

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido || isPending) return;

    setIsPending(true);
    try {
      const res = await actualizarPasswordAction({
        passwordActual: requiereActual ? passwordActual.trim() : undefined,
        passwordNueva: passwordNueva.trim(),
        passwordConfirmacion: passwordConfirmacion.trim(),
      });

      if (res.success) {
        notify.success("¡Contraseña actualizada!", res.message);
        setPasswordActual("");
        setPasswordNueva("");
        setPasswordConfirmacion("");
        setMustChangePassword(false);
      } else {
        notify.error("Error", res.message);
      }
    } catch {
      notify.error("Error", "Ocurrió un error inesperado al actualizar la contraseña.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Banner Institucional de Cabecera */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-8 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
        {/* Resplandor ambiental de marca verde esmeralda */}
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

        {/* Fila Superior: Badges de Contexto y Estado de Cuenta */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest font-heading">
              Mi Perfil de Usuario
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${roleStyles.bg} ${roleStyles.border} ${roleStyles.text}`}
            >
              {roleStyles.label}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[11px] sm:text-xs text-slate-200 font-semibold backdrop-blur-xs shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>Cuenta Activa</span>
          </span>
        </div>

        {/* Bloque Principal: Avatar e Identidad del Usuario */}
        <div className="relative z-10 flex items-center gap-3.5 sm:gap-5">
          {/* Avatar con Iniciales */}
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#175E38] to-[#124b2d] flex items-center justify-center text-white text-lg sm:text-2xl font-black font-heading border-2 border-white/20 shadow-lg shrink-0">
            {iniciales}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white truncate">
              {usuario.nombre} {usuario.apellido || ""}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-mono truncate mt-0.5 sm:mt-1">
              {usuario.email}
            </p>

            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Miembro desde {fechaRegistro}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. Cuadrícula Principal (Datos de Cuenta vs Seguridad) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Ficha de Información de Usuario */}
        <section className="lg:col-span-5 relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] p-5 sm:p-6 space-y-5">
          {/* Efecto Sol en esquina superior izquierda */}
          <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
            <div className="absolute inset-0 rounded-full blur-xl bg-emerald-600/15" />
            <div className="absolute inset-3 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05]" />
          </div>

          <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Información de la Cuenta
                </h2>
                <p className="text-[11px] text-slate-400">Datos registrados en el sistema</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${roleStyles.badge}`}>
              {roleStyles.label}
            </span>
          </div>

          {/* Lista de Campos de Contacto */}
          <div className="relative z-10 space-y-3.5 text-xs">
            {/* Nombre Completo */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Nombre Completo
                </span>
                <span className="font-bold text-slate-800 text-sm truncate block mt-0.5">
                  {usuario.nombre} {usuario.apellido || ""}
                </span>
              </div>
              <User className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Correo Electrónico */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Correo Electrónico (Login)
                </span>
                <span className="font-bold text-slate-800 text-sm truncate block mt-0.5 font-mono">
                  {usuario.email}
                </span>
              </div>
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Documento / Cédula */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Documento de Identidad
                </span>
                <span className="font-bold text-slate-800 text-sm truncate block mt-0.5">
                  {usuario.cedula || usuario.inquilino?.documentoIdentidad || usuario.empleado?.cedula || "No registrado"}
                </span>
              </div>
              <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Teléfono */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Teléfono de Contacto
                </span>
                <span className="font-bold text-slate-800 text-sm truncate block mt-0.5">
                  {usuario.telefono || usuario.inquilino?.telefono || usuario.empleado?.telefono || "No registrado"}
                </span>
              </div>
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Dirección */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Dirección
                </span>
                <span className="font-medium text-slate-700 text-xs truncate block mt-0.5">
                  {usuario.direccion || "San Cristóbal, Estado Táchira"}
                </span>
              </div>
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Datos Especiales según el Rol */}
            {usuario.empleado && (
              <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sky-800 font-bold text-[11px] uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Datos Operativos</span>
                </div>
                <div className="text-xs text-sky-950">
                  <strong>Cargo:</strong> {usuario.empleado.cargoPersonalizado || usuario.empleado.cargo}
                </div>
                {usuario.empleado.propiedadNombre && (
                  <div className="text-xs text-sky-950">
                    <strong>Sede:</strong> {usuario.empleado.propiedadNombre}
                  </div>
                )}
              </div>
            )}

            {usuario.inquilino && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[#175E38] font-bold text-[11px] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Condición Arrendataria</span>
                </div>
                <div className="text-xs text-emerald-950">
                  <strong>Tipo:</strong> {usuario.inquilino.tipoPersona === "JURIDICA" ? "Empresa / Jurídica" : "Persona Natural"}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Columna Derecha: Seguridad y Cambio de Contraseña */}
        <section className="lg:col-span-7 relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07)] p-5 sm:p-6 space-y-5">
          {/* Efecto Sol en esquina superior izquierda */}
          <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
            <div className="absolute inset-0 rounded-full blur-xl bg-purple-600/15" />
            <div className="absolute inset-3 rounded-full border border-purple-500/20 bg-purple-500/[0.05]" />
          </div>

          <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Seguridad de la Cuenta
                </h2>
                <p className="text-[11px] text-slate-400">Actualiza tu contraseña de acceso</p>
              </div>
            </div>
            {mustChangePassword ? (
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Clave Provisional (123456)
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Opcional
              </span>
            )}
          </div>

          {/* Alerta si tiene clave provisional */}
          {mustChangePassword && (
            <div className="relative z-10 p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Contraseña por defecto activa:</strong> Tu cuenta utiliza la clave inicial estandarizada (<code>123456</code>). Puedes personalizarla a continuación sin necesidad de escribir la clave actual.
              </div>
            </div>
          )}

          {/* Formulario de Contraseña */}
          <form onSubmit={handleCambiarPassword} className="relative z-10 space-y-4">
            {/* Contraseña Actual (solo requerida si no tiene clave provisional) */}
            {requiereActual && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showActual ? "text" : "password"}
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    placeholder="Tu clave actual"
                    required
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActual(!showActual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    aria-label="Mostrar contraseña actual"
                  >
                    {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNueva ? "text" : "password"}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNueva(!showNueva)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label="Mostrar nueva contraseña"
                >
                  {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmar Nueva Contraseña *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={passwordConfirmacion}
                  onChange={(e) => setPasswordConfirmacion(e.target.value)}
                  placeholder="Repite la nueva clave"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label="Mostrar confirmación"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Indicadores Dinámicos de Validación */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
              <div className={`flex items-center gap-2 transition-colors ${cumpleLongitud ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                {cumpleLongitud ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                )}
                <span>Mínimo 6 caracteres</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${coinciden ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                {coinciden ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                )}
                <span>Las contraseñas coinciden</span>
              </div>
            </div>

            {/* Botón de Guardado */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!formularioValido || isPending}
                className="w-full h-11 px-5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Actualizar Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

