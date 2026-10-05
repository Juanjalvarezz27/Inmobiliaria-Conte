"use client";

import React, { useState } from "react";
import { Modal } from "./modal";
import { AlertTriangle, RefreshCw, CheckCircle2, type LucideIcon } from "lucide-react";

export interface ConfirmItemDetail {
  label: string;
  value: React.ReactNode;
}

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  icon?: LucideIcon;
  variant?: "danger" | "warning" | "navy";
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  confirmationKeyword?: string;
  itemDetails?: ConfirmItemDetail[];
  infoNote?: React.ReactNode;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  icon: Icon = AlertTriangle,
  variant = "danger",
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
  isLoading = false,
  confirmationKeyword,
  itemDetails = [],
  infoNote,
}: ConfirmActionModalProps) {
  const [inputText, setInputText] = useState("");

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setInputText("");
    }
  }

  const targetKeyword = confirmationKeyword?.trim().toUpperCase();
  const currentInput = inputText.trim().toUpperCase();
  const isKeywordMatching = !targetKeyword || currentInput === targetKeyword;
  const isConfirmDisabled = isLoading || !isKeywordMatching;

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isConfirmDisabled) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const headerVariant = variant === "danger" ? "red" : "default";

  // Estilos según la variante
  const variantStyles = {
    danger: {
      btn: "bg-[#CC1A22] hover:bg-[#a81219] text-white border-b-[3px] border-b-[#8a1117] shadow-[0_2px_8px_rgba(204,26,34,0.25)]",
      badgeKeyword: "bg-rose-100 text-rose-800 border-rose-200",
      accentBg: "bg-rose-50 border-rose-200/80 text-rose-900",
      iconColor: "text-[#CC1A22]",
    },
    warning: {
      btn: "bg-[#1C2539] hover:bg-[#2a3754] text-white border-b-[3px] border-b-[#0f1420] shadow-[0_2px_8px_rgba(28,37,57,0.25)]",
      badgeKeyword: "bg-amber-100 text-amber-900 border-amber-200",
      accentBg: "bg-amber-50/80 border-amber-200/80 text-amber-950",
      iconColor: "text-amber-600",
    },
    navy: {
      btn: "bg-[#1C2539] hover:bg-[#2a3754] text-white border-b-[3px] border-b-[#0f1420] shadow-[0_2px_8px_rgba(28,37,57,0.25)]",
      badgeKeyword: "bg-slate-100 text-slate-900 border-slate-200",
      accentBg: "bg-slate-50 border-slate-200/80 text-slate-800",
      iconColor: "text-slate-600",
    },
  }[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      subtitle={subtitle}
      icon={Icon}
      headerVariant={headerVariant}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Descripción principal */}
        <div className="text-sm text-slate-600 leading-relaxed">
          {description}
        </div>

        {/* Resumen del elemento involucrado */}
        {itemDetails.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
            {itemDetails.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs gap-3 border-b border-slate-200/50 last:border-b-0 pb-1.5 last:pb-0"
              >
                <span className="text-slate-400 font-medium shrink-0">
                  {item.label}
                </span>
                <span className="font-bold text-slate-900 text-right truncate">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Nota o advertencia complementaria */}
        {infoNote && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${variantStyles.accentBg}`}
          >
            {infoNote}
          </div>
        )}

        {/* Campo de confirmación obligatoria con palabra clave */}
        {confirmationKeyword && (
          <div className="pt-1 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Para autorizar esta acción, escribe{" "}
              <span
                className={`font-mono font-bold px-1.5 py-0.5 rounded border select-all ${variantStyles.badgeKeyword}`}
              >
                {confirmationKeyword}
              </span>{" "}
              a continuación:
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={`Escribe ${confirmationKeyword}`}
                className={`w-full px-3.5 h-10 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 ${
                  isKeywordMatching && inputText.length > 0
                    ? "border-emerald-500 focus:ring-emerald-500/20 text-emerald-900 bg-emerald-50/20"
                    : "border-slate-300 focus:ring-[#1C2539]/20 focus:border-[#1C2539] text-slate-900"
                }`}
              />
              {isKeywordMatching && inputText.length > 0 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
        )}

        {/* Botones de acción inferiores */}
        <div className="pt-2 grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[120px] h-10 sm:h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {cancelButtonText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`w-full sm:w-auto min-w-[150px] h-10 sm:h-10 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-0.5 ${variantStyles.btn}`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <span className="truncate">{confirmButtonText}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
