"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  headerVariant?: "default" | "red" | "green";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  backdropBlur?: boolean;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  headerVariant = "default",
  maxWidth = "md",
  backdropBlur = false,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const mounted = useIsMounted();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  const headerStyles = {
    default: {
      bar: "px-6 py-4.5 border-b border-slate-100 bg-slate-50/60 text-brand-navy",
      closeBtn: "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60",
      subtitleColor: "text-slate-500",
      iconBg: "bg-slate-200/80 text-slate-700 border border-slate-300/60",
    },
    red: {
      bar: "px-6 py-4.5 bg-gradient-to-r from-[#CC1A22] to-[#b3141b] text-white border-b border-red-800/30",
      closeBtn: "text-white/80 hover:text-white hover:bg-white/20",
      subtitleColor: "text-red-100/90",
      iconBg: "bg-white/15 text-white border border-white/20 shadow-2xs",
    },
    green: {
      bar: "px-6 py-4.5 bg-gradient-to-r from-[#175E38] via-[#1a683e] to-[#124b2d] text-white border-b border-emerald-900/30 shadow-xs",
      closeBtn: "text-white/80 hover:text-white hover:bg-white/20",
      subtitleColor: "text-emerald-100/90",
      iconBg: "bg-white/15 text-white border border-white/20 shadow-2xs",
    },
  }[headerVariant];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Overlay oscuro sin blur difuminado */}
      <div
        className={`fixed inset-0 bg-slate-950/70 transition-opacity animate-fadeIn ${
          backdropBlur ? "backdrop-blur-sm" : ""
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Modal */}
      <div
        ref={modalRef}
        className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.45)] w-full ${
          maxWidthClasses[maxWidth] || "max-w-md"
        } max-h-[92vh] flex flex-col overflow-hidden animate-slideUp my-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {title && (
          <div className={`flex items-center justify-between shrink-0 ${headerStyles.bar}`}>
            <div className="flex items-center gap-3 min-w-0 pr-3">
              {Icon && (
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${headerStyles.iconBg}`}>
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              )}
              <div className="min-w-0">
                <h3 id="modal-title" className="text-base sm:text-lg font-extrabold font-heading tracking-tight leading-tight truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className={`text-xs font-medium mt-0.5 leading-snug ${headerStyles.subtitleColor}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className={`transition-colors rounded-xl p-1.5 cursor-pointer shrink-0 ${headerStyles.closeBtn}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
