"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
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
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 id="modal-title" className="text-lg font-bold font-heading text-brand-navy">
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100"
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
