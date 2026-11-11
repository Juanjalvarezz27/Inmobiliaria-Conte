"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  PieChart,
  Plus,
  Building2,
  FileSpreadsheet,
  RotateCw,
  Calendar,
  Sparkles,
  Coins,
  ChevronDown,
  LineChart,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { toast } from "sonner";
import {
  TipoPropiedad,
} from "@prisma/client";
import { tipoPropiedadBadgeConfig } from "@/app/admin/propiedades/constants";
import type {
  TransaccionFinancieraItem,
  EstadisticasFinanzas,
  PropiedadFinanzasOpcion,
} from "./types";
import {
  getFinanzasData,
  crearTransaccionFinanciera,
  actualizarTransaccionFinanciera,
  eliminarTransaccionFinanciera,
  type TransaccionInput,
} from "@/lib/actions/finanzas";
import { TransaccionFormModal } from "./TransaccionFormModal";
import { CierreMesModal } from "./CierreMesModal";
import { GraficaIngresosMes } from "./GraficaIngresosMes";
import { GraficaEgresosMes } from "./GraficaEgresosMes";
import { MovimientosDesplegable } from "./MovimientosDesplegable";
import {
  MESES,
  formatearMontoUSD,
} from "./constants";

interface FinanzasClientProps {
  estadisticasIniciales: EstadisticasFinanzas;
  mesInicial: number;
  anoInicial: number;
  propiedades: PropiedadFinanzasOpcion[];
}

