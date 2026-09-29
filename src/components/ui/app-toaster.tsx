"use client";

import { Toaster } from "sonner";

// Componente Toaster global configurado con la paleta y tipografía de Inmobiliaria Conté
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        className: "font-sans text-sm rounded-2xl shadow-xl border border-slate-200/80 p-4",
        descriptionClassName: "text-xs text-slate-600 font-normal leading-relaxed mt-0.5",
        classNames: {
          success: "!bg-emerald-50 !border-emerald-200 !text-emerald-950",
          error: "!bg-red-50 !border-red-200 !text-red-950",
          warning: "!bg-amber-50 !border-amber-200 !text-amber-950",
          info: "!bg-sky-50 !border-sky-200 !text-sky-950",
          title: "font-heading font-semibold text-sm",
          closeButton: "!border-slate-200 hover:!bg-slate-200 !text-slate-600",
        },
      }}
    />
  );
}
