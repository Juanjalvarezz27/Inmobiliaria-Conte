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
  Coins,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { getCierreMesData } from "@/lib/actions/finanzas";
import { MESES, formatearMontoUSD } from "./constants";
import { construirCierrePdf } from "./generarCierrePdf";
import type { CierreMesData } from "./types";
import { toast } from "sonner";

interface CierreMesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mes: number;
  ano: number;
}

export function CierreMesModal({
  isOpen,
  onClose,
  mes,
  ano,
}: CierreMesModalProps) {
  const [data, setData] = useState<CierreMesData | null>(null);
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
            setData(res as unknown as CierreMesData);
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

              {/* Sub-tarjetas de Ingresos y Egresos (Grid 50/50 Equilibrado con discriminación multimoneda) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-slate-100">
                {/* Ingresos Totales */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3 flex items-start gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#175E38] flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block truncate">
                      Ingresos Totales
                    </span>
                    <span className="text-xs sm:text-sm font-black font-heading text-[#175E38] block truncate mt-0.5">
                      +{formatearMontoUSD(data.totalIngresos)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">
                      {data.totalIngresosVes > 0
                        ? `$ ${data.totalIngresosUsd} • Bs. ${data.totalIngresosVes.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`
                        : "100% en divisas USD"}
                    </span>
                  </div>
                </div>

                {/* Egresos Totales */}
                <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 sm:p-3 flex items-start gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-[#CC1A22] flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block truncate">
                      Egresos Totales
                    </span>
                    <span className="text-xs sm:text-sm font-black font-heading text-[#CC1A22] block truncate mt-0.5">
                      -{formatearMontoUSD(data.totalEgresos)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">
                      {data.totalEgresosVes > 0
                        ? `$ ${data.totalEgresosUsd} • Bs. ${data.totalEgresosVes.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`
                        : "100% en divisas USD"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desglose de Rentabilidad y Movimientos por Inmueble (Tabla Jerárquica Unificada) */}
            <div className="space-y-3">
              {/* Encabezado de la Sección */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#1C2539] text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 tracking-tight truncate">
                    Rentabilidad y Movimientos por Inmueble
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80 shrink-0">
                  {data.desglosePropiedades.length}{" "}
                  {data.desglosePropiedades.length === 1 ? "inmueble" : "inmuebles"}
                </span>
              </div>

              {/* Lista Jerárquica de Inmuebles con sus movimientos inmediatos */}
              <div className="space-y-5">
                {data.desglosePropiedades.map((p, pIdx) => {
                  const bal = p.balance;
                  const esPos = bal >= 0;
                  const movs = p.movimientos || [];

                  return (
                    <div
                      key={pIdx}
                      className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-[0_4px_16px_-2px_rgba(28,37,57,0.06),0_2px_6px_-1px_rgba(28,37,57,0.04)]"
                    >
                      {/* Cabecera del Inmueble */}
                      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-200/90">
                        {/* Nombre e info */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-xl bg-[#1C2539] text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-black font-heading text-slate-900 truncate leading-tight">
                              {p.nombre}
                            </h5>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {p.ciudad || "Trujillo"} · {movs.length} {movs.length === 1 ? "movimiento" : "movimientos"}
                            </span>
                          </div>
                        </div>

                        {/* Métricas en grid 3 columnas */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Ingresos */}
                          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                              Ingresos
                            </span>
                            <span className="font-black font-heading text-[#175E38] text-base block leading-tight">
                              {p.ingresosUsd > 0
                                ? `+${formatearMontoUSD(p.ingresosUsd)}`
                                : formatearMontoUSD(0)}
                            </span>
                            {p.ingresosVes > 0 && (
                              <span className="text-[10px] text-emerald-600 font-mono font-semibold block mt-1">
                                +Bs.&nbsp;{p.ingresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          {/* Egresos */}
                          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3">
                            <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                              Egresos
                            </span>
                            <span className="font-black font-heading text-[#CC1A22] text-base block leading-tight">
                              {p.egresosUsd > 0
                                ? `-${formatearMontoUSD(p.egresosUsd)}`
                                : formatearMontoUSD(0)}
                            </span>
                            {p.egresosVes > 0 && (
                              <span className="text-[10px] text-rose-600 font-mono font-semibold block mt-1">
                                -Bs.&nbsp;{p.egresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          {/* Balance Neto */}
                          <div
                            className={`border rounded-xl p-3 ${
                              esPos
                                ? "bg-slate-50 border-slate-200/80"
                                : "bg-rose-50/60 border-rose-200/80"
                            }`}
                          >
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Balance Neto
                            </span>
                            <span
                              className={`font-black font-heading text-base block leading-tight ${
                                esPos ? "text-slate-900" : "text-[#CC1A22]"
                              }`}
                            >
                              {esPos ? "+" : ""}
                              {formatearMontoUSD(bal)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tabla de Movimientos */}
                      {movs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-2.5 px-4">Fecha</th>
                                <th className="py-2.5 px-4">Concepto / Descripción</th>
                                <th className="py-2.5 px-4 text-center">Tipo</th>
                                <th className="py-2.5 px-4 text-right">Monto Origen</th>
                                <th className="py-2.5 px-4 text-right">Tasa BCV</th>
                                <th className="py-2.5 px-4 text-right">Total USD</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {movs.map((m) => {
                                const esIng = m.tipo === "INGRESO";
                                const esVes = m.monedaOriginal === "VES";
                                const partes = m.fecha.split("-");
                                const fechaFmt = partes.length === 3 ? `${partes[2]}/${partes[1]}` : m.fecha;

                                return (
                                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                      {fechaFmt}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-slate-800 text-[11px]">
                                      {m.concepto}
                                    </td>
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${
                                          esIng
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                            : "bg-rose-50 text-rose-800 border-rose-200/80"
                                        }`}
                                      >
                                        {esIng ? "Ingreso" : "Egreso"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      {esVes ? (
                                        <span className="font-mono font-bold text-emerald-800 text-[11px]">
                                          Bs.&nbsp;{(m.montoBs || (m.montoUsd * (m.tasaBcv || 1))).toLocaleString("es-VE", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </span>
                                      ) : (
                                        <span className="font-mono text-slate-700 text-[11px]">
                                          ${m.montoUsd.toFixed(2)} USD
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      {m.tasaBcv ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono font-bold text-[10px]">
                                          {m.tasaBcv.toLocaleString("es-VE", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}&nbsp;Bs/$
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      <span
                                        className={`font-mono font-black text-xs ${
                                          esIng ? "text-[#175E38]" : "text-rose-600"
                                        }`}
                                      >
                                        {esIng ? "+" : "-"}${m.montoUsd.toFixed(2)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-4 px-4 text-center text-slate-400 text-[11px] italic">
                          Sin movimientos registrados en este periodo.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* TOTAL CONSOLIDADO DEL PERÍODO */}
              <div className={`rounded-2xl border-2 overflow-hidden shadow-[0_4px_20px_-2px_rgba(23,94,56,0.15)] ${
                esUtilidad ? "border-[#175E38]/30" : "border-[#CC1A22]/30"
              }`}>
                {/* Banner superior */}
                <div className={`px-5 py-3 flex items-center justify-between ${
                  esUtilidad
                    ? "bg-gradient-to-r from-[#175E38] to-[#124b2d]"
                    : "bg-gradient-to-r from-[#CC1A22] to-[#a81219]"
                }`}>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/70 block">
                      Resumen del período
                    </span>
                    <h5 className="text-sm font-black font-heading text-white leading-tight">
                      Total Consolidado
                    </h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/70 block">
                      {esUtilidad ? "Utilidad Neta" : "Déficit Operativo"}
                    </span>
                    <span className="text-xl font-black font-heading text-white leading-tight">
                      {esUtilidad ? "+" : ""}{formatearMontoUSD(data.balanceNeto)}
                    </span>
                  </div>
                </div>

                {/* Cuerpo: métricas en grid */}
                <div className="bg-white p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Total Ingresos */}
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                        Total Ingresos
                      </span>
                      <span className="font-black font-heading text-[#175E38] text-base block">
                        +{formatearMontoUSD(data.totalIngresosUsd)}
                      </span>
                      {data.totalIngresosVes > 0 && (
                        <span className="text-[10px] text-emerald-600 font-mono font-semibold block mt-1">
                          +Bs.&nbsp;{data.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    {/* Total Egresos */}
                    <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                        Total Egresos
                      </span>
                      <span className="font-black font-heading text-[#CC1A22] text-base block">
                        -{formatearMontoUSD(data.totalEgresosUsd)}
                      </span>
                      {data.totalEgresosVes > 0 && (
                        <span className="text-[10px] text-rose-600 font-mono font-semibold block mt-1">
                          -Bs.&nbsp;{data.totalEgresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta info */}
                  <p className="text-[11px] text-slate-400 font-medium text-center">
                    {data.desglosePropiedades.length} inmuebles con actividad&nbsp;·&nbsp;{data.movimientos?.length || 0} movimientos conciliados
                  </p>
                </div>
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
