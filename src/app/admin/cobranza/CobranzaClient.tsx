"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Receipt,
  Layers,
  Check,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { PagoCard } from "./PagoCard";
import { EstadoPago, TipoPropiedad } from "@prisma/client";
import { tipoPropiedadBadgeConfig } from "@/app/admin/propiedades/constants";
import {
  getPagosCobranza,
  registrarPago,
  anularPago,
  eliminarTransaccionPago,
  sincronizarCuotasMes,
  getPagoDetalle,
  type RegistrarPagoInput,
} from "@/lib/actions/cobranza";
import type { PagoItem, EstadisticasCobranza, PropiedadOpcion } from "./types";
import { PagoFormModal } from "./PagoFormModal";
import { PagoDetalleModal } from "./PagoDetalleModal";
import { ReciboModal } from "./ReciboModal";
import { toast } from "sonner";

interface CobranzaClientProps {
  pagosIniciales: PagoItem[];
  estadisticasIniciales: EstadisticasCobranza;
  totalRegistrosIniciales: number;
  totalPaginasIniciales: number;
  paginaActualInicial: number;
  mesInicial: number;
  anoInicial: number;
  propiedades: PropiedadOpcion[];
}

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];


export function CobranzaClient({
  pagosIniciales,
  estadisticasIniciales,
  totalRegistrosIniciales,
  totalPaginasIniciales,
  paginaActualInicial,
  mesInicial,
  anoInicial,
  propiedades,
}: CobranzaClientProps) {
  // Estados de control de periodo
  const [mes, setMes] = useState<number>(mesInicial);
  const [ano, setAno] = useState<number>(anoInicial);

  // Estados de datos
  const [pagos, setPagos] = useState<PagoItem[]>(pagosIniciales);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCobranza>(estadisticasIniciales);
  const [totalRegistros, setTotalRegistros] = useState<number>(totalRegistrosIniciales);
  const [totalPaginas, setTotalPaginas] = useState<number>(totalPaginasIniciales);
  const [pagina, setPagina] = useState<number>(paginaActualInicial);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>("");
  const [propiedadId, setPropiedadId] = useState<string>("TODAS");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("TODOS");

  // Modales
  const [pagoAEditar, setPagoAEditar] = useState<PagoItem | null>(null);
  const [pagoADetalle, setPagoADetalle] = useState<PagoItem | null>(null);
  const [pagoARecibo, setPagoARecibo] = useState<PagoItem | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Carga lazy del detalle completo de un pago (solo al abrir el modal)
  const abrirDetalle = async (pagoId: string, abrirEnEdicion = false) => {
    setIsLoadingDetalle(true);
    try {
      const res = await getPagoDetalle(pagoId);
      if (res.success && res.pago) {
        if (abrirEnEdicion) {
          setPagoAEditar(res.pago);
        } else {
          setPagoADetalle(res.pago);
        }
      } else {
        toast.error(res.error || "No se pudo cargar la ficha del pago.");
      }
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  // Estados y referencias para los dropdowns de filtro
  const [isDropdownPropiedadOpen, setIsDropdownPropiedadOpen] = useState(false);
  const [isDropdownEstadoOpen, setIsDropdownEstadoOpen] = useState(false);
  const dropdownPropiedadRef = useRef<HTMLDivElement>(null);
  const dropdownEstadoRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpieza de temporizadores activos
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Transiciones y carga
  const [isPending, startTransition] = useTransition();

  // Cerrar menús al hacer clic fuera o con Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownEstadoRef.current && !dropdownEstadoRef.current.contains(e.target as Node)) {
        setIsDropdownEstadoOpen(false);
      }
      if (dropdownPropiedadRef.current && !dropdownPropiedadRef.current.contains(e.target as Node)) {
        setIsDropdownPropiedadOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownEstadoOpen(false);
        setIsDropdownPropiedadOpen(false);
      }
    };
    if (isDropdownEstadoOpen || isDropdownPropiedadOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownEstadoOpen, isDropdownPropiedadOpen]);

  // Configuración de propiedad activa para el trigger
  const propiedadActivaConfig = useMemo(() => {
    if (propiedadId === "TODAS") {
      return {
        value: "TODAS",
        label: "Todos los inmuebles",
        count: estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal,
      };
    }
    const prop = propiedades.find((p) => p.id === propiedadId);
    return {
      value: propiedadId,
      label: prop ? prop.nombre : "Inmueble",
      count: prop ? (estadisticas.conteoPorPropiedad?.[prop.id] ?? 0) : 0,
    };
  }, [propiedadId, propiedades, estadisticas]);

  // Estados disponibles con conteo dinámico del periodo
  const estadosDisponibles = useMemo(() => {
    return [
      {
        value: EstadoPago.PENDIENTE,
        label: "Por Cobrar (Pendiente)",
        icon: Clock,
        count: estadisticas.cantidadPendientes,
      },
      {
        value: EstadoPago.VENCIDO,
        label: "Vencido en Mora",
        icon: AlertTriangle,
        count: estadisticas.cantidadVencidos,
      },
      {
        value: EstadoPago.PAGADO,
        label: "Liquidado (Pagado)",
        icon: CheckCircle2,
        count: estadisticas.cantidadPagados,
      },
      {
        value: EstadoPago.PARCIAL,
        label: "Abono Parcial",
        icon: DollarSign,
        count: estadisticas.cantidadParciales,
      },
    ];
  }, [estadisticas]);

  // Configuración de estado activo para el trigger
  const estadoActivoConfig = useMemo(() => {
    const totalGlobal = estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal;
    if (estadoFiltro === "TODOS") {
      return {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: totalGlobal,
      };
    }
    return (
      estadosDisponibles.find((o) => o.value === estadoFiltro) || {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: totalGlobal,
      }
    );
  }, [estadoFiltro, estadosDisponibles, estadisticas.cantidadTotal, estadisticas.cantidadTotalGlobal]);

  // Refresca o consulta el listado con los filtros actuales de forma ultrarrápida
  const recargarCobranzas = (
    nuevoMes = mes,
    nuevoAno = ano,
    nuevaPagina = 1,
    nuevaPropiedad = propiedadId,
    nuevoEstado = estadoFiltro,
    nuevaBusqueda = busqueda,
    forzarSincronizacion = false
  ) => {
    startTransition(async () => {
      const res = await getPagosCobranza({
        mes: nuevoMes,
        ano: nuevoAno,
        pagina: nuevaPagina,
        propiedadId: nuevaPropiedad,
        estado: nuevoEstado as EstadoPago | "TODOS",
        busqueda: nuevaBusqueda,
        forzarSincronizacion,
      });

      if (res.success) {
        setPagos(res.pagos);
        setEstadisticas(res.estadisticas);
        setTotalRegistros(res.totalRegistros);
        setTotalPaginas(res.totalPaginas);
        setPagina(res.paginaActual);
      } else {
        toast.error("Error al cargar cobranzas.");
      }
    });
  };

  // Manejo de búsqueda con Debounce para evitar saturación de red
  const handleBusquedaChange = (texto: string) => {
    setBusqueda(texto);
    setPagina(1);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      recargarCobranzas(mes, ano, 1, propiedadId, estadoFiltro, texto);
    }, 350);
  };

  // Navegación rápida entre meses
  const cambiarMesRelativo = (delta: number) => {
    let nuevoMes = mes + delta;
    let nuevoAno = ano;

    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAno += 1;
    } else if (nuevoMes < 1) {
      nuevoMes = 12;
      nuevoAno -= 1;
    }

    setMes(nuevoMes);
    setAno(nuevoAno);
    setPagina(1);
    recargarCobranzas(nuevoMes, nuevoAno, 1);
  };

  // Forzar sincronización bajo demanda
  const handleSincronizarManual = () => {
    startTransition(async () => {
      const res = await sincronizarCuotasMes(mes, ano);
      if (res.success) {
        toast.success(`Cuotas sincronizadas (${res.generados} nuevas, ${res.actualizados} vencidas).`);
        recargarCobranzas(mes, ano, pagina);
      } else {
        toast.error("No se pudieron sincronizar las cuotas.");
      }
    });
  };

  // Manejador para registrar pago
  const handleRegistrarPago = async (input: RegistrarPagoInput): Promise<boolean> => {
    const res = await registrarPago(input);
    if (res.success) {
      toast.success("Pago registrado exitosamente.");
      recargarCobranzas(mes, ano, pagina);
      if (pagoADetalle && pagoADetalle.id === input.pagoId) {
        const resDetalle = await getPagoDetalle(pagoADetalle.id);
        if (resDetalle.success && resDetalle.pago) {
          setPagoADetalle(resDetalle.pago);
        }
      }
      return true;
    } else {
      toast.error(res.error || "Error al registrar el pago.");
      return false;
    }
  };

  // Manejador para anular pago completo
  const handleAnularPago = async (pagoId: string): Promise<boolean> => {
    const res = await anularPago(pagoId);
    if (res.success) {
      recargarCobranzas(mes, ano, pagina);
      return true;
    } else {
      toast.error(res.error || "Error al anular el pago.");
      return false;
    }
  };

  // Manejador para eliminar un abono individual del libro mayor
  const handleEliminarTransaccion = async (transaccionId: string): Promise<boolean> => {
    const res = await eliminarTransaccionPago(transaccionId);
    if (res.success) {
      toast.success("Abono eliminado y saldo recalculado.");
      recargarCobranzas(mes, ano, pagina);
      if (pagoADetalle) {
        const resDetalle = await getPagoDetalle(pagoADetalle.id);
        if (resDetalle.success && resDetalle.pago) {
          setPagoADetalle(resDetalle.pago);
        }
      }
      return true;
    } else {
      toast.error(res.error || "Error al eliminar el abono.");
      return false;
    }
  };

  const nombreMesActual = MESES.find((m) => m.value === String(mes))?.label || "Mes";

  return (
    <div className="space-y-6">
      {/* Encabezado con selector de periodo */}
      <PageHeader
        title="Control de Cobranzas y Mensualidades"
        icon={<Receipt className="w-6 h-6 text-white" />}
        actions={
          <div className="w-full sm:w-auto flex items-center justify-between gap-1.5 sm:gap-2 bg-white border border-slate-200/90 rounded-2xl p-1.5 sm:p-2 shadow-2xs">
            {/* Navegación anterior */}
            <button
              type="button"
              onClick={() => cambiarMesRelativo(-1)}
              disabled={isPending}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Selectores de Mes y Año agrupados fluidamente */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {/* Selector de Mes */}
              <div className="flex-1 min-w-[105px] sm:w-36 sm:flex-initial">
                <Select
                  value={String(mes)}
                  onChange={(val) => {
                    const m = Number(val);
                    setMes(m);
                    setPagina(1);
                    recargarCobranzas(m, ano, 1);
                  }}
                  options={MESES}
                />
              </div>

              {/* Selector de Año */}
              <div className="w-18 sm:w-24 shrink-0">
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={ano}
                  onChange={(e) => {
                    const a = Number(e.target.value);
                    setAno(a);
                    setPagina(1);
                    recargarCobranzas(mes, a, 1);
                  }}
                  className="w-full h-10 text-center font-bold text-slate-800 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden"
                />
              </div>
            </div>

            {/* Navegación siguiente */}
            <button
              type="button"
              onClick={() => cambiarMesRelativo(1)}
              disabled={isPending}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Separador vertical tenue */}
            <div className="h-6 w-px bg-slate-200 shrink-0 mx-0.5" />

            {/* Botón sincronizar */}
            <button
              type="button"
              onClick={handleSincronizarManual}
              disabled={isPending}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#175E38] border border-emerald-200/80 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Actualizar y sincronizar cuotas"
            >
              <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPending ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {/* 4 StatCards Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Facturado */}
        <StatCard
          title="Total Facturado"
          value={`$${estadisticas.totalFacturado.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${estadisticas.cantidadTotal} cuotas de ${nombreMesActual}`}
          icon={DollarSign}
          color="navy"
        />

        {/* Recaudado */}
        <StatCard
          title="Recaudado"
          value={`$${estadisticas.totalRecaudado.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${estadisticas.porcentajeRecaudado}% de efectividad`}
          progressPercent={estadisticas.porcentajeRecaudado}
          icon={CheckCircle2}
          color="emerald"
        />

        {/* Por Cobrar */}
        <StatCard
          title="Por Cobrar"
          value={`$${estadisticas.totalPorCobrar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${estadisticas.cantidadPendientes} cuotas en plazo`}
          icon={Clock}
          color="blue"
        />

        {/* En Mora */}
        <StatCard
          title="En Mora (Vencido)"
          value={`$${estadisticas.totalEnMora.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${estadisticas.cantidadVencidos} cuotas vencidas`}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Barra de Filtros Adaptativa (Móvil: apilados verticalmente a ancho completo) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Campo de búsqueda con Debounce */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => handleBusquedaChange(e.target.value)}
              placeholder="Buscar por inquilino, cédula/RIF, local o contrato..."
              className="w-full pl-10 pr-3.5 h-11 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden font-medium text-slate-800"
            />
          </div>

          {/* 1. Selector de Propiedad / Inmueble */}
          <div ref={dropdownPropiedadRef} className="relative w-full md:w-64">
            {/* Capa móvil nativa para iOS y Android */}
            <select
              value={propiedadId}
              onChange={(e) => {
                const p = e.target.value;
                setPropiedadId(p);
                setPagina(1);
                recargarCobranzas(mes, ano, 1, p, estadoFiltro, busqueda);
              }}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar por inmueble"
            >
              <option value="TODAS">
                Todos los inmuebles ({estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal})
              </option>
              {propiedades.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({estadisticas.conteoPorPropiedad?.[p.id] ?? 0})
                </option>
              ))}
            </select>

            {/* Botón Desktop */}
            <button
              type="button"
              onClick={() => {
                setIsDropdownPropiedadOpen((prev) => !prev);
                setIsDropdownEstadoOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 sm:px-3.5 h-11 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{propiedadActivaConfig.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                  isDropdownPropiedadOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Menú flotante Desktop Inmueble */}
            {isDropdownPropiedadOpen && (
              <div className="hidden md:block absolute right-0 top-full mt-1.5 w-68 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPropiedadId("TODAS");
                    setIsDropdownPropiedadOpen(false);
                    setPagina(1);
                    recargarCobranzas(mes, ano, 1, "TODAS", estadoFiltro, busqueda);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    propiedadId === "TODAS"
                      ? "bg-slate-50 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Todos los inmuebles</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal}
                    </span>
                    {propiedadId === "TODAS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                  </div>
                </button>

                {propiedades.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {propiedades.map((p) => {
                  const isSelected = propiedadId === p.id;
                  const count = estadisticas.conteoPorPropiedad?.[p.id] ?? 0;
                  const IconComp = p.tipo ? tipoPropiedadBadgeConfig(p.tipo as TipoPropiedad).icon : Building2;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPropiedadId(p.id);
                        setIsDropdownPropiedadOpen(false);
                        setPagina(1);
                        recargarCobranzas(mes, ano, 1, p.id, estadoFiltro, busqueda);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <IconComp className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="truncate text-left">
                          <p className="truncate font-medium">{p.nombre}</p>
                          {p.ciudad && <p className="text-[10px] text-slate-400 truncate">{p.ciudad}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Selector de Estado */}
          <div ref={dropdownEstadoRef} className="relative w-full md:w-60">
            {/* Capa móvil nativa para iOS y Android */}
            <select
              value={estadoFiltro}
              onChange={(e) => {
                const s = e.target.value;
                setEstadoFiltro(s);
                setPagina(1);
                recargarCobranzas(mes, ano, 1, propiedadId, s, busqueda);
              }}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar por estado"
            >
              <option value="TODOS">
                Todos los estados ({estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal})
              </option>
              {estadosDisponibles.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>

            {/* Botón Desktop */}
            <button
              type="button"
              onClick={() => {
                setIsDropdownEstadoOpen((prev) => !prev);
                setIsDropdownPropiedadOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 sm:px-3.5 h-11 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
            >
              <div className="flex items-center gap-2 truncate">
                {React.createElement(estadoActivoConfig.icon, {
                  className: "w-4 h-4 text-slate-500 shrink-0",
                })}
                <span className="truncate">{estadoActivoConfig.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                  isDropdownEstadoOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Menú flotante Desktop Estado */}
            {isDropdownEstadoOpen && (
              <div className="hidden md:block absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setEstadoFiltro("TODOS");
                    setIsDropdownEstadoOpen(false);
                    setPagina(1);
                    recargarCobranzas(mes, ano, 1, propiedadId, "TODOS", busqueda);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    estadoFiltro === "TODOS"
                      ? "bg-slate-50 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Todos los estados</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal}
                    </span>
                    {estadoFiltro === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                  </div>
                </button>

                {estadosDisponibles.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {estadosDisponibles.map((opt) => {
                  const isSelected = estadoFiltro === opt.value;
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setEstadoFiltro(opt.value);
                        setIsDropdownEstadoOpen(false);
                        setPagina(1);
                        recargarCobranzas(mes, ano, 1, propiedadId, opt.value, busqueda);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <IconComponent className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {opt.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Indicador de resultados activos */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Periodo: <strong className="text-slate-800">{nombreMesActual} {ano}</strong> • Total cuotas encontradas:{" "}
            <strong className="text-slate-800">{totalRegistros}</strong>
          </span>
          {(busqueda || propiedadId !== "TODAS" || estadoFiltro !== "TODOS") && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setPropiedadId("TODAS");
                setEstadoFiltro("TODOS");
                recargarCobranzas(mes, ano, 1, "TODAS", "TODOS", "");
              }}
              className="text-[#175E38] font-bold hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid de Tarjetas de Cobranza (Alto impacto visual con efecto sol y bordes 3D) */}
      {pagos.length === 0 ? (
        <EmptyState
          title="No se encontraron cuotas para este periodo"
          description={`No hay registros de cobro en ${nombreMesActual} ${ano} con los filtros aplicados. Puedes cambiar de mes o sincronizar cuotas si hay contratos activos.`}
          icon="receipt"
          action={{
            label: "Sincronizar Cuotas del Mes",
            onClick: handleSincronizarManual,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {pagos.map((pago) => (
            <PagoCard
              key={pago.id}
              pago={pago}
              nombreMesActual={nombreMesActual}
              ano={ano}
              isLoadingDetalle={isLoadingDetalle}
              onVerFicha={(id) => abrirDetalle(id)}
              onRegistrarPago={(id) => abrirDetalle(id, true)}
              onVerRecibo={(p) => setPagoARecibo(p)}
            />
          ))}
        </div>
      )}

      {/* Paginación Homogénea de 20 en 20 */}
      {totalRegistros > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 font-medium">
            Mostrando <strong className="text-slate-800">{pagos.length}</strong> de{" "}
            <strong className="text-slate-800">{totalRegistros}</strong> cobros{" "}
            <span className="text-slate-400 font-normal">
              (Página {pagina} de {totalPaginas} • 20 registros por página)
            </span>
          </p>

          {totalPaginas > 1 ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagina <= 1 || isPending}
                onClick={() => {
                  const prev = pagina - 1;
                  setPagina(prev);
                  recargarCobranzas(mes, ano, prev);
                }}
                className="px-3 h-9 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              {/* Números de página */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => {
                  // Mostrar solo páginas cercanas para evitar overflow
                  if (
                    p === 1 ||
                    p === totalPaginas ||
                    (p >= pagina - 1 && p <= pagina + 1)
                  ) {
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setPagina(p);
                          recargarCobranzas(mes, ano, p);
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          p === pagina
                            ? "bg-[#175E38] text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  } else if (p === pagina - 2 || p === pagina + 2) {
                    return (
                      <span key={p} className="text-slate-400 text-xs px-1">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                disabled={pagina >= totalPaginas || isPending}
                onClick={() => {
                  const next = pagina + 1;
                  setPagina(next);
                  recargarCobranzas(mes, ano, next);
                }}
                className="px-3 h-9 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
              Todos los cobros visibles en esta página
            </div>
          )}
        </div>
      )}

      {/* Modal para Registrar Pago */}
      <PagoFormModal
        isOpen={Boolean(pagoAEditar)}
        onClose={() => setPagoAEditar(null)}
        pago={pagoAEditar}
        onSubmit={handleRegistrarPago}
        isLoading={isPending}
      />

      {/* Modal para Consultar Ficha Detallada */}
      <PagoDetalleModal
        isOpen={Boolean(pagoADetalle)}
        onClose={() => setPagoADetalle(null)}
        pago={pagoADetalle}
        onAnular={handleAnularPago}
        onEliminarTransaccion={handleEliminarTransaccion}
        onRegistrarNuevo={(p) => setPagoAEditar(p)}
        onVerRecibo={(p) => setPagoARecibo(p)}
        isLoading={isPending}
      />

      {/* Modal para Recibo de Cobranza (Próxima Integración con Facturación) */}
      <ReciboModal
        isOpen={Boolean(pagoARecibo)}
        onClose={() => setPagoARecibo(null)}
        pago={pagoARecibo}
      />
    </div>
  );
}
