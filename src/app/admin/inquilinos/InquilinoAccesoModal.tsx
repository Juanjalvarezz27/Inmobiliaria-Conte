"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Copy,
  Check,
  User,
  AlertCircle,
  Lock,
  Unlock,
  RotateCcw,
} from "lucide-react";
import { WhatsAppIcon, getWhatsAppUrl } from "@/lib/formatters";
import {
  crearAccesoInquilino,
  restablecerClaveInquilino,
  toggleEstadoAccesoInquilino,
} from "@/lib/actions/inquilinosAcceso";
import { notify } from "@/lib/notifications";
import type { InquilinoConContratos } from "./types";

interface InquilinoAccesoModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquilino: InquilinoConContratos | null;
}

export function InquilinoAccesoModal({
  isOpen,
  onClose,
  inquilino,
}: InquilinoAccesoModalProps) {
  const [email, setEmail] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (inquilino) {
      setEmail(inquilino.usuario?.email || inquilino.email || "");
      setCopiado(false);
    }
  }, [inquilino]);

  if (!inquilino) return null;

  const claveInicial = inquilino.documentoIdentidad.trim();
  const tieneUsuario = !!inquilino.usuario;
  const usuarioActivo = inquilino.usuario?.activo ?? true;

  const handleCopiarCredenciales = () => {
    const texto = `Estimado(a) ${inquilino.nombre},\n\nLe damos la bienvenida al Portal Digital de Inmobiliaria Conte C.A.\n\nEnlace de ingreso: ${window.location.origin}/home/login\nUsuario: ${email}\nContraseña: Su Cedula/RIF (${claveInicial})\n\nPuede ingresar directamente y, si lo desea en cualquier momento, cambiar su clave desde su perfil.`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    notify.success("Credenciales copiadas", "Se copiaron los datos al portapapeles listos para enviar.");
    setTimeout(() => setCopiado(false), 3000);
  };

  const getWhatsAppMessageUrl = () => {
    const mensaje = `Estimado(a) ${inquilino.nombre}, le damos la bienvenida al Portal Digital de Inmobiliaria Conte C.A.\n\nEnlace de ingreso: ${window.location.origin}/home/login\nUsuario: ${email}\nContraseña: Su Cedula/RIF (${claveInicial})\n\nPuede ingresar directamente al portal con su cedula.`;
    return getWhatsAppUrl(inquilino.telefono, mensaje);
  };

  const handleCrearAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      notify.error("Correo requerido", "Debes ingresar un correo electrónico válido.");
      return;
    }

    setIsPending(true);
    try {
      const res = await crearAccesoInquilino({
        inquilinoId: inquilino.id,
        email: email.trim().toLowerCase(),
        passwordTemporal: claveInicial,
      });

      if (res.success) {
        notify.success("Acceso digital creado", `Acceso habilitado con Cédula/RIF (${claveInicial}).`);
        onClose();
      } else {
        notify.error("Error al habilitar acceso", res.message);
      }
    } catch {
      notify.error("Error", "Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsPending(false);
    }
  };

  const handleRestablecerClave = async () => {
    setIsPending(true);
    try {
      const res = await restablecerClaveInquilino({
        inquilinoId: inquilino.id,
        passwordTemporal: claveInicial,
      });

      if (res.success) {
        notify.success("Contraseña restablecida", `La clave del inquilino fue restablecida a su Cédula/RIF (${claveInicial}).`);
      } else {
        notify.error("Error", res.message);
      }
    } catch {
      notify.error("Error", "No se pudo restablecer la contraseña.");
    } finally {
      setIsPending(false);
    }
  };

  const handleToggleEstado = async () => {
    setIsPending(true);
    try {
      const res = await toggleEstadoAccesoInquilino(inquilino.id, !usuarioActivo);
      if (res.success) {
        notify.success("Estado actualizado", res.message);
        onClose();
      } else {
        notify.error("Error", res.message);
      }
    } catch {
      notify.error("Error", "No se pudo actualizar el estado de la cuenta.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tieneUsuario ? "Gestión de Acceso Digital" : "Habilitar Acceso Digital"}
      icon={KeyRound}
      headerVariant="green"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Ficha Resumen del Inquilino */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-[#175E38] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate font-heading">
                {inquilino.nombre} {inquilino.apellido ?? ""}
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                {inquilino.documentoIdentidad} • {inquilino.telefono}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {tieneUsuario ? (
              usuarioActivo ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-[#175E38] border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cuenta Activa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  <Lock className="w-3.5 h-3.5" />
                  Suspendida
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                Sin Cuenta
              </span>
            )}
          </div>
        </div>

        {/* MODO 1: CREAR CUENTA NUEVA */}
        {!tieneUsuario && (
          <form onSubmit={handleCrearAcceso} className="space-y-4">
            <FormSectionHeader
              step={1}
              title="Credenciales de Acceso al Portal"
            />

            <div className="space-y-3.5">
              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Correo Electrónico (Usuario de Acceso) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="inquilino@correo.com"
                    className="w-full pl-10 pr-4 h-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Este correo será el usuario con el que el inquilino iniciará sesión.
                </p>
              </div>

              {/* Contraseña inicial (Cédula/RIF) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña Inicial (Cédula o RIF)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={claveInicial}
                    readOnly
                    className="w-full pl-10 pr-4 h-11 text-sm font-mono font-bold tracking-wider bg-slate-50 border border-slate-200 rounded-xl text-slate-900 select-all"
                  />
                </div>
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-600 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200">
                  <AlertCircle className="w-3.5 h-3.5 text-[#175E38] shrink-0 mt-0.5" />
                  <span>
                    La contraseña inicial asignada es el documento de identidad (<strong>{claveInicial}</strong>). El inquilino podrá entrar directamente y personalizarla desde su perfil si lo desea.
                  </span>
                </div>
              </div>

              {/* Opciones de entrega rápida */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Opciones de Entrega de Datos
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarCredenciales}
                    className="h-10 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiado ? "¡Copiado!" : "Copiar Datos"}</span>
                  </button>

                  <a
                    href={getWhatsAppMessageUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-300 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="h-11 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <div className="relative">
                <button
                  type="submit"
                  disabled={isPending}
                  className="relative w-full h-11 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {/* Indicador flotante: Notifica credenciales por correo */}
                  <span
                    className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-md border-2 border-white ring-1 ring-amber-600/30 pointer-events-none"
                    title="Esta acción envía un correo formal con las credenciales al Inquilino"
                  >
                    <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Habilitar Acceso</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* MODO 2: GESTIONAR CUENTA EXISTENTE */}
        {tieneUsuario && (
          <div className="space-y-4">
            <FormSectionHeader
              step={1}
              title="Estado de la Cuenta Digital"
            />

            <div className="space-y-3">
              <div className="space-y-2.5 text-xs">
                {/* 1. Usuario / Correo */}
                <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">
                      Usuario / Correo
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block font-mono">
                      {inquilino.usuario?.email}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 shadow-2xs">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>

                {/* 2. Estado de la Contraseña */}
                <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">
                      Estado de la Cuenta
                    </span>
                    <span className="font-bold text-[#175E38] text-xs sm:text-sm flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Acceso Habilitado (Cédula o Clave Personal)</span>
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-[#175E38] border border-emerald-300">
                      Activo
                    </span>
                  </div>
                </div>
              </div>

              {/* Restablecer a Cédula/RIF */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <div>
                  <h5 className="font-bold text-xs text-slate-800 font-heading">Restablecer Contraseña</h5>
                  <p className="text-[11px] text-slate-500">
                    Devuelve la contraseña del inquilino a su documento de identidad (<strong>{claveInicial}</strong>).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarCredenciales}
                    className="h-9 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiado ? "Copiado" : "Copiar Cédula"}</span>
                  </button>

                  <a
                    href={getWhatsAppMessageUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-300 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={handleRestablecerClave}
                    disabled={isPending}
                    className="relative w-full h-10 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {/* Indicador flotante: Notifica nueva clave por correo */}
                    <span
                      className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-md border-2 border-white ring-1 ring-amber-600/30 pointer-events-none"
                      title="Esta acción envía un correo formal al Inquilino con su clave restablecida"
                    >
                      <Mail className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Contraseña a Cédula ({claveInicial})</span>
                  </button>
                </div>
              </div>

              {/* Suspender o reactivar cuenta */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Acceso al Sistema</span>
                  <p className="text-[11px] text-slate-400">
                    {usuarioActivo
                      ? "El inquilino puede iniciar sesión en su portal."
                      : "El inquilino tiene el acceso bloqueado."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEstado}
                  disabled={isPending}
                  className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    usuarioActivo
                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      : "bg-emerald-50 text-[#175E38] border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {usuarioActivo ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Suspender Acceso</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Reactivar Acceso</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-6 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
