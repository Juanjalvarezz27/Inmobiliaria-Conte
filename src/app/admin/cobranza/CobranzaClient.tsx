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
  Eye,
  Store,
  Receipt,
  Layers,
  Check,
  ChevronDown,
  Calendar,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
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

// Estilo del sol decorativo en esquina según el estado del cobro
const getPagoCornerSun = (estado: EstadoPago) => {
  switch (estado) {
    case EstadoPago.PAGADO:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
    case EstadoPago.VENCIDO:
      return {
        glow: "bg-rose-500/20",
        ring: "bg-rose-500/[0.08] border-rose-400/25",
        sun: "from-[#CC1A22]/25 to-rose-400/5",
      };
    case EstadoPago.PARCIAL:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    case EstadoPago.PENDIENTE:
    default:
      return {
        glow: "bg-amber-500/20",
        ring: "bg-amber-500/[0.08] border-amber-400/25",
        sun: "from-amber-600/25 to-amber-400/5",
      };
  }
};

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
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs">
            {/* Navegación anterior */}
            <button
              type="button"
              onClick={() => cambiarMesRelativo(-1)}
              disabled={isPending}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Selector de Mes */}
            <div className="w-36">
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
            <div className="w-24">
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
                className="w-full h-10 text-center font-bold text-slate-800 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] outline-hidden"
              />
            </div>

            {/* Navegación siguiente */}
            <button
              type="button"
              onClick={() => cambiarMesRelativo(1)}
              disabled={isPending}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Botón sincronizar */}
            <button
              type="button"
              onClick={handleSincronizarManual}
              disabled={isPending}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#175E38] border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Actualizar y sincronizar cuotas"
            >
              <RotateCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {/* 4 StatCards Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          subtitle={`${estadisticas.cantidadVencidos} cuotas fuera de plazo`}
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
          {pagos.map((pago) => {
            const inquilino = pago.contrato.inquilino;
            const unidad = pago.contrato.unidad;
            const saldoPendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);
            const telLimpio = inquilino.telefono.replace(/[^0-9]/g, "");

            // Fecha de vencimiento legible
            const fechaVence = new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
              day: "numeric",
              month: "short",
            });

            // Enlace de WhatsApp directo con mensaje contextual
            let mensajeWp = "";
            if (pago.estado === EstadoPago.PAGADO) {
              mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le confirmamos que hemos recibido satisfactoriamente su pago de $${pago.montoPagado.toFixed(2)} USD por concepto de arrendamiento del espacio ${unidad.codigo} (${nombreMesActual} ${ano}). ¡Muchas gracias por su puntualidad!`;
            } else if (pago.estado === EstadoPago.VENCIDO) {
              mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le escribimos para recordarle que el pago de la mensualidad ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} se encuentra vencido desde el día de corte. Agradecemos coordinar la cancelación a la brevedad.`;
            } else {
              mensajeWp = `Hola ${inquilino.nombre}, le saludamos de Inmobiliaria Conté. Le recordamos que la mensualidad ($${pago.montoEsperado.toFixed(2)} USD) del espacio ${unidad.codigo} vence próximamente. Quedamos a su orden para recibir el comprobante.`;
            }
            const urlWhatsapp = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeWp)}`;
            const cornerSun = getPagoCornerSun(pago.estado);

            return (
              <div
                key={pago.id}
                className="group/pagocard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Sol decorativo en esquina superior izquierda */}
                <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
                  <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                  <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                  <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/pagocard:scale-125`} />
                </div>

                {/* Contenido Interior de la Tarjeta */}
                <div className="p-5 sm:p-6 relative z-10 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Fila 1: Estado a la izquierda y Espacio/Local a la derecha */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Badge de Estado */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                        pago.estado === EstadoPago.PAGADO
                          ? "bg-emerald-50 text-[#175E38] border-emerald-200/90"
                          : pago.estado === EstadoPago.VENCIDO
                          ? "bg-rose-50 text-[#CC1A22] border-rose-200/90"
                          : pago.estado === EstadoPago.PARCIAL
                          ? "bg-blue-50 text-blue-700 border-blue-200/90"
                          : "bg-amber-50 text-amber-700 border-amber-200/90"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          pago.estado === EstadoPago.PAGADO
                            ? "bg-[#175E38]"
                            : pago.estado === EstadoPago.VENCIDO
                            ? "bg-[#CC1A22]"
                            : pago.estado === EstadoPago.PARCIAL
                            ? "bg-blue-600"
                            : "bg-amber-500"
                        }`}
                      />
                      <span>
                        {pago.estado === EstadoPago.PAGADO
                          ? "Pagado"
                          : pago.estado === EstadoPago.VENCIDO
                          ? "Vencido (Mora)"
                          : pago.estado === EstadoPago.PARCIAL
                          ? "Abono Parcial"
                          : "Por Cobrar"}
                      </span>
                    </span>

                    {/* Identificador de Espacio / Local */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 text-slate-700 font-bold text-xs border border-slate-200/80 shrink-0 max-w-[130px]">
                      <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{unidad.codigo}</span>
                    </span>
                  </div>

                  {/* Fila 2: Identidad del Inquilino y Propiedad */}
                  <div className="pt-0.5">
                    <h3 className="text-base sm:text-lg font-heading font-black text-slate-900 truncate tracking-tight">
                      {inquilino.nombre} {inquilino.apellido || ""}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{unidad.propiedad.nombre}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400 font-mono text-[11px] shrink-0">
                        {inquilino.documentoIdentidad}
                      </span>
                    </p>
                  </div>

                  {/* Fila 3: Bloque de Contacto Directo y WhatsApp */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/70 text-xs">
                    <span className="text-[11px] sm:text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{inquilino.telefono}</span>
                    </span>
                    <a
                      href={urlWhatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors shrink-0 hover:scale-105 active:scale-95"
                      title="Enviar recordatorio por WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* Fila 4: Bloque Financiero en 2 Cajas Métricas Estructuradas */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Caja 1: Monto de la Mensualidad o Abonado */}
                    <div
                      className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between ${
                        pago.estado === EstadoPago.PAGADO
                          ? "bg-emerald-50/70 border-emerald-200/80"
                          : pago.estado === EstadoPago.PARCIAL
                          ? "bg-blue-50/70 border-blue-200/80"
                          : "bg-slate-50/90 border-slate-200/80"
                      }`}
                    >
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate ${
                          pago.estado === EstadoPago.PAGADO
                            ? "text-emerald-800"
                            : pago.estado === EstadoPago.PARCIAL
                            ? "text-blue-800"
                            : "text-slate-400"
                        }`}
                      >
                        {pago.estado === EstadoPago.PAGADO
                          ? "Mensualidad Pagada"
                          : pago.estado === EstadoPago.PARCIAL
                          ? "Ya Abonado"
                          : "Mensualidad"}
                      </span>
                      <div className="mt-1.5 flex items-baseline truncate">
                        <span
                          className={`text-lg sm:text-xl font-black font-heading tracking-tight ${
                            pago.estado === EstadoPago.PAGADO
                              ? "text-[#175E38]"
                              : pago.estado === EstadoPago.PARCIAL
                              ? "text-blue-700"
                              : "text-slate-900"
                          }`}
                        >
                          ${(pago.estado === EstadoPago.PAGADO || pago.estado === EstadoPago.PARCIAL ? pago.montoPagado : pago.montoEsperado).toFixed(2)}
                        </span>
                        {pago.estado === EstadoPago.PARCIAL ? (
                          <span className="text-[10px] font-bold text-slate-400 ml-1 truncate">
                            / ${pago.montoEsperado.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 ml-1">USD</span>
                        )}
                      </div>
                    </div>

                    {/* Caja 2: Fecha de Vencimiento / Estado / Resta por pagar */}
                    <div
                      className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between text-right ${
                        pago.estado === EstadoPago.VENCIDO
                          ? "bg-rose-50/70 border-rose-200/80"
                          : pago.estado === EstadoPago.PAGADO
                          ? "bg-emerald-50/40 border-emerald-200/60"
                          : pago.estado === EstadoPago.PARCIAL
                          ? "bg-amber-50/70 border-amber-200/80"
                          : "bg-slate-50/90 border-slate-200/80"
                      }`}
                    >
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block truncate ${
                          pago.estado === EstadoPago.VENCIDO
                            ? "text-[#CC1A22]"
                            : pago.estado === EstadoPago.PAGADO
                            ? "text-emerald-800"
                            : pago.estado === EstadoPago.PARCIAL
                            ? "text-amber-800"
                            : "text-slate-400"
                        }`}
                      >
                        {pago.estado === EstadoPago.PAGADO
                          ? "Estado"
                          : pago.estado === EstadoPago.PARCIAL
                          ? "Resta"
                          : "Corte / Vence"}
                      </span>
                      <div className="mt-1.5 flex items-baseline justify-end truncate">
                        {pago.estado === EstadoPago.PAGADO ? (
                          <span className="inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-bold text-[#175E38]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Al día</span>
                          </span>
                        ) : pago.estado === EstadoPago.PARCIAL ? (
                          <>
                            <span className="text-lg sm:text-xl font-black font-heading tracking-tight text-amber-700">
                              ${saldoPendiente.toFixed(2)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 ml-1">USD</span>
                          </>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-bold ${
                              pago.estado === EstadoPago.VENCIDO
                                ? "text-[#CC1A22]"
                                : "text-slate-700"
                            }`}
                          >
                            {pago.estado === EstadoPago.VENCIDO ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-[#CC1A22] shrink-0" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{fechaVence}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer de Acciones (Grid 50/50 simétrico y obligatorio) */}
                <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2.5 relative z-10">
                  <button
                    type="button"
                    onClick={() => abrirDetalle(pago.id)}
                    disabled={isLoadingDetalle}
                    className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 disabled:opacity-60"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Ver Ficha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (pago.estado === EstadoPago.PAGADO) {
                        setPagoARecibo(pago);
                      } else {
                        abrirDetalle(pago.id, true);
                      }
                    }}
                    disabled={isLoadingDetalle}
                    className={`w-full h-10 px-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 ${
                      pago.estado === EstadoPago.PAGADO
                        ? "bg-indigo-600 hover:bg-indigo-700 border-b-[3px] border-b-indigo-800 shadow-[0_2px_8px_rgba(79,70,229,0.35)]"
                        : "bg-[#175E38] hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
                    }`}
                  >
                    {pago.estado === EstadoPago.PAGADO ? (
                      <>
                        <Receipt className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Recibo</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {pago.estado === EstadoPago.PARCIAL ? "Abonar" : "Registrar Pago"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
