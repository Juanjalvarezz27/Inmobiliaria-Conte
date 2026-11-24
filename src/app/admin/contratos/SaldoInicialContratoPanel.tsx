"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";

export type ModoSaldoInicial = "AL_DIA" | "DESDE_MES" | "MESES_ESPECIFICOS";

export interface PeriodoMesAno {
  mes: number;
  ano: number;
}

const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function parseFechaPartes(fechaStr: string): { ano: number; mes: number; dia: number } | null {
  if (!fechaStr) return null;
  const [y, m, d] = fechaStr.split("-").map(Number);
  if (!y || !m) return null;
  return { ano: y, mes: m, dia: d || 1 };
}

function toYm(ano: number, mes: number): number {
  return ano * 12 + mes;
}

function formatIsoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export function contarCuotasVencidasPreview(params: {
  isEditing: boolean;
  modo: ModoSaldoInicial;
  fechaInicio: string;
  fechaFin: string;
  fechaInicioCobranza: string;
  mesesSeleccionados: PeriodoMesAno[];
  diaCobro: string;
}): { vencidas: number; pendientes: number; totalMeses: number; primerMesLabel: string; ultimoMesLabel: string } {
  const ahora = new Date();
  const hoyAno = ahora.getFullYear();
  const hoyMes = ahora.getMonth() + 1;
  const hoyDia = ahora.getDate();
  const hoyYm = toYm(hoyAno, hoyMes);
  const diaNum = Math.min(31, Math.max(1, parseInt(params.diaCobro, 10) || 1));

  const finPartes = parseFechaPartes(params.fechaFin);
  const finYm = finPartes ? toYm(finPartes.ano, finPartes.mes) : hoyYm + 12;

  const evaluarEstado = (ano: number, mes: number): "VENCIDO" | "PENDIENTE" => {
    const ultimoDiaMes = new Date(ano, mes, 0).getDate();
    const diaEfectivo = Math.min(diaNum, ultimoDiaMes);
    const ym = toYm(ano, mes);
    if (ym < hoyYm) return "VENCIDO";
    if (ym === hoyYm && hoyDia > diaEfectivo) return "VENCIDO";
    return "PENDIENTE";
  };

  if (!params.isEditing && params.modo === "MESES_ESPECIFICOS") {
    const ordenados = [...params.mesesSeleccionados]
      .filter((p) => {
        const ym = toYm(p.ano, p.mes);
        return ym <= hoyYm && ym <= finYm;
      })
      .sort((a, b) => toYm(a.ano, a.mes) - toYm(b.ano, b.mes));

    if (ordenados.length === 0) {
      return { vencidas: 0, pendientes: 0, totalMeses: 0, primerMesLabel: "", ultimoMesLabel: "" };
    }

    let vencidas = 0;
    let pendientes = 0;
    for (const p of ordenados) {
      if (evaluarEstado(p.ano, p.mes) === "VENCIDO") vencidas += 1;
      else pendientes += 1;
    }

    const primero = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];
    return {
      vencidas,
      pendientes,
      totalMeses: ordenados.length,
      primerMesLabel: `${MESES_CORTOS[primero.mes - 1]} ${primero.ano}`,
      ultimoMesLabel: `${MESES_CORTOS[ultimo.mes - 1]} ${ultimo.ano}`,
    };
  }

  const cortePartes = parseFechaPartes(params.fechaInicioCobranza);
  if (!cortePartes) {
    return { vencidas: 0, pendientes: 0, totalMeses: 0, primerMesLabel: "", ultimoMesLabel: "" };
  }

  const corteYm = toYm(cortePartes.ano, cortePartes.mes);
  const maxAdelantoYm = hoyYm + 1;

  // Modo AL_DIA o corte en mes futuro próximo: solo genera 1 cuota pendiente en mes+1 si entra en vigencia
  if (corteYm > hoyYm) {
    if (corteYm <= maxAdelantoYm && corteYm <= finYm) {
      const label = `${MESES_CORTOS[cortePartes.mes - 1]} ${cortePartes.ano}`;
      return { vencidas: 0, pendientes: 1, totalMeses: 1, primerMesLabel: label, ultimoMesLabel: label };
    }
    return { vencidas: 0, pendientes: 0, totalMeses: 0, primerMesLabel: "", ultimoMesLabel: "" };
  }

  const topeYm = Math.min(hoyYm, finYm);
  if (corteYm > topeYm) {
    return { vencidas: 0, pendientes: 0, totalMeses: 0, primerMesLabel: "", ultimoMesLabel: "" };
  }

  let vencidas = 0;
  let pendientes = 0;
  let curAno = cortePartes.ano;
  let curMes = cortePartes.mes;

  while (toYm(curAno, curMes) <= topeYm) {
    if (evaluarEstado(curAno, curMes) === "VENCIDO") vencidas += 1;
    else pendientes += 1;
    curMes += 1;
    if (curMes > 12) {
      curMes = 1;
      curAno += 1;
    }
  }

  const ultimoAno = Math.floor((topeYm - 1) / 12);
  const ultimoMes = ((topeYm - 1) % 12) + 1;
  return {
    vencidas,
    pendientes,
    totalMeses: vencidas + pendientes,
    primerMesLabel: `${MESES_CORTOS[cortePartes.mes - 1]} ${cortePartes.ano}`,
    ultimoMesLabel: `${MESES_CORTOS[ultimoMes - 1]} ${ultimoAno}`,
  };
}

