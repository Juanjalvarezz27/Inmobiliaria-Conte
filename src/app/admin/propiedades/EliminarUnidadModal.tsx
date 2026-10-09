"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { UnidadConPropiedad } from "./types";

interface EliminarUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: UnidadConPropiedad | null;
  onEliminar: () => void;
  isLoading: boolean;
}

export function EliminarUnidadModal({
  isOpen,
  onClose,
  unidad,
  onEliminar,
  isLoading,
}: EliminarUnidadModalProps) {
  if (!unidad) return null;

  const tieneContratosActivos = (unidad.contratos?.length ?? 0) > 0;
  const tieneHistorialContratos = (unidad._count?.contratos ?? 0) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        tieneContratosActivos
          ? "Espacio con Contrato Vigente"
          : tieneHistorialContratos
          ? "Inactivar Espacio"
          : "Eliminar Espacio"
      }
      headerVariant="red"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          ¿Deseas retirar el espacio{" "}
          <strong className="text-slate-900">{unidad.codigo}</strong> de la propiedad{" "}
          <strong className="text-slate-900">{unidad.propiedad.nombre}</strong>?
        </p>

        {tieneContratosActivos ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
            ⚠️ <strong>Contrato de arrendamiento vigente:</strong> Este espacio está ocupado con el contrato{" "}
            <strong>{unidad.contratos![0].codigo}</strong>. No puede ser eliminado ni inactivado hasta que el contrato sea finalizado o rescindido formalmente.
          </div>
        ) : tieneHistorialContratos ? (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
            🛡️ <strong>Preservación contable:</strong> Este espacio posee contratos en su historial contable. No será borrado de la base de datos para no romper los contratos antiguos y recibos. Pasará a estado <strong>INACTIVO</strong> y no aparecerá en el catálogo para ser alquilado.
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
            Este espacio no posee contratos en su historial. Se eliminará de forma segura y permanente junto a sus imágenes asociadas.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onEliminar}
            disabled={isLoading || tieneContratosActivos}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : tieneHistorialContratos ? (
              "Inactivar Espacio"
            ) : (
              "Eliminar Espacio"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
