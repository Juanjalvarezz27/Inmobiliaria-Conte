"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Archive,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { PropiedadConConteo, UnidadConPropiedad } from "./types";

interface EliminarPropiedadModalProps {
  isOpen: boolean;
  onClose: () => void;
  propiedad: PropiedadConConteo | null;
  unidades: UnidadConPropiedad[];
  onEliminar: () => void;
  isLoading: boolean;
}

export function EliminarPropiedadModal({
  isOpen,
  onClose,
  propiedad,
  unidades,
  onEliminar,
  isLoading,
}: EliminarPropiedadModalProps) {
  // Inspección de unidades y contratos asociados a la propiedad
  const unidadesDePropiedad = useMemo(() => {
    if (!propiedad) return [];
    return unidades.filter((u) => u.propiedadId === propiedad.id);
  }, [propiedad, unidades]);

  const unidadesConContratosActivos = useMemo(() => {
    return unidadesDePropiedad.filter((u) => u.contratos && u.contratos.length > 0);
  }, [unidadesDePropiedad]);

  const historialContratosPropiedad = useMemo(() => {
    return unidadesDePropiedad.reduce(
      (acc, u) => acc + (u._count?.contratos || 0),
      0
    );
  }, [unidadesDePropiedad]);

  if (!propiedad) return null;

  const tieneContratosActivos = unidadesConContratosActivos.length > 0;
  const tieneHistorialContratos = historialContratosPropiedad > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        tieneContratosActivos
          ? "Eliminación Bloqueada por Contratos Vigentes"
          : tieneHistorialContratos
          ? "Archivar Inmueble"
          : "Eliminar Inmueble Definitivamente"
      }
      icon={
        tieneContratosActivos
          ? ShieldAlert
          : tieneHistorialContratos
          ? Archive
          : Trash2
      }
      headerVariant={
        tieneContratosActivos
          ? "red"
          : tieneHistorialContratos
          ? "default"
          : "red"
      }
      maxWidth="md"
    >
      {tieneContratosActivos ? (
        /* CASO 1: Bloqueo estricto por contratos activos */
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            No es posible eliminar ni archivar el inmueble{" "}
            <strong className="text-slate-900 font-bold">{propiedad.nombre}</strong>{" "}
            porque tiene <strong>{unidadesConContratosActivos.length}</strong> espacio(s) con contratos vigentes en curso.
          </p>

          <div className="p-3.5 bg-rose-50 border border-rose-200/90 rounded-xl space-y-2 text-xs text-rose-900">
            <p className="font-bold flex items-center gap-1.5 text-rose-800">
              <ShieldAlert className="w-4 h-4 text-[#CC1A22] shrink-0" />
              Espacios ocupados con alquileres activos:
            </p>
            <ul className="space-y-1.5 pl-4 list-disc text-rose-800/90">
              {unidadesConContratosActivos.map((u) => {
                const contrato = u.contratos ? u.contratos[0] : null;
                return (
                  <li key={u.id} className="leading-snug">
                    <span className="font-bold text-rose-950">Espacio {u.codigo}</span>
                    {contrato && (
                      <>
                        {" "}— Contrato{" "}
                        <span className="font-semibold text-rose-900">#{contrato.codigo}</span> (
                        {contrato.inquilino.nombre} {contrato.inquilino.apellido ?? ""})
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Para poder archivar este inmueble, primero debes finalizar o rescindir sus contratos desde el módulo de contratos.
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Entendido
            </button>
            <Link
              href="/admin/contratos"
              onClick={onClose}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#1C2539] hover:bg-[#2a3754] rounded-xl transition-all cursor-pointer shadow-xs active:translate-y-0.5"
            >
              <span>Ir a Contratos</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : tieneHistorialContratos ? (
        /* CASO 2: Archivado Integral (Soft-Delete) por historial contable */
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            ¿Deseas archivar el inmueble{" "}
            <strong className="text-slate-900 font-bold">{propiedad.nombre}</strong>?
          </p>

          <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-900 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-blue-800">
              <Archive className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Protección de Historial Contable</span>
            </div>
            <p>
              Este inmueble cuenta con <strong>{historialContratosPropiedad}</strong> contrato(s) en su historial. Por trazabilidad legal y financiera, no puede eliminarse de forma física.
            </p>
            <p className="text-blue-800/80 font-medium">
              Al archivar, el inmueble se moverá a la pestaña de <strong>Archivados</strong> y sus {propiedad._count.unidades ?? 0} espacio(s) pasarán a estado <strong>Inactivo</strong>. Podrás reactivarlo en cualquier momento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onEliminar}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#1C2539] hover:bg-[#2a3754] rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs active:translate-y-0.5"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Archivar Inmueble</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* CASO 3: Eliminación física definitiva para propiedad virgen (0 contratos) */
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            ¿Estás seguro de que deseas eliminar permanentemente el inmueble{" "}
            <strong className="text-slate-900 font-bold">{propiedad.nombre}</strong>?
          </p>

          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-rose-900">
              <Trash2 className="w-4 h-4 text-[#CC1A22] shrink-0" />
              Acción destructiva irreversible
            </p>
            <p>
              Este inmueble no posee contratos asociados. Se eliminarán permanentemente el inmueble, sus{" "}
              <strong>{propiedad._count.unidades ?? 0}</strong> espacio(s) y sus archivos multimedia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onEliminar}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:translate-y-0.5"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Definitivamente</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
