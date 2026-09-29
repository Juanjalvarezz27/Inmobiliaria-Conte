"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { logoutAction } from "@/lib/actions/auth-actions";

interface LogoutButtonProps {
  variant?: "pill" | "icon" | "menuItem" | "red";
  className?: string;
}

export function LogoutButton({ variant = "red", className = "" }: LogoutButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  return (
    <>
      {variant === "red" ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`px-4 py-2 rounded-xl bg-[#CC1A22] hover:bg-red-700 text-white text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm border border-red-500/40 hover:shadow-md ${className}`}
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      ) : variant === "icon" ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`p-2.5 rounded-xl border border-white/10 hover:border-red-400/40 bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-300 transition-all duration-200 flex items-center justify-center cursor-pointer group shadow-2xs ${className}`}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <svg
            className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      ) : variant === "menuItem" ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 transition-all duration-150 cursor-pointer ${className}`}
        >
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`px-4 py-2 rounded-xl bg-[#CC1A22] hover:bg-red-700 text-white text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm border border-red-500/40 hover:shadow-md ${className}`}
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isLoggingOut && setIsModalOpen(false)}
        title="Confirmar Cierre de Sesión"
        headerVariant="red"
      >
        <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed font-normal text-center">
          ¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a ingresar tus credenciales la próxima vez que accedas.
        </p>

        <form
          action={() => {
            setIsLoggingOut(true);
            logoutAction();
          }}
          className="flex items-center justify-center gap-3.5 pt-1"
        >
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            disabled={isLoggingOut}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoggingOut}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-red hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm shadow-red-600/20 cursor-pointer"
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Cerrando sesión...</span>
              </>
            ) : (
              "Sí, cerrar sesión"
            )}
          </button>
        </form>
      </Modal>
    </>
  );
}
