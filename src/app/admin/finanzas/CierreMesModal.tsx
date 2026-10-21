"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Printer,
  Loader2,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { getCierreMesData } from "@/lib/actions/finanzas";
import { MESES, formatearMontoUSD } from "./constants";
import { construirCierrePdf } from "./generarCierrePdf";
import { toast } from "sonner";

interface CierreMesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mes: number;
  ano: number;
}

interface CierreData {
  mes: number;
  ano: number;
  totalIngresos: number;
  totalEgresos: number;
  balanceNeto: number;
  desglosePropiedades: {
    nombre: string;
    ciudad: string;
    ingresos: number;
    egresos: number;
    balance: number;
  }[];
}

export function CierreMesModal({
  isOpen,
  onClose,
  mes,
  ano,
}: CierreMesModalProps) {
  const [data, setData] = useState<CierreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const mesNombre = MESES.find((m) => m.value === mes.toString())?.label || `Mes ${mes}`;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true);
      getCierreMesData(mes, ano)
        .then((res) => {
          if (res.success && res.desglosePropiedades) {
            setData(res as CierreData);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, mes, ano]);

  const esUtilidad = (data?.balanceNeto || 0) >= 0;
  const margen =
    data && data.totalIngresos > 0
      ? ((data.balanceNeto / data.totalIngresos) * 100).toFixed(1)
      : "0";

  // Genera y abre el documento PDF institucional oficial con Logo y fuentes
  const handleImprimir = async () => {
    if (!data) return;
    try {
      setIsGeneratingPdf(true);
      const blob = await construirCierrePdf(data, mesNombre, ano);
      const url = URL.createObjectURL(blob);
      const ventana = window.open(url, "_blank");
      if (!ventana) {
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `Cierre_Contable_${mesNombre}_${ano}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
      }
    } catch (err) {
      console.error("Error al generar PDF de cierre:", err);
      toast.error("No se pudo generar el reporte PDF del cierre de mes.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cierre Contable • ${mesNombre} ${ano}`}
      icon={Calculator}
      headerVariant="green"
      maxWidth="3xl"
    >
      <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#175E38]" />
            <span className="text-xs font-semibold text-slate-600">
              Consolidando balances de cobranzas y egresos del período...
            </span>
          </div>
        ) : data ? (
          <>
            {/* Banner de Resultado Ejecutivo (Hero Card con Relieve 3D) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
              {/* Fila Principal: Icono + Utilidad Neta a la izquierda | Margen a la derecha */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      esUtilidad
                        ? "bg-emerald-50 text-[#175E38] border-emerald-200/90"
                        : "bg-rose-50 text-[#CC1A22] border-rose-200/90"
                    }`}
                  >
                    {esUtilidad ? (
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                    ) : (
                      <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                      {esUtilidad ? "Utilidad Neta Operativa" : "Déficit Operativo"}
                    </span>
                    <span
                      className={`text-2xl sm:text-3xl font-black font-heading tracking-tight block mt-1 leading-none ${
                        esUtilidad ? "text-[#175E38]" : "text-[#CC1A22]"
                      }`}
                    >
                      {esUtilidad ? "+" : ""}
                      {formatearMontoUSD(data.balanceNeto)}
                    </span>
                  </div>
                </div>

                {/* Badge de Margen de Rentabilidad */}
                <div
                  className={`px-3 py-1.5 rounded-xl border text-right shrink-0 shadow-2xs ${
                    esUtilidad
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
                      : "bg-rose-50 text-rose-800 border-rose-200/90"
                  }`}
                >
                  <span className="text-[9px] font-extrabold uppercase tracking-wider block text-slate-400 leading-none">
                    Margen
                  </span>
                  <span className="text-xs sm:text-sm font-black font-heading block mt-0.5 leading-tight">
                    {margen}%
                  </span>
                </div>
              </div>

              {/* Sub-tarjetas de Ingresos y Egresos (Grid 50/50 Equilibrado) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-slate-100">
                {/* Ingresos Totales */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#175E38] flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block truncate">
                      Ingresos
                    </span>
                    <span className="text-xs sm:text-sm font-black font-heading text-[#175E38] block truncate mt-0.5">
                      +{formatearMontoUSD(data.totalIngresos)}
                    </span>
                  </div>
                </div>

                {/* Egresos Totales */}
                <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-[#CC1A22] flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block truncate">
                      Egresos
                    </span>
                    <span className="text-xs sm:text-sm font-black font-heading text-[#CC1A22] block truncate mt-0.5">
                      -{formatearMontoUSD(data.totalEgresos)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desglose por Centro Comercial / Inmueble */}
            <div className="space-y-2.5 sm:space-y-3">
              {/* Encabezado de la Sección */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#1C2539] text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 tracking-tight truncate">
                    Rentabilidad por Inmueble
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80 shrink-0">
                  {data.desglosePropiedades.length}{" "}
                  {data.desglosePropiedades.length === 1 ? "inmueble" : "inmuebles"}
                </span>
              </div>

              {/* Vista Móvil: Tarjetas Individuales (Sin cortes horizontales) */}
              <div className="sm:hidden space-y-2">
                {data.desglosePropiedades.map((p, idx) => {
                  const bal = p.balance;
                  const esPos = bal >= 0;

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200/90 border-b-[2px] border-b-slate-300/80 p-3 shadow-2xs space-y-2"
                    >
                      {/* Fila 1: Nombre del Inmueble y Balance Neto */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {p.nombre}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            {p.ciudad}
                          </p>
                        </div>

                        {/* Balance Neto Destacado */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Balance Neto
                          </span>
                          <span
                            className={`text-xs font-black font-heading block mt-0.5 ${
                              esPos ? "text-[#175E38]" : "text-rose-600"
                            }`}
                          >
                            {esPos ? "+" : ""}
                            {formatearMontoUSD(bal)}
                          </span>
                        </div>
                      </div>

                      {/* Fila 2: Ingresos y Egresos en Sub-cajas */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="bg-emerald-50/70 rounded-lg px-2 py-1 border border-emerald-100/90 flex items-center justify-between">
                          <span className="text-emerald-800 font-bold text-[9px] uppercase">
                            Ingresos
                          </span>
                          <span className="text-[#175E38] font-bold font-heading">
                            +{formatearMontoUSD(p.ingresos)}
                          </span>
                        </div>
                        <div className="bg-rose-50/70 rounded-lg px-2 py-1 border border-rose-100/90 flex items-center justify-between">
                          <span className="text-rose-800 font-bold text-[9px] uppercase">
                            Egresos
                          </span>
                          <span className="text-rose-600 font-bold font-heading">
                            -{formatearMontoUSD(p.egresos)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Desktop: Tabla Institucional Completa */}
              <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Inmueble</th>
                      <th className="py-3 px-4 text-right">Ingresos</th>
                      <th className="py-3 px-4 text-right">Egresos</th>
                      <th className="py-3 px-4 text-right">Balance Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.desglosePropiedades.map((p, idx) => {
                      const bal = p.balance;
                      const esPos = bal >= 0;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block truncate max-w-[220px]">
                              {p.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {p.ciudad}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#175E38] font-heading">
                            +{formatearMontoUSD(p.ingresos)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600 font-heading">
                            -{formatearMontoUSD(p.egresos)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-black font-heading ${
                                esPos ? "text-slate-900" : "text-rose-600"
                              }`}
                            >
                              {esPos ? "+" : ""}
                              {formatearMontoUSD(bal)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acción de Imprimir Cierre (Ancho completo en Móvil, Alineado a la derecha en Desktop) */}
            <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleImprimir}
                disabled={isGeneratingPdf}
                className="w-full sm:w-auto sm:min-w-[180px] h-11 px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] hover:bg-[#124b2d] transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 text-white shrink-0" />
                    <span>Imprimir Cierre</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">
            No se encontraron movimientos registrados para este periodo.
          </div>
        )}
      </div>
    </Modal>
  );
}
