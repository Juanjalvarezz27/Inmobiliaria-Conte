"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Search,
  Receipt,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Building2,
  CreditCard,
  Sparkles,
  RotateCw,
  Tag,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  MovimientoIngresoDetalle,
  MovimientoEgresoDetalle,
  MovimientosPeriodoResponse,
  TransaccionFinancieraItem,
} from "./types";
import { getMovimientosDetalladosPeriodo } from "@/lib/actions/finanzas";
import {
  MESES,
  formatearMontoUSD,
  METODO_PAGO_CONFIG,
  CATEGORIA_CONFIG,
} from "./constants";

const ITEMS_POR_PAGINA = 20;

interface MovimientosDesplegableProps {
  mes: number;
  ano: number;
  propiedadId?: string;
  refreshKey?: number;
  totalIngresosResumen: number;
  totalEgresosResumen: number;
  conteoCobranzasResumen: number;
  conteoEgresosResumen: number;
  onRegistrarMovimiento: () => void;
  onEditarTransaccion: (item: TransaccionFinancieraItem) => void;
  onEliminarTransaccion: (item: TransaccionFinancieraItem) => void;
  onVerComprobante: (url: string, titulo: string) => void;
}

interface GrupoFecha<T> {
  fechaClave: string;
  dia: number;
  fechaLegible: string;
  totalMonto: number;
  items: T[];
}

// Agrupar movimientos cronológicamente por día
function agruparPorFecha<T extends { fecha: string; dia: number; monto: number }>(
  items: T[]
): GrupoFecha<T>[] {
  const mapa = new Map<string, GrupoFecha<T>>();

  for (const item of items) {
    const fechaObj = new Date(item.fecha);
    const fechaClave = item.fecha.slice(0, 10);

    let fechaLegible = fechaObj.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      timeZone: "UTC",
    });
    fechaLegible = fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1);

    if (!mapa.has(fechaClave)) {
      mapa.set(fechaClave, {
        fechaClave,
        dia: item.dia,
        fechaLegible,
        totalMonto: 0,
        items: [],
      });
    }

    const grupo = mapa.get(fechaClave)!;
    grupo.totalMonto += item.monto;
    grupo.items.push(item);
  }

  return Array.from(mapa.values()).sort((a, b) => b.dia - a.dia);
}

