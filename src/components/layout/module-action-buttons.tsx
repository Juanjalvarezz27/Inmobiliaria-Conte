"use client";

import { useState } from "react";
import { notify } from "@/lib/notifications";

interface ModuleActionButtonsProps {
  title: string;
}

export function ModuleActionButtons({ title }: ModuleActionButtonsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleStatusCheck = () => {
    notify.info(
      `Estado del módulo: ${title}`,
      "Esta funcionalidad se encuentra en desarrollo activo y se habilitará en las siguientes fases del sistema."
    );
  };

  const handleSubscribe = () => {
    if (isSubscribed) {
      notify.info(
        "Aviso ya registrado",
        `Ya tienes programada una notificación para cuando el módulo "${title}" esté disponible.`
      );
      return;
    }
    setIsSubscribed(true);
    notify.success(
      "Aviso programado",
      `Te notificaremos en tu panel en cuanto el módulo "${title}" esté habilitado.`
    );
  };

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        notify.info(
          "Enlace copiado al portapapeles",
          `Ruta directa al módulo "${title}" copiada con éxito.`
        );
      }
    } catch {
      notify.warning(
        "No se pudo copiar el enlace",
        "Por favor copia la dirección URL manualmente desde la barra del navegador."
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-2">
      <button
        type="button"
        onClick={handleStatusCheck}
        className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Consultar estado</span>
      </button>

      <button
        type="button"
        onClick={handleSubscribe}
        className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
          isSubscribed
            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
            : "text-[#175E38] hover:bg-emerald-50 bg-white border-emerald-200/80 hover:border-emerald-300"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>{isSubscribed ? "Notificación activada" : "Avisarme al activarse"}</span>
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>Copiar enlace</span>
      </button>
    </div>
  );
}
