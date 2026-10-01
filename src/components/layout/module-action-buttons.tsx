"use client";

import { useState } from "react";
import { Info, Bell, Check, Copy } from "lucide-react";
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
        <Info className="w-3.5 h-3.5 text-slate-500" />
        <span>Ver estado</span>
      </button>

      <button
        type="button"
        onClick={handleSubscribe}
        className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
          isSubscribed
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80"
        }`}
      >
        {isSubscribed ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            <span>Aviso activado</span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <span>Notificarme al lanzar</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
      >
        <Copy className="w-3.5 h-3.5 text-slate-500" />
        <span>Copiar enlace</span>
      </button>
    </div>
  );
}
