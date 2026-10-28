"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  Wrench,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  CalendarDays,
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/lib/notifications";
import { cambiarPasswordPrimerAcceso } from "@/lib/actions/inquilinosAcceso";
import { useRouter } from "next/navigation";

interface InquilinoDashboardClientProps {
  nombre: string;
  email: string;
  mustChangePasswordInitial: boolean;
  fechaFormateada: string;
}

export function InquilinoDashboardClient({
  nombre,
  email,
  mustChangePasswordInitial,
  fechaFormateada,
}: InquilinoDashboardClientProps) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tieneClaveProvisional, setTieneClaveProvisional] = useState(mustChangePasswordInitial);

  // Estados del formulario modal de cambio de contraseña
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Validación en tiempo real
  const cumpleLongitud = passwordNueva.length >= 6;
  const coinciden = passwordNueva.length > 0 && passwordNueva === passwordConfirmacion;
  const formularioValido = cumpleLongitud && coinciden;

  const handleCerrarModal = () => {
    if (isPending) return;
    setModalAbierto(false);
    setPasswordNueva("");
    setPasswordConfirmacion("");
  };

  const handleGuardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido || isPending) return;

    setIsPending(true);
    try {
      const res = await cambiarPasswordPrimerAcceso({
        passwordNueva,
        passwordConfirmacion,
      });

      if (res.success) {
        notify.success("¡Contraseña actualizada!", res.message);
        setTieneClaveProvisional(false);
        setModalAbierto(false);
        setPasswordNueva("");
        setPasswordConfirmacion("");
        router.refresh();
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
      {/* 1. Banner Institucional de Bienvenida */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-7 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
        {/* Resplandor ambiental de marca verde esmeralda */}
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Título y Saludo */}
          <div>
            <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
              Portal del Inquilino
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white">
              Bienvenido, {nombre}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Consulta el estado de tu contrato, mantente al día con tus pagos mensuales y solicita asistencia técnica para tu local o propiedad.
            </p>
          </div>

          {/* Fecha del Día */}
          <div className="self-start sm:self-center shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200 font-medium backdrop-blur-xs">
              <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{fechaFormateada}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Banner de Alerta de Contraseña Provisional (Si está activa la clave por defecto 123456) */}
      {tieneClaveProvisional && (
        <section className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50/60 border border-amber-200/90 border-b-[3px] border-b-amber-300/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50 duration-300">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300/60 shadow-2xs">
              <ShieldAlert className="w-5 h-5 text-amber-700 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Contraseña Provisional Activa (123456)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                Tu cuenta está utilizando la contraseña estándar inicial. Te sugerimos personalizarla para mayor privacidad y control de tus recibos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Personalizar Contraseña</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* 3. Cuadrícula de Tarjetas Institucionales 3D (Cards Grid Pattern) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#175E38]" />
            <h2 className="text-sm sm:text-base font-black font-heading text-slate-900 tracking-tight truncate">
              Servicios y Gestión de Alquiler
            </h2>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-100/90 border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs">
            4 servicios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Estado de Cuenta & Recibos */}
          <Link
            href="/inquilino/pagos"
            className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between p-5 sm:p-5.5 cursor-pointer"
          >
            {/* Efecto Sol en esquina superior izquierda */}
            <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-xl bg-emerald-600/20" />
              <div className="absolute inset-3 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
            </div>

            <div className="relative z-10 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform duration-200 shrink-0 bg-emerald-50 text-[#175E38] border-emerald-200/80">
                  <CreditCard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-200/80">
                  Cobranzas
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#175E38] transition-colors font-heading leading-snug">
                  Estado de Cuenta & Recibos
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Descarga tus recibos de pago digitales, consulta el historial y verifica tu saldo actual.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#175E38] group-hover:text-[#124b2d] transition-colors">
              <span>Consultar Recibos</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </Link>

          {/* Card 2: Mi Contrato Vigente */}
          <Link
            href="/inquilino/contrato"
            className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between p-5 sm:p-5.5 cursor-pointer"
          >
            {/* Efecto Sol en esquina superior izquierda */}
            <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-xl bg-blue-600/20" />
              <div className="absolute inset-3 rounded-full border border-blue-500/25 bg-blue-500/[0.08]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
            </div>

            <div className="relative z-10 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform duration-200 shrink-0 bg-blue-50 text-blue-700 border-blue-200/80">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider bg-blue-50 text-blue-800 border-blue-200/80">
                  Alquiler
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors font-heading leading-snug">
                  Mi Contrato Vigente
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Revisa los términos de tu contrato, vigencia, montos acordados y condiciones del local.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-900 transition-colors">
              <span>Ver Contrato</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </Link>

          {/* Card 3: Reportar Falla o Avería */}
          <Link
            href="/inquilino/mantenimiento"
            className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between p-5 sm:p-5.5 cursor-pointer"
          >
            {/* Efecto Sol en esquina superior izquierda */}
            <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-xl bg-amber-500/20" />
              <div className="absolute inset-3 rounded-full border border-amber-500/25 bg-amber-500/[0.08]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
            </div>

            <div className="relative z-10 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform duration-200 shrink-0 bg-amber-50 text-amber-700 border-amber-200/80">
                  <Wrench className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider bg-amber-50 text-amber-800 border-amber-200/80">
                  Asistencia
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors font-heading leading-snug">
                  Reportar Falla o Avería
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Genera una solicitud para reparaciones eléctricas, plomería o mantenimiento en tu espacio.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-900 transition-colors">
              <span>Solicitar Soporte</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </Link>

          {/* Card 4: Mi Perfil & Seguridad */}
          <Link
            href="/inquilino/perfil"
            className="group relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between p-5 sm:p-5.5 cursor-pointer text-left w-full"
          >
            {/* Efecto Sol en esquina superior izquierda */}
            <div className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none">
              <div className="absolute inset-0 rounded-full blur-xl bg-purple-600/20" />
              <div className="absolute inset-3 rounded-full border border-purple-500/25 bg-purple-500/[0.08]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-purple-500/25 to-transparent transition-transform duration-500 group-hover:scale-125" />
            </div>

            <div className="relative z-10 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform duration-200 shrink-0 bg-purple-50 text-purple-700 border-purple-200/80">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider bg-purple-50 text-purple-800 border-purple-200/80">
                  Cuenta
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors font-heading leading-snug">
                  Mi Perfil & Seguridad
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Consulta tus datos registrados y gestiona la seguridad de tu contraseña en cualquier momento.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-900 transition-colors">
              <span>Ver Mi Perfil</span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200/60 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Modal Institucional de Cambio de Contraseña In-Situ */}
      <Modal
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
        title="Personalizar Contraseña"
        subtitle="Actualiza tu clave de acceso al portal del inquilino"
        icon={KeyRound}
        headerVariant="green"
        maxWidth="md"
        backdropBlur={true}
      >
        <form onSubmit={handleGuardarPassword} className="space-y-4 pt-1">
          {/* Mensaje Informativo */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
            Hola <strong className="text-slate-900">{nombre}</strong> ({email}). Introduce tu nueva clave personal para proteger el acceso a tus recibos y contratos.
          </div>

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
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                aria-label="Mostrar contraseña"
              >
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
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
                placeholder="Repite la contraseña"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
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

          {/* Requisitos Dinámicos */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
            <div className={`flex items-center gap-2 transition-colors ${cumpleLongitud ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              {cumpleLongitud ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
              )}
              <span>Mínimo 6 caracteres</span>
            </div>
            <div className={`flex items-center gap-2 transition-colors ${coinciden ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              {coinciden ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
              )}
              <span>Las contraseñas coinciden</span>
            </div>
          </div>

          {/* Botones Inferiores Institucionales (Grid 50/50 en Móvil / Justificados en Desktop) */}
          <div className="pt-2 grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-end w-full">
            <button
              type="button"
              onClick={handleCerrarModal}
              disabled={isPending}
              className="w-full sm:w-auto px-4 h-11 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formularioValido || isPending}
              className="w-full sm:w-auto px-5 h-11 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Guardar Contraseña</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