export function FinanzasClient({
  estadisticasIniciales,
  mesInicial,
  anoInicial,
  propiedades,
}: FinanzasClientProps) {
  // Periodo activo
  const [mes, setMes] = useState<number>(mesInicial);
  const [ano, setAno] = useState<number>(() => {
    if (anoInicial < 2026) return 2026;
    if (anoInicial > 2030) return 2030;
    return anoInicial;
  });

  // Estados de datos
  const [estadisticas, setEstadisticas] =
    useState<EstadisticasFinanzas>(estadisticasIniciales);

  // Filtro de Inmueble
  const [propiedadId, setPropiedadId] = useState<string>("TODAS");

  // Trigger para recargar el libro diario desplegable
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [transaccionAEditar, setTransaccionAEditar] =
    useState<TransaccionFinancieraItem | null>(null);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [transaccionAEliminar, setTransaccionAEliminar] =
    useState<TransaccionFinancieraItem | null>(null);

  // Visor de imagen / comprobante
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>("");

  // Loading / Transitions
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tasa BCV del día para visualización ejecutiva
  const [tasaBcvHoy, setTasaBcvHoy] = useState<number | null>(null);

  // Visibilidad colapsable de gráficas para mayor ligereza visual
  const [mostrarGraficos, setMostrarGraficos] = useState(true);

  // Filtro de Moneda (TODAS, VES, USD) sincronizado con el Libro Diario
  const [filtroMoneda, setFiltroMoneda] = useState<"TODAS" | "VES" | "USD">("TODAS");

  useEffect(() => {
    async function cargarTasa() {
      try {
        const res = await fetch("/api/bcv");
        const json = await res.json();
        if (json.success && json.data?.tasa) {
          setTasaBcvHoy(json.data.tasa);
        }
      } catch (e) {
        console.warn("No se pudo cargar la tasa BCV:", e);
      }
    }
    cargarTasa();
  }, []);

  // Cargar datos al cambiar mes, año o propiedad
  const cargarDatos = (
    nuevoMes = mes,
    nuevoAno = ano,
    nuevoPropiedadId = propiedadId
  ) => {
    startTransition(async () => {
      try {
        const res = await getFinanzasData({
          mes: nuevoMes,
          ano: nuevoAno,
          propiedadId: nuevoPropiedadId,
        });

        setEstadisticas(res.estadisticas);
      } catch (err: unknown) {
        console.error("Error al cargar finanzas:", err);
        toast.error("No se pudieron actualizar los datos de finanzas.");
      }
    });
  };

  const handleCambioMes = (nuevoMesStr: string) => {
    const nuevoMes = parseInt(nuevoMesStr, 10);
    setMes(nuevoMes);
    cargarDatos(nuevoMes, ano, propiedadId);
  };

  const handleCambioAno = (nuevoAnoStr: string) => {
    const nuevoAno = parseInt(nuevoAnoStr, 10);
    setAno(nuevoAno);
    cargarDatos(mes, nuevoAno, propiedadId);
  };

  const handleCambioPropiedad = (pId: string) => {
    setPropiedadId(pId);
    cargarDatos(mes, ano, pId);
  };

  // Manejo de Formulario (Crear o Actualizar)
  const handleGuardarTransaccion = async (data: TransaccionInput) => {
    setIsSubmitting(true);
    try {
      if (transaccionAEditar) {
        const res = await actualizarTransaccionFinanciera(transaccionAEditar.id, data);
        if (res.success) {
          toast.success("Movimiento actualizado correctamente.");
          cargarDatos();
          setRefreshKey((k) => k + 1);
          return true;
        } else {
          toast.error(res.error || "Error al actualizar.");
          return false;
        }
      } else {
        const res = await crearTransaccionFinanciera(data);
        if (res.success) {
          toast.success("Movimiento registrado correctamente.");
          cargarDatos();
          setRefreshKey((k) => k + 1);
          return true;
        } else {
          toast.error(res.error || "Error al registrar.");
          return false;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejo de Eliminación
  const handleConfirmarEliminar = async () => {
    if (!transaccionAEliminar) return;
    setIsSubmitting(true);
    try {
      const res = await eliminarTransaccionFinanciera(transaccionAEliminar.id);
      if (res.success) {
        toast.success("Movimiento eliminado correctamente.");
        setTransaccionAEliminar(null);
        cargarDatos();
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(res.error || "Error al eliminar movimiento.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conteo acumulado de movimientos de todas las propiedades
  const conteoTotalPropiedades = useMemo(() => {
    return propiedades.reduce((acc, p) => acc + (p.count || 0), 0);
  }, [propiedades]);

  const mesActualNombre =
    MESES.find((m) => m.value === mes.toString())?.label || `Mes ${mes}`;

  // Opciones para FilterDropdown de Inmuebles
  const opcionesPropiedadFiltro = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODAS",
        label: "Todos los inmuebles",
        icon: Building2,
        count: conteoTotalPropiedades,
        isGlobal: true,
      },
      ...propiedades.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        icon: p.tipo ? tipoPropiedadBadgeConfig(p.tipo as TipoPropiedad).icon : Building2,
        count: p.count,
      })),
    ];
  }, [propiedades, conteoTotalPropiedades]);

  // Opciones para FilterDropdown de Mes
  const opcionesMesFiltro = useMemo((): FilterDropdownOption[] => {
    return MESES.map((m) => ({
      value: m.value,
      label: m.label,
      icon: Calendar,
    }));
  }, []);

  // Opciones para FilterDropdown de Año (2026 a 2030)
  const opcionesAnoFiltro = useMemo((): FilterDropdownOption[] => {
    const anos = [2026, 2027, 2028, 2029, 2030];
    return anos.map((y) => ({
      value: y.toString(),
      label: y.toString(),
      icon: Calendar,
    }));
  }, []);

  // Opciones para FilterDropdown de Moneda (Todas, Bolívares Bs, Dólares $)
  const opcionesMonedaFiltro = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODAS",
        label: "Todas las monedas",
        icon: Scale,
        iconClassName: "text-slate-500",
        isGlobal: true,
      },
      {
        value: "VES",
        label: "Bolívares (Bs)",
        icon: Coins,
        iconClassName: "text-emerald-600",
      },
      {
        value: "USD",
        label: "Dólares ($)",
        icon: DollarSign,
        iconClassName: "text-blue-600",
      },
    ];
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header Institucional */}
      <PageHeader
        title="Finanzas y Balance General"
        icon={<Scale className="w-6 h-6 text-white" />}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setIsCierreModalOpen(true)}
              className="w-full sm:w-auto h-11 px-4 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cierre de Mes</span>
            </button>
            <button
              onClick={() => {
                setTransaccionAEditar(null);
                setIsFormModalOpen(true);
              }}
              className="w-full sm:w-auto h-11 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] hover:brightness-105 text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Registrar Movimiento</span>
            </button>
          </div>
        }
      />

      {/* 1. Barra de Control Unificada: Mes + Año + Inmueble + Tasa BCV Oficial */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Controles de Filtros Unificados */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          <FilterDropdown
            value={mes.toString()}
            onChange={handleCambioMes}
            options={opcionesMesFiltro}
            className="w-full sm:w-40 md:w-44"
            menuWidth="w-44"
            align="left"
            disabled={isPending}
            ariaLabel="Seleccionar mes"
          />

          <FilterDropdown
            value={ano.toString()}
            onChange={handleCambioAno}
            options={opcionesAnoFiltro}
            className="w-full sm:w-32 md:w-36"
            menuWidth="w-36"
            align="left"
            disabled={isPending}
            ariaLabel="Seleccionar año"
          />

          <FilterDropdown
            value={propiedadId}
            onChange={handleCambioPropiedad}
            options={opcionesPropiedadFiltro}
            className="w-full sm:w-60 md:w-64"
            menuWidth="w-68"
            align="left"
            disabled={isPending}
            ariaLabel="Filtrar por inmueble"
          />

          <FilterDropdown
            value={filtroMoneda}
            onChange={(val) => setFiltroMoneda(val as "TODAS" | "VES" | "USD")}
            options={opcionesMonedaFiltro}
            className="w-full sm:w-52 md:w-56"
            menuWidth="w-56 sm:w-60"
            align="left"
            disabled={isPending}
            ariaLabel="Filtrar por moneda"
          />

          {isPending && (
            <div className="flex items-center justify-center p-1 shrink-0">
              <RotateCw className="w-4 h-4 text-[#175E38] animate-spin" />
            </div>
          )}
        </div>

        {/* Insignia Oficial de Tasa BCV del Día */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t border-slate-100 md:border-t-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl text-xs font-semibold text-emerald-950 shadow-2xs">
            <Coins className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
            <span className="text-slate-500 font-medium text-[11px]">BCV Oficial:</span>
            <span className="font-mono font-bold text-[#175E38]">
              {tasaBcvHoy
                ? `${tasaBcvHoy.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$`
                : "Consultando..."}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 4 StatCards Ejecutivas de Alto Impacto (2x2 en Móvil, 4 en Desktop) adaptadas al filtro */}
      {(() => {
        const esSoloBs = filtroMoneda === "VES";
        const esSoloUsd = filtroMoneda === "USD";

        const valorIngresosStat = esSoloBs
          ? `Bs. ${estadisticas.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : esSoloUsd
          ? formatearMontoUSD(estadisticas.totalIngresosUsd)
          : formatearMontoUSD(estadisticas.totalIngresos);

        const subIngresosStat = esSoloBs
          ? `Equiv: $${(estadisticas.totalIngresosVesEquivUsd || (tasaBcvHoy ? estadisticas.totalIngresosVes / tasaBcvHoy : 0)).toFixed(2)} USD al BCV`
          : esSoloUsd
          ? `${estadisticas.conteoCobranzas} cobros de alquiler en divisas`
          : (estadisticas.totalIngresosVes > 0
              ? `$ ${estadisticas.totalIngresosUsd} divisas • Bs. ${estadisticas.totalIngresosVes.toLocaleString("es-VE", { maximumFractionDigits: 0 })} en Bs`
              : `${estadisticas.conteoCobranzas} cobros alquiler • ${estadisticas.conteoIngresosExtra} extra`);

        const valorEgresosStat = esSoloBs
          ? `Bs. ${estadisticas.totalEgresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : esSoloUsd
          ? formatearMontoUSD(estadisticas.totalEgresosUsd)
          : formatearMontoUSD(estadisticas.totalEgresos);

        const subEgresosStat = esSoloBs
          ? `Equiv: $${(estadisticas.totalEgresosVesEquivUsd || (tasaBcvHoy ? estadisticas.totalEgresosVes / tasaBcvHoy : 0)).toFixed(2)} USD al BCV`
          : esSoloUsd
          ? `Gastos directos en divisas`
          : (estadisticas.totalEgresosVes > 0
              ? `$ ${estadisticas.totalEgresosUsd} divisas • Bs. ${estadisticas.totalEgresosVes.toLocaleString("es-VE", { maximumFractionDigits: 0 })} en Bs`
              : `${estadisticas.conteoEgresos} egresos registrados en el mes`);

        const balanceNetoCalculado = esSoloBs
          ? estadisticas.totalIngresosVes - estadisticas.totalEgresosVes
          : esSoloUsd
          ? estadisticas.totalIngresosUsd - estadisticas.totalEgresosUsd
          : estadisticas.balanceNeto;

        const valorBalanceStat = esSoloBs
          ? `Bs. ${balanceNetoCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : esSoloUsd
          ? formatearMontoUSD(balanceNetoCalculado)
          : formatearMontoUSD(balanceNetoCalculado);

        const subBalanceStat = esSoloBs
          ? "Balance neto operativo en Bolívares"
          : esSoloUsd
          ? "Balance neto operativo en Dólares"
          : (estadisticas.balanceNeto >= 0 ? "Balance operativo del periodo" : "Déficit financiero en el periodo");

        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* StatCard 1: Ingresos Totales */}
            <StatCard
              title="Ingresos Totales"
              value={valorIngresosStat}
              subtitle={subIngresosStat}
              icon={TrendingUp}
              color="emerald"
            />

            {/* StatCard 2: Egresos Operativos */}
            <StatCard
              title="Gastos Operativos"
              value={valorEgresosStat}
              subtitle={subEgresosStat}
              icon={TrendingDown}
              color="rose"
            />

            {/* StatCard 3: Balance Neto */}
            <StatCard
              title="Balance Neto (Utilidad)"
              value={valorBalanceStat}
              subtitle={subBalanceStat}
              icon={Scale}
              color={balanceNetoCalculado >= 0 ? "navy" : "rose"}
            />

            {/* StatCard 4: Margen Operativo */}
            <StatCard
              title="Margen Operativo"
              value={`${estadisticas.margenOperativo}%`}
              subtitle="Rentabilidad neta sobre ingresos"
              icon={PieChart}
              color="indigo"
              progressPercent={Math.max(0, Math.min(100, estadisticas.margenOperativo))}
            />
          </div>
        );
      })()}

      {/* 3. Sección de Gráficas de Flujo Diario (Colapsable) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-slate-500 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 font-heading">
              Evolución Diaria de Flujo ({mesActualNombre} {ano})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setMostrarGraficos(!mostrarGraficos)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span>{mostrarGraficos ? "Ocultar gráficas" : "Mostrar gráficas"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mostrarGraficos ? "rotate-180" : ""}`} />
          </button>
        </div>

        {mostrarGraficos && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-fadeIn">
            <GraficaIngresosMes
              totalIngresos={estadisticas.totalIngresos}
              totalAlquiler={estadisticas.totalIngresosAlquiler}
              totalExtra={estadisticas.totalIngresosExtra}
              conteoCobranzas={estadisticas.conteoCobranzas}
              conteoExtra={estadisticas.conteoIngresosExtra}
              mes={mes}
              ano={ano}
              diasDelMes={estadisticas.diasDelMes || []}
              diasEnMes={estadisticas.diasEnMes || 31}
            />

            <GraficaEgresosMes
              totalEgresos={estadisticas.totalEgresos}
              conteoEgresos={estadisticas.conteoEgresos}
              desgloseCategorias={estadisticas.desgloseEgresosPorCategoria || []}
              mes={mes}
              ano={ano}
              diasDelMes={estadisticas.diasDelMes || []}
              diasEnMes={estadisticas.diasEnMes || 31}
            />
          </div>
        )}
      </div>

      {/* 4. Libro Diario Desplegable de Movimientos */}
      <MovimientosDesplegable
        mes={mes}
        ano={ano}
        propiedadId={propiedadId}
        refreshKey={refreshKey}
        filtroMoneda={filtroMoneda}
        onCambioFiltroMoneda={setFiltroMoneda}
        totalIngresosResumen={estadisticas.totalIngresos}
        totalEgresosResumen={estadisticas.totalEgresos}
        conteoCobranzasResumen={estadisticas.conteoCobranzas}
        conteoEgresosResumen={estadisticas.conteoEgresos}
        onRegistrarMovimiento={() => {
          setTransaccionAEditar(null);
          setIsFormModalOpen(true);
        }}
        onEditarTransaccion={(t) => {
          setTransaccionAEditar(t);
          setIsFormModalOpen(true);
        }}
        onEliminarTransaccion={(t) => setTransaccionAEliminar(t)}
        onVerComprobante={(url, titulo) => {
          setViewerUrl(url);
          setViewerTitle(titulo);
        }}
      />

      {/* Modales */}
      {/* 1. Modal de Formulario (Crear / Editar) */}
      <TransaccionFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setTransaccionAEditar(null);
        }}
        transaccionAEditar={transaccionAEditar}
        propiedades={propiedades}
        onSubmit={handleGuardarTransaccion}
        isLoading={isSubmitting}
      />

      {/* 2. Modal de Confirmación de Borrado */}
      <ConfirmActionModal
        isOpen={!!transaccionAEliminar}
        onClose={() => setTransaccionAEliminar(null)}
        onConfirm={handleConfirmarEliminar}
        title="Eliminar Movimiento Financiero"
        description={`¿Estás seguro de que deseas eliminar permanentemente el registro "${transaccionAEliminar?.concepto}" por monto de ${formatearMontoUSD(transaccionAEliminar?.monto || 0)}? Si posee una factura adjunta, será liberada de UploadThing.`}
        confirmButtonText="Sí, Eliminar"
        cancelButtonText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* 3. Modal de Cierre de Mes Contable */}
      <CierreMesModal
        isOpen={isCierreModalOpen}
        onClose={() => setIsCierreModalOpen(false)}
        mes={mes}
        ano={ano}
      />

      {/* 4. Visor de Imagen / Comprobante con Zoom */}
      <ImageViewerModal
        isOpen={!!viewerUrl}
        onClose={() => {
          setViewerUrl(null);
          setViewerTitle("");
        }}
        images={viewerUrl ? [viewerUrl] : []}
        title={viewerTitle}
        subtitle="Comprobante de pago verificado • Inmobiliaria Conté"
      />
    </div>
  );
}
