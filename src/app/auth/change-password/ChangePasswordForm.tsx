"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Eye, EyeOff, ShieldCheck, Check, AlertCircle, ArrowRight, LogOut, Loader2 } from "lucide-react";
import { cambiarPasswordPrimerAcceso } from "@/lib/actions/inquilinosAcceso";
import { logoutAction } from "@/lib/actions/auth-actions";
import { notify } from "@/lib/notifications";

interface ChangePasswordFormProps {
  nombreUsuario: string;
  emailUsuario: string;
}

export function ChangePasswordForm({ nombreUsuario, emailUsuario }: ChangePasswordFormProps) {
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const cumpleLongitud = passwordNueva.length >= 6;
  const coinciden = passwordNueva.length > 0 && passwordNueva === passwordConfirmacion;
  const esValido = cumpleLongitud && coinciden;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValido) {
      notify.error("Datos incompletos", "Verifica que la contraseña cumpla los requisitos de seguridad.");
      return;
    }

    setIsPending(true);
    try {
      const res = await cambiarPasswordPrimerAcceso({
        passwordNueva,
        passwordConfirmacion,
      });

      if (res.success) {
        notify.success("¡Contraseña actualizada!", "Bienvenido a tu portal. Redirigiendo...");
        // Redirigir refrescando estado de sesión para el guardián de rutas
        setTimeout(() => {
          window.location.href = "/inquilino";
        }, 1000);
      } else {
        notify.error("Error", res.message);
        setIsPending(false);
      }
    } catch {
      notify.error("Error", "Ocurrió un error inesperado al actualizar la contraseña.");
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(28,37,57,0.12)] border border-slate-200/90 relative overflow-hidden">
        {/* Efecto sol decorativo superior */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#175E38]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Cabecera institucional */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo.png"
              alt="Inmobiliaria Conté"
              width={140}
              height={50}
              priority
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-200 mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#175E38]" />
            <span>Seguridad de la Cuenta</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
            Personaliza tu Contraseña
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hola <strong className="text-slate-800">{nombreUsuario}</strong> ({emailUsuario}). Puedes actualizar tu clave de acceso en cualquier momento.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
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
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-10 h-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                aria-label={showNueva ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirmar Contraseña *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showConfirmacion ? "text" : "password"}
                value={passwordConfirmacion}
                onChange={(e) => setPasswordConfirmacion(e.target.value)}
                required
                placeholder="Repite tu contraseña"
                className="w-full pl-10 pr-10 h-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmacion(!showConfirmacion)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                aria-label={showConfirmacion ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showConfirmacion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Indicadores de Requisitos */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-xs">
            <div className={`flex items-center gap-1.5 transition-colors ${cumpleLongitud ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              {cumpleLongitud ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />}
              <span>Mínimo 6 caracteres</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${coinciden ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
              {coinciden ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />}
              <span>Las contraseñas coinciden exactamente</span>
            </div>
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={!esValido || isPending}
            className="w-full h-11 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Actualizando contraseña...</span>
              </>
            ) : (
              <>
                <span>Guardar Nueva Contraseña</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Enlaces de retorno y salir */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
          <a
            href="/inquilino"
            className="text-slate-600 hover:text-[#175E38] transition-colors"
          >
            ← Volver a mi portal
          </a>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

