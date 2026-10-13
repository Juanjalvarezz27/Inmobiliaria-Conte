"use client";

import React, { useState, useTransition, useMemo } from "react";
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

      {/* 1. Barra de Control de Periodo (Desplegables Globales de Mes y Año + Métricas Ejecutivas) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Desplegables Globales de Mes y Año (Patrón FilterDropdown) */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <FilterDropdown
            value={mes.toString()}
            onChange={handleCambioMes}
            options={opcionesMesFiltro}
            className="w-full sm:w-44 md:w-48"
            menuWidth="w-48"
            align="left"
            disabled={isPending}
            ariaLabel="Seleccionar mes"
          />

          <FilterDropdown
            value={ano.toString()}
            onChange={handleCambioAno}
            options={opcionesAnoFiltro}
            className="w-full sm:w-36 md:w-40"
            menuWidth="w-40"
            align="left"
            disabled={isPending}
            ariaLabel="Seleccionar año"
          />

          {isPending && (
            <div className="flex items-center justify-center p-1 shrink-0">
              <RotateCw className="w-4 h-4 text-[#175E38] animate-spin" />
            </div>
          )}
        </div>

        {/* Resumen ejecutivo de cifras del periodo */}
        <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:items-center md:gap-2.5 pt-2.5 md:pt-0 border-t border-slate-100 md:border-t-0">
          {/* 1. Alquileres */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-2 sm:px-3 sm:py-2 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 shadow-2xs text-center md:text-left min-w-0">
            {/* Versión móvil: Icono y label en fila superior centrada */}
            <div className="flex items-center gap-1 md:hidden">
              <Building2 className="w-3 h-3 text-[#175E38] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 leading-none">
                Alquiler
              </span>
            </div>
            {/* Versión desktop: Icono en caja lateral */}
            <div className="hidden md:flex w-6 h-6 rounded-lg bg-emerald-100/90 text-[#175E38] items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 w-full md:w-auto">
              <span className="hidden md:block text-[9px] font-bold uppercase tracking-wider text-emerald-800 leading-none">
                Alquiler
              </span>
              <span className="text-xs sm:text-sm font-black font-heading text-[#175E38] leading-tight block mt-0.5 truncate">
                {formatearMontoUSD(estadisticas.totalIngresosAlquiler)}
              </span>
            </div>
          </div>

          {/* 2. Extra */}
          <div className="bg-teal-50/70 border border-teal-200/90 rounded-xl p-2 sm:px-3 sm:py-2 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 shadow-2xs text-center md:text-left min-w-0">
            {/* Versión móvil */}
            <div className="flex items-center gap-1 md:hidden">
              <Sparkles className="w-3 h-3 text-teal-700 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 leading-none">
                Extra
              </span>
            </div>
            {/* Versión desktop */}
            <div className="hidden md:flex w-6 h-6 rounded-lg bg-teal-100/90 text-teal-700 items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 w-full md:w-auto">
              <span className="hidden md:block text-[9px] font-bold uppercase tracking-wider text-teal-800 leading-none">
                Extra
              </span>
              <span className="text-xs sm:text-sm font-black font-heading text-teal-900 leading-tight block mt-0.5 truncate">
                {formatearMontoUSD(estadisticas.totalIngresosExtra)}
              </span>
            </div>
          </div>

          {/* 3. Gastos */}
          <div className="bg-rose-50/70 border border-rose-200/90 rounded-xl p-2 sm:px-3 sm:py-2 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 shadow-2xs text-center md:text-left min-w-0">
            {/* Versión móvil */}
            <div className="flex items-center gap-1 md:hidden">
              <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 leading-none">
                Gastos
              </span>
            </div>
            {/* Versión desktop */}
            <div className="hidden md:flex w-6 h-6 rounded-lg bg-rose-100/90 text-rose-600 items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 w-full md:w-auto">
              <span className="hidden md:block text-[9px] font-bold uppercase tracking-wider text-rose-800 leading-none">
                Gastos
              </span>
              <span className="text-xs sm:text-sm font-black font-heading text-rose-600 leading-tight block mt-0.5 truncate">
                {formatearMontoUSD(estadisticas.totalEgresos)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 StatCards Ejecutivas de Alto Impacto (2x2 en Móvil, 4 en Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* StatCard 1: Ingresos Totales */}
        <StatCard
          title="Ingresos Totales"
          value={formatearMontoUSD(estadisticas.totalIngresos)}
          subtitle={`${estadisticas.conteoCobranzas} cobros alquiler • ${estadisticas.conteoIngresosExtra} extra`}
          icon={TrendingUp}
          color="emerald"
        />

        {/* StatCard 2: Egresos Operativos */}
        <StatCard
          title="Gastos Operativos"
          value={formatearMontoUSD(estadisticas.totalEgresos)}
          subtitle={`${estadisticas.conteoEgresos} egresos registrados en el mes`}
          icon={TrendingDown}
          color="rose"
        />

        {/* StatCard 3: Balance Neto */}
        <StatCard
          title="Balance Neto (Utilidad)"
          value={formatearMontoUSD(estadisticas.balanceNeto)}
          subtitle={
            estadisticas.balanceNeto >= 0
              ? "Balance operativo del periodo"
              : "Déficit financiero en el periodo"
          }
          icon={Scale}
          color={estadisticas.balanceNeto >= 0 ? "navy" : "rose"}
        />

        {/* StatCard 4: Margen Operativo */}
        <StatCard
          title="Margen Operativo"
          value={`${estadisticas.margenOperativo}%`}
          subtitle={`Rentabilidad neta sobre ingresos del mes`}
          icon={PieChart}
          color="indigo"
          progressPercent={Math.max(0, Math.min(100, estadisticas.margenOperativo))}
        />
      </div>

      {/* 3. Gráficas Dinámicas de Flujo Diario del Mes (Ingresos y Egresos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

      {/* 4. Filtro de Inmueble y Libro Diario Desplegable (Lazy Loaded) */}
      <div className="space-y-4">
        {/* Barra superior de filtro de inmueble */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-heading">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              Filtrar por Inmueble:
            </span>
            <FilterDropdown
              value={propiedadId}
              onChange={handleCambioPropiedad}
              options={opcionesPropiedadFiltro}
              className="w-full sm:w-60 md:w-64"
              menuWidth="w-68"
              ariaLabel="Filtrar por inmueble"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Período contable: {mesActualNombre} {ano}
          </span>
        </div>

        {/* Acordeón Desplegable con Carga Perezosa (Lazy Loading) y Toggle Ingresos/Egresos */}
        <MovimientosDesplegable
          mes={mes}
          ano={ano}
          propiedadId={propiedadId}
          refreshKey={refreshKey}
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
      </div>

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
