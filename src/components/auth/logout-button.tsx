"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { logoutAction } from "@/lib/actions/auth-actions";

export function LogoutButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Cerrar Sesión
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isLoggingOut && setIsModalOpen(false)}
        title="Confirmar Cierre de Sesión"
      >
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          ¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a ingresar tus credenciales la próxima vez que accedas.
        </p>
        
        <form 
          action={() => {
            setIsLoggingOut(true);
            logoutAction();
          }}
          className="flex justify-end gap-3"
        >
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            disabled={isLoggingOut}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoggingOut}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-red hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm shadow-red-600/20 cursor-pointer"
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cerrando sesión...
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
