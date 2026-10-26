import React from "react";

// Formateador de moneda en USD (sin decimales para cánones enteros, ej: $150)
export function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

// Formateador de moneda en USD con 2 decimales obligatorios (ej: $150.00)
export function formatCurrencyDecimals(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

// Generador de enlace directo a WhatsApp (limpia caracteres no numéricos)
export function getWhatsAppUrl(phone: string | null | undefined, text?: string): string {
  if (!phone) return "#";
  const clean = phone.replace(/\D/g, "");
  const base = `https://wa.me/${clean}`;
  if (text) {
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  return base;
}

// Icono SVG oficial de WhatsApp
export function WhatsAppIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.115.552 4.179 1.6 6.004L.057 24l6.163-1.543a11.97 11.97 0 0 0 5.811 1.575h.005c6.632 0 12.026-5.394 12.026-12.031A12.03 12.03 0 0 0 12.031 0zm0 22.028c-1.815 0-3.593-.487-5.15-1.411l-.37-.22-3.833.96 1.022-3.737-.24-.383A9.972 9.972 0 0 1 2.05 12.03C2.05 6.528 6.528 2.05 12.031 2.05c2.668 0 5.176 1.04 7.06 2.923a9.92 9.92 0 0 1 2.922 7.058c0 5.503-4.478 9.997-9.982 9.997zm5.474-7.48c-.3-.15-1.776-.876-2.052-.976-.275-.1-.476-.15-.676.15-.2.3-.776.976-.951 1.176-.175.2-.35.226-.65.076-.3-.15-1.267-.467-2.414-1.49-.893-.796-1.495-1.78-1.67-2.08-.175-.3-.019-.463.132-.612.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.63-.926-2.23-.243-.585-.49-.506-.675-.515l-.575-.01c-.2 0-.525.075-.8.375s-1.05 1.026-1.05 2.502c0 1.476 1.075 2.902 1.225 3.102.15.2 2.115 3.23 5.125 4.53.716.31 1.275.494 1.711.632.72.23 1.374.197 1.892.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z" />
    </svg>
  );
}