interface SaldoInicialContratoPanelProps {
  isEditing: boolean;
  fechaInicio: string;
  fechaFin: string;
  diaCobro: string;
  montoAlquiler: string;
  modo: ModoSaldoInicial;
  onModoChange: (modo: ModoSaldoInicial) => void;
  fechaInicioCobranza: string;
  onFechaInicioCobranzaChange: (fecha: string) => void;
  mesesSeleccionados: PeriodoMesAno[];
  onMesesSeleccionadosChange: (meses: PeriodoMesAno[]) => void;
  confirmadoDeudaLarga: boolean;
  onConfirmadoDeudaLargaChange: (confirmado: boolean) => void;
}

export function SaldoInicialContratoPanel({
  isEditing,
  fechaInicio,
  fechaFin,
  diaCobro,
  montoAlquiler,
  modo,
  onModoChange,
  fechaInicioCobranza,
  onFechaInicioCobranzaChange,
  mesesSeleccionados,
  onMesesSeleccionadosChange,
  confirmadoDeudaLarga,
  onConfirmadoDeudaLargaChange,
}: SaldoInicialContratoPanelProps) {
  const ahora = new Date();
  const hoyAno = ahora.getFullYear();
  const hoyMes = ahora.getMonth() + 1;
  const hoyYm = toYm(hoyAno, hoyMes);
  const proximoMesObj = new Date(hoyAno, hoyMes, 1);
  const proximoAno = proximoMesObj.getFullYear();
  const proximoMes = proximoMesObj.getMonth() + 1;
  const proximoYm = toYm(proximoAno, proximoMes);

  const inicioPartes = parseFechaPartes(fechaInicio) ?? { ano: hoyAno, mes: hoyMes, dia: 1 };
  const finPartes = parseFechaPartes(fechaFin) ?? { ano: proximoAno + 1, mes: proximoMes, dia: 1 };
  const inicioYm = toYm(inicioPartes.ano, inicioPartes.mes);
  const finYm = toYm(finPartes.ano, finPartes.mes);

  const cortePartes = parseFechaPartes(fechaInicioCobranza) ?? { ano: proximoAno, mes: proximoMes, dia: 1 };
  const [anoChipActivo, setAnoChipActivo] = useState<number>(hoyAno);

  // Años válidos para el selector de Mes/Año según el rango del contrato
  const maxSelectorYm = isEditing ? Math.min(finYm, proximoYm) : Math.min(finYm, hoyYm);
  const maxSelectorAno = Math.floor((maxSelectorYm - 1) / 12);
  const minSelectorAno = Math.min(inicioPartes.ano, maxSelectorAno);

  const opcionesAnos = useMemo(() => {
    const lista = [];
    for (let y = maxSelectorAno; y >= minSelectorAno; y -= 1) {
      lista.push({ value: String(y), label: String(y) });
    }
    return lista;
  }, [minSelectorAno, maxSelectorAno]);

  const anoSeleccionadoSeguro = Math.min(maxSelectorAno, Math.max(minSelectorAno, cortePartes.ano));
  const opcionesMeses = useMemo(() => {
    const lista = [];
    for (let m = 1; m <= 12; m += 1) {
      const ym = toYm(anoSeleccionadoSeguro, m);
      if (ym >= inicioYm && ym <= maxSelectorYm) {
        lista.push({ value: String(m), label: MESES_LARGOS[m - 1] });
      }
    }
    return lista;
  }, [anoSeleccionadoSeguro, inicioYm, maxSelectorYm]);

  // Años disponibles en modo meses puntuales (hasta hoy)
  const anosDisponiblesChips = useMemo(() => {
    const maxYmChips = Math.min(finYm, hoyYm);
    const minY = inicioPartes.ano;
    const maxY = Math.floor((maxYmChips - 1) / 12);
    const anos: number[] = [];
    for (let y = maxY; y >= minY; y -= 1) {
      anos.push(y);
    }
    return anos;
  }, [inicioPartes.ano, finYm, hoyYm]);

  const anoChipsSeguro = anosDisponiblesChips.includes(anoChipActivo)
    ? anoChipActivo
    : (anosDisponiblesChips[0] ?? hoyAno);

  const cambiarMesAno = (nuevoAno: number, nuevoMes: number) => {
    let ym = toYm(nuevoAno, nuevoMes);
    if (ym < inicioYm) ym = inicioYm;
    if (ym > maxSelectorYm) ym = maxSelectorYm;
    const a = Math.floor((ym - 1) / 12);
    const m = ((ym - 1) % 12) + 1;
    onFechaInicioCobranzaChange(formatIsoMes(a, m));
    onConfirmadoDeudaLargaChange(false);
  };

  const toggleMesEspecifico = (ano: number, mes: number) => {
    const existe = mesesSeleccionados.some((p) => p.ano === ano && p.mes === mes);
    const siguientes = existe
      ? mesesSeleccionados.filter((p) => !(p.ano === ano && p.mes === mes))
      : [...mesesSeleccionados, { ano, mes }];
    onMesesSeleccionadosChange(siguientes);
    onConfirmadoDeudaLargaChange(false);
  };

  const preview = contarCuotasVencidasPreview({
    isEditing,
    modo,
    fechaInicio,
    fechaFin,
    fechaInicioCobranza,
    mesesSeleccionados,
    diaCobro,
  });

  const canonNum = parseFloat(montoAlquiler) || 0;
  const totalPreviewUsd = preview.totalMeses * canonNum;
  const totalVencidoUsd = preview.vencidas * canonNum;
  const requiereConfirmacion = preview.vencidas > 3;

  return (
    <div className="bg-emerald-50/45 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3.5 transition-all">
      {/* Cabecera */}
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-[#175E38] flex items-center justify-center shrink-0 border border-emerald-200/80 mt-0.5">
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-slate-900 leading-tight">
            {isEditing
              ? "Fecha de Corte de Facturación"
              : "Inquilino con Antigüedad"}
          </h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-snug">
            {isEditing
              ? "Ajusta el mes de corte sin afectar pagos ya registrados."
              : "Indica desde cuándo cobrar en el sistema."}
          </p>
        </div>
      </div>

      {/* Selector de 3 modos al crear */}
      {!isEditing && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              onModoChange("AL_DIA");
              onFechaInicioCobranzaChange(formatIsoMes(proximoAno, proximoMes));
              onConfirmadoDeudaLargaChange(false);
            }}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              modo === "AL_DIA"
                ? "bg-white border-[#175E38] ring-2 ring-[#175E38]/15 shadow-xs"
                : "bg-white/75 border-slate-200/90 hover:bg-white hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${modo === "AL_DIA" ? "text-[#175E38]" : "text-slate-400"}`} />
              <span>Al día (Sin deuda)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              Empieza a cobrar en {MESES_CORTOS[proximoMes - 1]} {proximoAno}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              onModoChange("DESDE_MES");
              if (toYm(cortePartes.ano, cortePartes.mes) > hoyYm) {
                cambiarMesAno(hoyAno, hoyMes);
              }
            }}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              modo === "DESDE_MES"
                ? "bg-white border-[#175E38] ring-2 ring-[#175E38]/15 shadow-xs"
                : "bg-white/75 border-slate-200/90 hover:bg-white hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Calendar className={`w-3.5 h-3.5 shrink-0 ${modo === "DESDE_MES" ? "text-[#175E38]" : "text-slate-400"}`} />
              <span>Debe desde un mes</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              Deuda corrida desde Mes/Año
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              onModoChange("MESES_ESPECIFICOS");
              onConfirmadoDeudaLargaChange(false);
            }}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              modo === "MESES_ESPECIFICOS"
                ? "bg-white border-[#175E38] ring-2 ring-[#175E38]/15 shadow-xs"
                : "bg-white/75 border-slate-200/90 hover:bg-white hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <ListChecks className={`w-3.5 h-3.5 shrink-0 ${modo === "MESES_ESPECIFICOS" ? "text-[#175E38]" : "text-slate-400"}`} />
              <span>Meses puntuales</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              Elegir meses sueltos adeudados
            </p>
          </button>
        </div>
      )}

      {/* Modo DESDE_MES (en creación) o edición del corte */}
      {(isEditing || modo === "DESDE_MES") && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Mes de corte
              </label>
              <Select
                value={String(
                  opcionesMeses.some((m) => m.value === String(cortePartes.mes))
                    ? cortePartes.mes
                    : opcionesMeses[0]?.value ?? String(cortePartes.mes)
                )}
                onChange={(val) => cambiarMesAno(anoSeleccionadoSeguro, parseInt(val, 10))}
                options={opcionesMeses}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Año de corte
              </label>
              <Select
                value={String(anoSeleccionadoSeguro)}
                onChange={(val) => cambiarMesAno(parseInt(val, 10), cortePartes.mes)}
                options={opcionesAnos}
              />
            </div>
          </div>

          {isEditing && finYm >= proximoYm && toYm(anoSeleccionadoSeguro, cortePartes.mes) <= hoyYm && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => cambiarMesAno(proximoAno, proximoMes)}
                className="text-[11px] font-bold text-[#175E38] hover:underline cursor-pointer"
              >
                Poner al día (iniciar en {MESES_CORTOS[proximoMes - 1]} {proximoAno})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modo MESES_ESPECIFICOS (en creación) */}
      {!isEditing && modo === "MESES_ESPECIFICOS" && (
        <div className="bg-white/90 border border-slate-200 rounded-xl p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {anosDisponiblesChips.map((anio) => (
                <button
                  key={anio}
                  type="button"
                  onClick={() => setAnoChipActivo(anio)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    anoChipsSeguro === anio
                      ? "bg-[#1C2539] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {anio}
                </button>
              ))}
            </div>

            {mesesSeleccionados.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onMesesSeleccionadosChange([]);
                  onConfirmadoDeudaLargaChange(false);
                }}
                className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Limpiar ({mesesSeleccionados.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {MESES_CORTOS.map((nombreMes, idx) => {
              const m = idx + 1;
              const ym = toYm(anoChipsSeguro, m);
              const fueraDeRango = ym < inicioYm || ym > hoyYm || ym > finYm;
              const seleccionado = mesesSeleccionados.some(
                (p) => p.ano === anoChipsSeguro && p.mes === m
              );

              return (
                <button
                  key={`${anoChipsSeguro}-${m}`}
                  type="button"
                  disabled={fueraDeRango}
                  onClick={() => toggleMesEspecifico(anoChipsSeguro, m)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                    fueraDeRango
                      ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                      : seleccionado
                      ? "bg-[#175E38] text-white border-[#175E38] shadow-2xs cursor-pointer"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 cursor-pointer"
                  }`}
                >
                  {nombreMes}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Los meses no marcados entre el primer mes seleccionado y hoy se registrarán como solventes ($0) sin afectar ingresos.
          </p>
        </div>
      )}

      {/* Vista previa en vivo antes de guardar */}
      <div
        className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
          preview.vencidas > 3
            ? "bg-rose-50/85 border-rose-200 text-rose-950"
            : "bg-white/90 border-emerald-200/90 text-slate-800"
        }`}
      >
        <ShieldCheck
          className={`w-4 h-4 shrink-0 mt-0.5 ${
            preview.vencidas > 3 ? "text-rose-600" : "text-[#175E38]"
          }`}
        />
        <div className="space-y-1.5 flex-1">
          {preview.totalMeses === 0 ? (
            <p className="font-semibold">
              {!isEditing && modo === "MESES_ESPECIFICOS"
                ? "Selecciona al menos 1 mes adeudado o cambia al modo «Al día»."
                : "No se generarán cuotas vencidas ni pendientes dentro del rango seleccionado."}
            </p>
          ) : (
            <p className="leading-snug">
              Vista previa:{" "}
              <strong>
                {preview.vencidas > 0
                  ? `${preview.vencidas} ${preview.vencidas === 1 ? "cuota vencida" : "cuotas vencidas"}`
                  : "0 cuotas vencidas"}
              </strong>
              {preview.pendientes > 0 && (
                <span>
                  {" "}
                  y <strong>{preview.pendientes} pendiente</strong>
                </span>
              )}{" "}
              ({preview.primerMesLabel}
              {preview.primerMesLabel !== preview.ultimoMesLabel ? ` → ${preview.ultimoMesLabel}` : ""})
              {canonNum > 0 && (
                <span>
                  {" "}
                  · Total: <strong>{formatCurrency(totalPreviewUsd)} USD</strong>
                </span>
              )}
              .
            </p>
          )}

          {requiereConfirmacion && (
            <label className="flex items-start gap-2 pt-1 border-t border-rose-200/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmadoDeudaLarga}
                onChange={(e) => onConfirmadoDeudaLargaChange(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-rose-600 cursor-pointer shrink-0"
              />
              <span className="text-[11px] font-bold text-rose-900 leading-tight">
                Confirmo que este inquilino realmente adeuda {preview.vencidas} meses
                {canonNum > 0 ? ` (${formatCurrency(totalVencidoUsd)} USD vencidos)` : ""}.
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