export function MovimientosDesplegable({
  mes,
  ano,
  propiedadId = "TODAS",
  refreshKey = 0,
  totalIngresosResumen,
  totalEgresosResumen,
  conteoCobranzasResumen,
  conteoEgresosResumen,
  onRegistrarMovimiento,
  onEditarTransaccion,
  onEliminarTransaccion,
  onVerComprobante,
}: MovimientosDesplegableProps) {
  // Estado de apertura del acordeón
  const [estaAbierto, setEstaAbierto] = useState(false);

  // Carga perezosa (Lazy loading): solo se solicitan datos al abrir
  const [datosCargados, setDatosCargados] = useState<MovimientosPeriodoResponse | null>(null);
  const [isCargando, setIsCargando] = useState(false);

  // Toggle entre Ingresos y Egresos
  const [tabActivo, setTabActivo] = useState<"INGRESOS" | "EGRESOS">("INGRESOS");

  // Filtro de búsqueda local
  const [busqueda, setBusqueda] = useState("");

  // Control de paginación real de 20 en 20 registros
  const [paginaActual, setPaginaActual] = useState(1);

  const nombreMes = MESES.find((m) => m.value === String(mes))?.label || `Mes ${mes}`;

  // Cargar movimientos desde el backend
  const cargarMovimientos = async () => {
    setIsCargando(true);
    try {
      const res = await getMovimientosDetalladosPeriodo({
        mes,
        ano,
        propiedadId,
      });
      setDatosCargados(res);
      setPaginaActual(1);
    } catch (err) {
      console.error("Error al cargar movimientos detallados:", err);
    } finally {
      setIsCargando(false);
    }
  };

  // Manejar apertura y cierre del libro diario
  const handleToggleAcordeon = () => {
    const proximoEstado = !estaAbierto;
    setEstaAbierto(proximoEstado);

    if (proximoEstado && !datosCargados) {
      cargarMovimientos();
    }
  };

  // Cambiar pestaña y reiniciar paginación
  const handleCambiarTab = (nuevoTab: "INGRESOS" | "EGRESOS") => {
    setTabActivo(nuevoTab);
    setPaginaActual(1);
  };

  // Cambiar texto de búsqueda y reiniciar paginación
  const handleCambiarBusqueda = (nuevoTexto: string) => {
    setBusqueda(nuevoTexto);
    setPaginaActual(1);
  };

  // Sincronizar recarga si cambian los parámetros de fecha o propiedad
  useEffect(() => {
    if (estaAbierto) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarMovimientos();
    } else {
      setDatosCargados(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, propiedadId, refreshKey]);

  // Filtrar ingresos reactivamente
  const rawIngresos = datosCargados?.ingresos;
  const ingresosFiltrados = useMemo(() => {
    if (!rawIngresos) return [];
    if (!busqueda.trim()) return rawIngresos;
    const q = busqueda.toLowerCase().trim();
    return rawIngresos.filter(
      (item) =>
        item.concepto.toLowerCase().includes(q) ||
        (item.inquilinoNombre && item.inquilinoNombre.toLowerCase().includes(q)) ||
        (item.propiedadNombre && item.propiedadNombre.toLowerCase().includes(q)) ||
        (item.unidadCodigo && item.unidadCodigo.toLowerCase().includes(q)) ||
        (item.referencia && item.referencia.toLowerCase().includes(q))
    );
  }, [rawIngresos, busqueda]);

  // Filtrar egresos reactivamente
  const rawEgresos = datosCargados?.egresos;
  const egresosFiltrados = useMemo(() => {
    if (!rawEgresos) return [];
    if (!busqueda.trim()) return rawEgresos;
    const q = busqueda.toLowerCase().trim();
    return rawEgresos.filter(
      (item) =>
        item.concepto.toLowerCase().includes(q) ||
        (item.beneficiario && item.beneficiario.toLowerCase().includes(q)) ||
        (item.categoriaLabel && item.categoriaLabel.toLowerCase().includes(q)) ||
        (item.propiedadNombre && item.propiedadNombre.toLowerCase().includes(q)) ||
        (item.referencia && item.referencia.toLowerCase().includes(q))
    );
  }, [rawEgresos, busqueda]);

  // Cálculo de paginación de 20 en 20 registros
  const listaActiva = tabActivo === "INGRESOS" ? ingresosFiltrados : egresosFiltrados;
  const totalItems = listaActiva.length;
  const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
  const paginaSegura = totalPaginas > 0 ? Math.min(Math.max(1, paginaActual), totalPaginas) : 1;
  const inicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;

  // Segmentar exactamente los 20 registros correspondientes a la página activa
  const itemsPagina = useMemo(() => {
    return listaActiva.slice(inicio, fin);
  }, [listaActiva, inicio, fin]);

  // Agrupación cronológica por día de los 20 registros de la página
  const ingresosAgrupados = useMemo(() => {
    if (tabActivo !== "INGRESOS") return [];
    return agruparPorFecha(itemsPagina as MovimientoIngresoDetalle[]);
  }, [tabActivo, itemsPagina]);

  const egresosAgrupados = useMemo(() => {
    if (tabActivo !== "EGRESOS") return [];
    return agruparPorFecha(itemsPagina as MovimientoEgresoDetalle[]);
  }, [tabActivo, itemsPagina]);

  return (
    <div className="group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300">
      {/* Sol decorativo en esquina superior izquierda */}
      <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
        <div className="absolute inset-3 rounded-full border border-emerald-500/20 bg-emerald-500/[0.04]" />
        <div className="absolute inset-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent transition-transform duration-500 group-hover/acordeon:scale-125" />
      </div>

      {/* Cabecera Principal del Acordeón (Clickeable) */}
      <div
        onClick={handleToggleAcordeon}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleAcordeon();
          }
        }}
        className="w-full relative z-10 flex flex-col gap-3 sm:gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
        title={estaAbierto ? "Clic para cerrar movimientos" : "Clic para ver movimientos detallados"}
      >
        {/* Fila 1: Icono Principal + Título y Subtítulo Descriptivo */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 w-full">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs">
            <Receipt className="w-5 h-5 text-black" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight leading-snug">
              Libro Diario de Movimientos
            </h3>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <span>{nombreMes} {ano}</span>
              <span className="text-slate-300">•</span>
              <span>
                {conteoCobranzasResumen + conteoEgresosResumen}{" "}
                {conteoCobranzasResumen + conteoEgresosResumen === 1 ? "movimiento" : "movimientos"}
              </span>
            </p>
          </div>
        </div>

        {/* Fila 2: Tarjetas de Ingresos y Egresos a Ancho Completo */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
          {/* Card Ingresos */}
          <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#175E38] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block leading-none truncate">
                Ingresos ({conteoCobranzasResumen})
              </span>
              <span className="text-xs sm:text-sm font-black font-heading text-[#175E38] leading-tight block mt-1 truncate">
                +{formatearMontoUSD(totalIngresosResumen)}
              </span>
            </div>
          </div>

          {/* Card Egresos */}
          <div className="bg-rose-50/90 border border-rose-200/80 rounded-xl p-2.5 sm:px-3.5 sm:py-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-[#CC1A22] flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block leading-none truncate">
                Egresos ({conteoEgresosResumen})
              </span>
              <span className="text-xs sm:text-sm font-black font-heading text-[#CC1A22] leading-tight block mt-1 truncate">
                -{formatearMontoUSD(totalEgresosResumen)}
              </span>
            </div>
          </div>
        </div>

        {/* Fila 3: Acciones (Desplegable a la izquierda y Registrar a la derecha) */}
        <div className="w-full flex items-center justify-between gap-3 pt-2.5 sm:pt-3 border-t border-slate-100 shrink-0">
          {/* Botón Desplegable */}
          <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                estaAbierto ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
              }`}
            >
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-600 select-none whitespace-nowrap">
              {estaAbierto ? "Cerrar" : "Ver detalle"}
            </span>
          </div>

          {/* Botón Registrar Movimiento */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegistrarMovimiento();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span>Registrar</span>
            <span className="hidden sm:inline">Movimiento</span>
          </button>
        </div>
      </div>

      {/* Contenido Desplegable Animado */}
      <div
        className={`grid transition-all duration-300 ease-in-out border-t border-slate-100 ${
          estaAbierto
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3.5 sm:p-5 space-y-4 bg-slate-50/50">
            {/* Barra de Controles: Toggle Segmentado y Buscador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleCambiarTab("INGRESOS")}
                  className={`h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tabActivo === "INGRESOS"
                      ? "bg-[#175E38] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Ingresos ({datosCargados?.conteoIngresos ?? conteoCobranzasResumen})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCambiarTab("EGRESOS")}
                  className={`h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tabActivo === "EGRESOS"
                      ? "bg-[#CC1A22] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Egresos ({datosCargados?.conteoEgresos ?? conteoEgresosResumen})</span>
                </button>
              </div>

              {/* Buscador Rápido */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => handleCambiarBusqueda(e.target.value)}
                  placeholder={
                    tabActivo === "INGRESOS"
                      ? "Buscar inquilino, unidad o ref..."
                      : "Buscar concepto o proveedor..."
                  }
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-white"
                />
                {busqueda && (
                  <button
                    onClick={() => handleCambiarBusqueda("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Estado de Carga */}
            {isCargando && (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <RotateCw className="w-6 h-6 text-[#175E38] animate-spin" />
                <p className="text-xs font-bold text-slate-700">Cargando libro diario de {nombreMes}...</p>
                <p className="text-[11px] text-slate-400">Consolidando cobranzas y egresos operativos</p>
              </div>
            )}

            {/* TAB 1: LISTADO DE INGRESOS AGRUPADOS POR FECHA */}
            {!isCargando && tabActivo === "INGRESOS" && (
              <div className="space-y-4">
                {ingresosAgrupados.length > 0 ? (
                  ingresosAgrupados.map((grupo) => (
                    <div key={grupo.fechaClave} className="space-y-1.5">
                      {/* Cabecera del Día */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 px-1.5 pt-1 pb-0.5">
                        {/* Título de la Fecha */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#175E38] shrink-0" />
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 font-heading">
                            {grupo.fechaLegible}
                          </h4>
                        </div>

                        {/* Conteo y Total del Día (Abajo en Móvil, a la Derecha en Desktop) */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs pl-4.5 sm:pl-0">
                          <span className="text-[11px] font-semibold text-slate-400">
                            {grupo.items.length} {grupo.items.length === 1 ? "movimiento" : "movimientos"}
                          </span>
                          <span className="hidden sm:inline text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-600 font-heading">
                            Día: <strong className="text-[#175E38] font-black">{formatearMontoUSD(grupo.totalMonto)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tarjeta Contenedora del Día */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                        {grupo.items.map((item, itemIdx) => {
                          const metodoLabel =
                            item.metodoPago && METODO_PAGO_CONFIG[item.metodoPago as keyof typeof METODO_PAGO_CONFIG]
                              ? METODO_PAGO_CONFIG[item.metodoPago as keyof typeof METODO_PAGO_CONFIG].label
                              : item.metodoPago || "Efectivo";

                          return (
                            <div
                              key={item.id}
                              className={`p-3 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group ${
                                itemIdx % 2 === 1
                                  ? "bg-emerald-50/50 hover:bg-emerald-100/50"
                                  : "bg-white hover:bg-emerald-50/30"
                              }`}
                            >
                              {/* Fila Principal (Móvil: Icono + Datos | Desktop: Izquierda Completa) */}
                              <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                {/* Icono */}
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                  {item.tipo === "ALQUILER" ? (
                                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                                  )}
                                </div>

                                {/* Información del Inquilino y Contrato */}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  {/* Línea 1: Inquilino o Concepto + Píldora de Unidad + Monto en Móvil */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                                      <h5 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                                        {item.inquilinoNombre || item.concepto}
                                      </h5>

                                      {item.unidadCodigo && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
                                          {item.unidadCodigo}
                                        </span>
                                      )}

                                      {item.tipo === "ALQUILER" ? (
                                        item.contratoCodigo && (
                                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                            ({item.contratoCodigo})
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                                          Extra
                                        </span>
                                      )}
                                    </div>

                                    {/* Monto en Móvil (Visible arriba a la derecha de la Línea 1) */}
                                    <div className="text-right shrink-0 sm:hidden">
                                      <span className="text-sm font-black font-heading text-[#175E38] block leading-tight">
                                        +{formatearMontoUSD(item.monto)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Línea 2 Móvil: Propiedad completa */}
                                  {item.propiedadNombre && (
                                    <p className="text-xs text-slate-500 truncate sm:hidden flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{item.propiedadNombre}</span>
                                    </p>
                                  )}

                                  {/* Desktop Only: Propiedad & Método en Desktop */}
                                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                    {item.propiedadNombre && (
                                      <span className="truncate">{item.propiedadNombre}</span>
                                    )}

                                    {item.propiedadNombre && (
                                      <span className="text-slate-300">•</span>
                                    )}

                                    {/* Método visible en línea únicamente en desktop */}
                                    <span className="inline-flex items-center gap-1 text-slate-500 shrink-0">
                                      <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>{metodoLabel}</span>
                                      {item.referencia && (
                                        <span className="text-slate-400 font-mono text-[11px]">
                                          #{item.referencia}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Barra Inferior en Móvil / Derecha en Desktop */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                {/* Método de Pago visible en móvil en el pie de la card */}
                                <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{metodoLabel}</span>
                                  {item.referencia && (
                                    <span className="text-slate-400 font-mono text-[10px] shrink-0">
                                      #{item.referencia}
                                    </span>
                                  )}
                                </div>

                                {/* Monto en Desktop (Visible a la derecha) */}
                                <div className="hidden sm:block text-right">
                                  <span className="text-base sm:text-lg font-black font-heading text-[#175E38] block leading-tight">
                                    +{formatearMontoUSD(item.monto)}
                                  </span>
                                </div>

                                {/* Botón de Comprobante / Acciones */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.comprobanteUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onVerComprobante(
                                          item.comprobanteUrl!,
                                          `${item.inquilinoNombre || item.concepto} - ${formatearMontoUSD(item.monto)}`
                                        )
                                      }
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-200/90 hover:bg-[#175E38] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
                                      title="Ver comprobante de pago"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Recibo</span>
                                    </button>
                                  ) : null}

                                  {/* Acciones para ingresos manuales extraordinarios */}
                                  {item.transaccionOriginal && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onEditarTransaccion(item.transaccionOriginal!)}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 flex items-center justify-center cursor-pointer transition-all"
                                        title="Editar"
                                      >
                                        <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onEliminarTransaccion(item.transaccionOriginal!)}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-all"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">No hay ingresos para los filtros aplicados</p>
                    <p className="text-[11px] text-slate-400">
                      No se encontraron cobranzas de alquiler ni ingresos extra en {nombreMes} {ano}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LISTADO DE EGRESOS AGRUPADOS POR FECHA */}
            {!isCargando && tabActivo === "EGRESOS" && (
              <div className="space-y-4">
                {egresosAgrupados.length > 0 ? (
                  egresosAgrupados.map((grupo) => (
                    <div key={grupo.fechaClave} className="space-y-1.5">
                      {/* Cabecera del Día */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 px-1.5 pt-1 pb-0.5">
                        {/* Título de la Fecha */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 font-heading">
                            {grupo.fechaLegible}
                          </h4>
                        </div>

                        {/* Conteo y Total del Día (Abajo en Móvil, a la Derecha en Desktop) */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs pl-4.5 sm:pl-0">
                          <span className="text-[11px] font-semibold text-slate-400">
                            {grupo.items.length} {grupo.items.length === 1 ? "movimiento" : "movimientos"}
                          </span>
                          <span className="hidden sm:inline text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-600 font-heading">
                            Día: <strong className="text-rose-600 font-black">{formatearMontoUSD(grupo.totalMonto)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tarjeta Contenedora del Día */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                        {grupo.items.map((item, itemIdx) => {
                          const metodoLabel =
                            item.metodoPago && METODO_PAGO_CONFIG[item.metodoPago as keyof typeof METODO_PAGO_CONFIG]
                              ? METODO_PAGO_CONFIG[item.metodoPago as keyof typeof METODO_PAGO_CONFIG].label
                              : item.metodoPago || "Efectivo";

                          const configCat = CATEGORIA_CONFIG[item.categoria];
                          const IconoCat = configCat?.icon || Tag;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group ${
                                itemIdx % 2 === 1
                                  ? "bg-rose-50/50 hover:bg-rose-100/50"
                                  : "bg-white hover:bg-rose-50/30"
                              }`}
                            >
                              {/* Fila Principal (Móvil: Icono + Datos | Desktop: Izquierda Completa) */}
                              <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                                {/* Icono con tooltip de categoría */}
                                <div
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0"
                                  title={item.categoriaLabel}
                                >
                                  <IconoCat className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>

                                {/* Información del Concepto */}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  {/* Línea 1: Concepto + Monto en Móvil */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h5 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                                        {item.concepto}
                                      </h5>
                                    </div>

                                    {/* Monto en Móvil (Visible arriba a la derecha de la Línea 1) */}
                                    <div className="text-right shrink-0 sm:hidden">
                                      <span className="text-sm font-black font-heading text-rose-600 block leading-tight">
                                        -{formatearMontoUSD(item.monto)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Línea 2 Móvil: Proveedor / Beneficiario en su propia fila */}
                                  {item.beneficiario && (
                                    <p className="text-xs text-slate-600 font-medium truncate sm:hidden">
                                      Para: <span className="text-slate-800 font-semibold">{item.beneficiario}</span>
                                    </p>
                                  )}

                                  {/* Línea 3 Móvil: Inmueble / Propiedad en su propia fila */}
                                  {item.propiedadNombre && (
                                    <p className="text-xs text-slate-500 truncate sm:hidden flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{item.propiedadNombre}</span>
                                    </p>
                                  )}

                                  {/* Desktop Only: Beneficiario, Propiedad & Método en Desktop */}
                                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 truncate">
                                    {item.beneficiario && (
                                      <span className="truncate">Para: {item.beneficiario}</span>
                                    )}

                                    {item.beneficiario && item.propiedadNombre && (
                                      <span className="text-slate-300">•</span>
                                    )}

                                    {item.propiedadNombre && (
                                      <span className="truncate">{item.propiedadNombre}</span>
                                    )}

                                    {(item.beneficiario || item.propiedadNombre) && (
                                      <span className="text-slate-300">•</span>
                                    )}

                                    <span className="inline-flex items-center gap-1 text-slate-500 shrink-0">
                                      <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>{metodoLabel}</span>
                                      {item.referencia && (
                                        <span className="text-slate-400 font-mono text-[11px]">
                                          #{item.referencia}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Barra Inferior en Móvil / Derecha en Desktop */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                {/* Método de Pago visible en móvil en el pie de la card */}
                                <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{metodoLabel}</span>
                                  {item.referencia && (
                                    <span className="text-slate-400 font-mono text-[10px] shrink-0">
                                      #{item.referencia}
                                    </span>
                                  )}
                                </div>

                                {/* Monto en Desktop (Visible a la derecha) */}
                                <div className="hidden sm:block text-right">
                                  <span className="text-base sm:text-lg font-black font-heading text-rose-600 block leading-tight">
                                    -{formatearMontoUSD(item.monto)}
                                  </span>
                                </div>

                                {/* Acciones (Factura, Editar, Eliminar) */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.comprobanteUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onVerComprobante(
                                          item.comprobanteUrl!,
                                          `${item.concepto} - ${formatearMontoUSD(item.monto)}`
                                        )
                                      }
                                      className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/90 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
                                      title="Ver factura digital"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Factura</span>
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={() => onEditarTransaccion(item.transaccionOriginal)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 flex items-center justify-center cursor-pointer transition-all"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onEliminarTransaccion(item.transaccionOriginal)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-all"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Sin egresos registrados en este periodo</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      El 100% de los ingresos de {nombreMes} de {ano} se conservan como liquidez neta operativa.
                    </p>
                    <button
                      onClick={onRegistrarMovimiento}
                      className="mt-2 text-xs font-bold text-[#175E38] hover:underline cursor-pointer"
                    >
                      + Registrar gasto operativo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Barra de Paginación Real (Bloques de 20 en 20 registros) */}
            {!isCargando && totalItems > 0 && (
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <p className="text-xs text-slate-500 font-medium">
                  Mostrando <span className="font-bold text-slate-800">{inicio + 1}</span>–
                  <span className="font-bold text-slate-800">{Math.min(fin, totalItems)}</span> de{" "}
                  <span className="font-bold text-slate-800">{totalItems}</span> movimientos{" "}
                  <span className="text-slate-400">({ITEMS_POR_PAGINA} por página)</span>
                </p>

                {totalPaginas > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={paginaSegura === 1}
                      onClick={() => setPaginaActual(Math.max(1, paginaSegura - 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                      aria-label="Página anterior"
                    >
                      <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                    </button>

                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPaginas <= 5) return true;
                        return p === 1 || p === totalPaginas || Math.abs(p - paginaSegura) <= 1;
                      })
                      .map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPaginaActual(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            paginaSegura === p
                              ? "bg-[#175E38] text-white shadow-xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                    <button
                      type="button"
                      disabled={paginaSegura === totalPaginas}
                      onClick={() => setPaginaActual(Math.min(totalPaginas, paginaSegura + 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                      aria-label="Página siguiente"
                    >
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
