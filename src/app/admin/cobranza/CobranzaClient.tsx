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
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { OPCIONES_MESES as MESES } from "@/lib/date-utils";
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
  getMorososHistoricosAction,
  type RegistrarPagoInput,
} from "@/lib/actions/cobranza";
import type { PagoItem, EstadisticasCobranza, PropiedadOpcion } from "./types";
import { PagoFormModal } from "./PagoFormModal";
import { PagoDetalleModal } from "./PagoDetalleModal";
import { ReciboModal } from "./ReciboModal";
import { MorososHistoricosModal } from "./MorososHistoricosModal";
import { ServiciosSolvenciaModal } from "./ServiciosSolvenciaModal";
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
  const [pagoAServicios, setPagoAServicios] = useState<PagoItem | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Modal de Morosos Históricos (Fase 25)
  const [isMorososModalOpen, setIsMorososModalOpen] = useState(false);
  const [morososHistoricosList, setMorososHistoricosList] = useState<PagoItem[]>([]);
  const [isLoadingMorosos, setIsLoadingMorosos] = useState(false);

  // Abrir modal de deudas históricas con carga bajo demanda
  const abrirModalMorosos = async () => {
    setIsMorososModalOpen(true);
    setIsLoadingMorosos(true);
    try {
      const res = await getMorososHistoricosAction();
      if (res.success) {
        setMorososHistoricosList(res.pagos);
      } else {
        toast.error(res.error || "No se pudieron cargar las deudas históricas.");
      }
    } finally {
      setIsLoadingMorosos(false);
    }
  };

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

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpieza de temporizadores activos
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Transiciones y carga
  const [isPending, startTransition] = useTransition();

  // Opciones para el selector de Inmuebles
  const opcionesPropiedadCobranza = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODAS",
        label: "Todos los inmuebles",
        icon: Building2,
        count: estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal,
        isGlobal: true,
      },
      ...propiedades.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        icon: p.tipo ? tipoPropiedadBadgeConfig(p.tipo as TipoPropiedad).icon : Building2,
        count: estadisticas.conteoPorPropiedad?.[p.id] ?? 0,
      })),
    ];
  }, [propiedades, estadisticas]);

  // Estados disponibles con conteo dinámico del periodo
  const opcionesEstadoCobranza = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: estadisticas.cantidadTotalGlobal ?? estadisticas.cantidadTotal,
        isGlobal: true,
      },
      {
        value: "POR_CONFIRMAR",
        label: "Por Confirmar (Capture)",
        icon: Receipt,
        iconClassName: "text-blue-600",
        count: estadisticas.cantidadPorConfirmar ?? 0,
      },
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
        iconClassName: "text-rose-500",
        count: estadisticas.cantidadVencidos,
      },
      {
        value: EstadoPago.PAGADO,
        label: "Liquidado (Pagado)",
        icon: CheckCircle2,
        iconClassName: "text-emerald-600",
        count: estadisticas.cantidadPagados,
      },
      {
        value: EstadoPago.PARCIAL,
        label: "Abono Parcial",
        icon: DollarSign,
        iconClassName: "text-amber-500",
        count: estadisticas.cantidadParciales,
      },
    ];
  }, [estadisticas]);

  // Refresca o consulta el listado con los filtros actuales de forma ultrarrápida
  const recargarCobranzas = (
    nuevoMes = mes,
    nuevoAno = ano,
    nuevaPagina = 1,
    nuevaPropiedad = propiedadId,
    nuevoEstado = estadoFiltro,
    nuevaBusqueda = busqueda,
    forzarSincronizacion = false,
    modoMorososHistoricos = (nuevoEstado === "MOROSOS_HISTORICOS")
  ) => {
    startTransition(async () => {
      const res = await getPagosCobranza({
        mes: nuevoMes,
        ano: nuevoAno,
        pagina: nuevaPagina,
        propiedadId: nuevaPropiedad,
        estado: nuevoEstado as EstadoPago | "TODOS" | "POR_CONFIRMAR" | "MOROSOS_HISTORICOS",
        busqueda: nuevaBusqueda,
        forzarSincronizacion,
        modoMorososHistoricos,
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

  // Refrescar listado bajo demanda
  const handleRefrescar = () => {
    recargarCobranzas(mes, ano, pagina, propiedadId, estadoFiltro, busqueda, false);
    toast.success("Listado de cobranzas actualizado.");
  };

  // Manejador para registrar pago
  const handleRegistrarPago = async (input: RegistrarPagoInput): Promise<boolean> => {
    const res = await registrarPago(input);
    if (res.success) {
      toast.success("Pago registrado exitosamente.");

      // Limpia el filtro superior si estaba filtrado por estado específico (ej: POR_CONFIRMAR)
      if (estadoFiltro !== "TODOS") {
        setEstadoFiltro("TODOS");
        setPagina(1);
        recargarCobranzas(mes, ano, 1, propiedadId, "TODOS", busqueda);
      } else {
        recargarCobranzas(mes, ano, pagina);
      }

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

            {/* Botón refrescar listado */}
            <button
              type="button"
              onClick={handleRefrescar}
              disabled={isPending}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Refrescar listado"
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

      {/* Banner de Alerta Permanente: Morosidad Histórica Acumulada de Meses Anteriores (Fase 25) */}
      {Boolean(
        estadisticas.morosidadHistoricaCuotas && estadisticas.morosidadHistoricaCuotas > 0
      ) && (
        <div className="px-4 py-3 bg-gradient-to-r from-rose-50 via-amber-50/70 to-rose-50 border border-rose-300/90 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#CC1A22] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-slate-900 font-heading">
                {estadisticas.morosidadHistoricaInquilinos} inquilino(s) con deudas de meses anteriores ({estadisticas.morosidadHistoricaCuotas} cuota(s))
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                ${estadisticas.morosidadHistoricaTotal?.toFixed(2)} USD
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirModalMorosos}
            className="w-full sm:w-auto h-8.5 px-3.5 rounded-xl text-xs font-bold bg-[#CC1A22] hover:bg-[#a81219] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:translate-y-0.5"
          >
            <span>Ver deudas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner de alerta: Pagos por confirmar reportados por inquilinos */}
      {Boolean(
        (estadisticas.cantidadPorConfirmar && estadisticas.cantidadPorConfirmar > 0) ||
        (estadisticas.cantidadPorConfirmarGlobal && estadisticas.cantidadPorConfirmarGlobal > 0)
      ) && (
        <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-200/90 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 font-heading">
                  {estadisticas.cantidadPorConfirmar && estadisticas.cantidadPorConfirmar > 0
                    ? `${estadisticas.cantidadPorConfirmar} pago(s) reportado(s) por confirmar en ${nombreMesActual}`
                    : `${estadisticas.cantidadPorConfirmarGlobal} pago(s) reportado(s) por confirmar en otros periodos`}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                  Requiere Conciliación
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Inquilinos han adjuntado comprobantes bancarios. Revisa y confirma para actualizar su solvencia.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEstadoFiltro("POR_CONFIRMAR");
              setPagina(1);
              recargarCobranzas(mes, ano, 1, propiedadId, "POR_CONFIRMAR", busqueda);
            }}
            className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-bold bg-[#1C2539] hover:bg-[#2a3754] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:translate-y-0.5"
          >
            <span>Filtrar Por Confirmar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
          <FilterDropdown
            value={propiedadId}
            onChange={(p) => {
              setPropiedadId(p);
              setPagina(1);
              recargarCobranzas(mes, ano, 1, p, estadoFiltro, busqueda);
            }}
            options={opcionesPropiedadCobranza}
            className="w-full md:w-64"
            menuWidth="w-68"
            ariaLabel="Filtrar por inmueble"
          />

          {/* 2. Selector de Estado */}
          <FilterDropdown
            value={estadoFiltro}
            onChange={(s) => {
              setEstadoFiltro(s);
              setPagina(1);
              recargarCobranzas(mes, ano, 1, propiedadId, s, busqueda);
            }}
            options={opcionesEstadoCobranza}
            className="w-full md:w-60"
            menuWidth="w-64"
            ariaLabel="Filtrar por estado"
          />


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
          description={
            (() => {
              const d = new Date();
              const mesActualReal = d.getMonth() + 1;
              const anoActualReal = d.getFullYear();
              const esFuturo = ano > anoActualReal || (ano === anoActualReal && mes > mesActualReal + 1);

              if (esFuturo) {
                return `No hay cuotas habilitadas en ${nombreMesActual} ${ano}. En períodos futuros, las mensualidades se habilitan automáticamente solo cuando el calendario avance y cada contrato haya liquidado sus cuotas previas.`;
              }
              return `No hay registros de cobro en ${nombreMesActual} ${ano} con los filtros aplicados.`;
            })()
          }
          icon="receipt"
          action={
            (() => {
              const d = new Date();
              const mesActualReal = d.getMonth() + 1;
              const anoActualReal = d.getFullYear();
              const esMesDistinto = mes !== mesActualReal || ano !== anoActualReal;

              if (esMesDistinto) {
                const nombreMesReal = MESES.find((m) => m.value === String(mesActualReal))?.label || "Mes Actual";
                return {
                  label: `Ir a ${nombreMesReal} ${anoActualReal}`,
                  onClick: () => {
                    setMes(mesActualReal);
                    setAno(anoActualReal);
                    setPagina(1);
                    recargarCobranzas(mesActualReal, anoActualReal, 1);
                  },
                };
              }
              return undefined;
            })()
          }
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
              onRegistrarPago={(id) => {
                if (estadoFiltro === "POR_CONFIRMAR") {
                  setEstadoFiltro("TODOS");
                }
                abrirDetalle(id, true);
              }}
              onVerRecibo={(p) => setPagoARecibo(p)}
              onGestionarServicios={(p) => setPagoAServicios(p)}
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
        onRechazado={() => {
          setPagoAEditar(null);
          if (estadoFiltro === "POR_CONFIRMAR") {
            setEstadoFiltro("TODOS");
            setPagina(1);
            recargarCobranzas(mes, ano, 1, propiedadId, "TODOS", busqueda);
          } else {
            recargarCobranzas(mes, ano, pagina);
          }
        }}
        isLoading={isPending}
      />

      {/* Modal para Consultar Ficha Detallada */}
      <PagoDetalleModal
        isOpen={Boolean(pagoADetalle)}
        onClose={() => setPagoADetalle(null)}
        pago={pagoADetalle}
        onAnular={handleAnularPago}
        onEliminarTransaccion={handleEliminarTransaccion}
        onRegistrarNuevo={(p) => {
          if (estadoFiltro === "POR_CONFIRMAR") {
            setEstadoFiltro("TODOS");
          }
          setPagoAEditar(p);
        }}
        onVerRecibo={(p) => setPagoARecibo(p)}
        onGestionarServicios={(p) => setPagoAServicios(p)}
        onRechazado={() => {
          if (estadoFiltro === "POR_CONFIRMAR") {
            setEstadoFiltro("TODOS");
            setPagina(1);
            recargarCobranzas(mes, ano, 1, propiedadId, "TODOS", busqueda);
          } else {
            recargarCobranzas(mes, ano, pagina);
          }
        }}
        isLoading={isPending}
      />

      {/* Modal para Recibo de Cobranza (Próxima Integración con Facturación) */}
      <ReciboModal
        isOpen={Boolean(pagoARecibo)}
        onClose={() => setPagoARecibo(null)}
        pago={pagoARecibo}
      />

      {/* Modal de Control de Servicios Públicos (Fase 27) */}
      <ServiciosSolvenciaModal
        isOpen={Boolean(pagoAServicios)}
        onClose={() => setPagoAServicios(null)}
        pago={pagoAServicios}
        onActualizado={(pagoActualizado) => {
          setPagos((prev) =>
            prev.map((p) => (p.id === pagoActualizado.id ? { ...p, ...pagoActualizado } : p))
          );
          if (pagoADetalle && pagoADetalle.id === pagoActualizado.id) {
            setPagoADetalle((prev) => (prev ? { ...prev, ...pagoActualizado } : null));
          }
        }}
      />

      {/* Modal de Morosos Históricos (Fase 25) */}
      <MorososHistoricosModal
        isOpen={isMorososModalOpen}
        onClose={() => setIsMorososModalOpen(false)}
        pagos={morososHistoricosList}
        isLoading={isLoadingMorosos}
        onVerFicha={(pagoId) => abrirDetalle(pagoId, false)}
        onRegistrarPago={(pagoId) => abrirDetalle(pagoId, true)}
      />
    </div>
  );
}
