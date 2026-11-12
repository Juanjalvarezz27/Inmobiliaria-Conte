"use client";

import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Search,
  RotateCw,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MESES } from "@/lib/date-utils";
import { PagoCard } from "./PagoCard";
import type { PagoItem } from "./types";

interface MorososHistoricosModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagos: PagoItem[];
  isLoading?: boolean;
  onVerFicha: (pagoId: string) => void;
  onRegistrarPago: (pagoId: string) => void;
}

export function MorososHistoricosModal({
  isOpen,
  onClose,
  pagos,
  isLoading = false,
  onVerFicha,
  onRegistrarPago,
}: MorososHistoricosModalProps) {
  const [filtro, setFiltro] = useState("");

  const pagosFiltrados = useMemo(() => {
    if (!filtro.trim()) return pagos;
    const q = filtro.toLowerCase().trim();
    return pagos.filter((p) => {
      const inq = `${p.contrato.inquilino.nombre} ${p.contrato.inquilino.apellido || ""}`.toLowerCase();
      const doc = p.contrato.inquilino.documentoIdentidad.toLowerCase();
      const cod = p.contrato.unidad.codigo.toLowerCase();
      const prop = p.contrato.unidad.propiedad.nombre.toLowerCase();
      const nombreMes = (MESES[p.periodoMes - 1] || "").toLowerCase();
      return (
        inq.includes(q) ||
        doc.includes(q) ||
        cod.includes(q) ||
        prop.includes(q) ||
        nombreMes.includes(q)
      );
    });
  }, [pagos, filtro]);

  const totalDeuda = useMemo(() => {
    return pagosFiltrados.reduce(
      (acc, p) => acc + Math.max(0, p.montoEsperado - p.montoPagado),
      0
    );
  }, [pagosFiltrados]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deudas de Meses Anteriores"
      subtitle={`${pagos.length} mensualidad(es) impaga(s) acumulada(s)`}
      icon={AlertTriangle}
      headerVariant="red"
      maxWidth="7xl"
    >
      <div className="space-y-4">
        {/* Cabecera Resumen y Buscador */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/80 via-slate-50 to-amber-50/50 border border-rose-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Acumulado en Mora
              </span>
              <span className="text-lg sm:text-2xl font-black text-rose-700 font-heading tracking-tight">
                ${totalDeuda.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs sm:text-sm font-sans font-bold text-slate-500">USD</span>
              </span>
            </div>
          </div>

          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por inquilino, cédula, local o mes..."
              className="w-full pl-10 pr-9 h-10 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-[#CC1A22]/20 focus:border-[#CC1A22] outline-hidden font-medium text-slate-800 shadow-2xs"
            />
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cuadrícula de Tarjetas Oficiales PagoCard */}
        <div className="max-h-[68vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <RotateCw className="w-6 h-6 animate-spin text-[#CC1A22]" />
              <p className="text-xs font-bold">Cargando mensualidades adeudadas...</p>
            </div>
          ) : pagosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs sm:text-sm bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              {filtro ? "No se encontraron coincidencias para tu búsqueda." : "No hay mensualidades atrasadas en el historial."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 pb-2">
              {pagosFiltrados.map((pago) => {
                const nombreMes = MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
                return (
                  <PagoCard
                    key={pago.id}
                    pago={pago}
                    nombreMesActual={nombreMes}
                    ano={pago.periodoAno}
                    compact={true}
                    onVerFicha={(pagoId) => {
                      onClose();
                      onVerFicha(pagoId);
                    }}
                    onRegistrarPago={(pagoId) => {
                      onClose();
                      onRegistrarPago(pagoId);
                    }}
                    onVerRecibo={() => {}}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando <strong>{pagosFiltrados.length}</strong> de <strong>{pagos.length}</strong> mensualidad(es) atrasada(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:translate-y-0.5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
