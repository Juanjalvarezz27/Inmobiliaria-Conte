"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  headerVariant?: "default" | "red" | "green";
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, headerVariant = "default", children }: ModalProps) {
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

  const headerStyles = {
    default: {
      bar: "px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-brand-navy",
      closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
    },
    red: {
      bar: "px-6 py-4 bg-[#CC1A22] text-white",
      closeBtn: "text-white/80 hover:text-white hover:bg-white/15",
    },
    green: {
      bar: "px-6 py-4 bg-[#175E38] text-white",
      closeBtn: "text-white/80 hover:text-white hover:bg-white/15",
    },
  }[headerVariant];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Contenedor del Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {title && (
          <div className={`flex items-center justify-between ${headerStyles.bar}`}>
            <h3 id="modal-title" className="text-lg font-bold font-heading">
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className={`transition-colors rounded-full p-1.5 cursor-pointer ${headerStyles.closeBtn}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
