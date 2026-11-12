"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Search,
  ExternalLink,
  Loader2,
  Layers,
  AlertTriangle,
  Receipt,
  Store,
  ChevronDown,
  Lock,
  Zap,
  Droplets,
  ChevronRight,
  Check,
} from "lucide-react";
import { PageHeader, StatCard, Badge, ImageViewerModal } from "@/components/ui";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { formatUSD, formatBS } from "@/lib/formatters";
import { MESES } from "@/lib/date-utils";
import type { PagoItem } from "@/app/admin/cobranza/types";
import type { ResumenFinancieroInquilino } from "@/lib/actions/inquilinoPortal";
import type { TasaBcvResponse } from "@/lib/bcv";
import { ReportarPagoModal } from "./ReportarPagoModal";
import { ServiciosSolvenciaModal } from "@/app/admin/cobranza/ServiciosSolvenciaModal";
import { construirReciboPdf } from "@/app/admin/cobranza/generarReciboPdf";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InquilinoPagosClientProps {
  initialPagos: PagoItem[];
  resumen: ResumenFinancieroInquilino;
  esAdminModoSupervision: boolean;
  inquilinoNombre: string;
  tasaBcvActual?: TasaBcvResponse;
}

export function InquilinoPagosClient({
  initialPagos,
  resumen,
  esAdminModoSupervision,
  inquilinoNombre,
  tasaBcvActual,
}: InquilinoPagosClientProps) {
  const router = useRouter();
  const pagos = initialPagos;
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroAno, setFiltroAno] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Control de Modal Reportar Pago
  const [modalReportarAbierto, setModalReportarAbierto] = useState<boolean>(false);
  const [pagoParaReportar, setPagoParaReportar] = useState<PagoItem | null>(null);
  const [pagoParaServicios, setPagoParaServicios] = useState<PagoItem | null>(null);

  // Visor de Comprobante Bancario
  const [visorCaptureAbierto, setVisorCaptureAbierto] = useState<boolean>(false);
  const [urlCaptureActivo, setUrlCaptureActivo] = useState<string>("");
  const [tituloCapture, setTituloCapture] = useState<string>("");

  // Estado de descarga de PDF
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  // Popover flotante para motivo de descarte de comprobante
  const [motivoActivoId, setMotivoActivoId] = useState<string | null>(null);

  // Cierre automático del popover flotante al hacer clic afuera o pulsar Escape
  useEffect(() => {
    if (!motivoActivoId) return;
    const handleDocumentClick = () => setMotivoActivoId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMotivoActivoId(null);
    };
    window.addEventListener("click", handleDocumentClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [motivoActivoId]);

  // Años disponibles en el historial
  const anosDisponibles = useMemo(() => {
    const setAnos = new Set<number>();
    pagos.forEach((p) => setAnos.add(p.periodoAno));
    return Array.from(setAnos).sort((a, b) => b - a);
  }, [pagos]);

  // Cuotas pendientes o en mora que son elegibles para reportar pago
  // Principio de imputación secuencial (Fase 24):
  // 1. Solo es elegible la cuota impaga más antigua de cada contrato.
  // 2. Prioridad estricta: Deudas vencidas o del mes corriente PRIMERO; adelantos futuros al final.
  const cuotasParaReportar = useMemo(() => {
    const ahora = new Date();
    const mesActual = ahora.getUTCMonth() + 1;
    const anoActual = ahora.getUTCFullYear();

    const impagas = pagos.filter((p) => p.estado !== "PAGADO");
    const elegibles = impagas.filter((pago) => {
      const tieneAnteriorImpaga = impagas.some(
        (otro) =>
          otro.contratoId === pago.contratoId &&
          (otro.periodoAno < pago.periodoAno ||
            (otro.periodoAno === pago.periodoAno && otro.periodoMes < pago.periodoMes))
      );
      return !tieneAnteriorImpaga;
    });

    return elegibles.sort((a, b) => {
      const esFuturoA = a.periodoAno > anoActual || (a.periodoAno === anoActual && a.periodoMes > mesActual);
      const esFuturoB = b.periodoAno > anoActual || (b.periodoAno === anoActual && b.periodoMes > mesActual);

      // Si una es adelanto y la otra es deuda actual/pasada, la deuda actual va primero
      if (esFuturoA !== esFuturoB) return esFuturoA ? 1 : -1;

      // Dentro de la misma categoría, ordenar cronológicamente de la más antigua a la más nueva
      if (a.periodoAno !== b.periodoAno) return a.periodoAno - b.periodoAno;
      return a.periodoMes - b.periodoMes;
    });
  }, [pagos]);

  // Opciones con conteos para el FilterDropdown de Estado
  const opcionesEstado = useMemo((): FilterDropdownOption[] => {
    const conteos = {
      TODOS: pagos.length,
      PAGADO: 0,
      EN_VERIFICACION: 0,
      PENDIENTE: 0,
      VENCIDO: 0,
    };

    pagos.forEach((p) => {
      const enVerificacion = p.estado !== "PAGADO" && Boolean(p.comprobanteUrl);
      if (p.estado === "PAGADO") conteos.PAGADO++;
      else if (enVerificacion) conteos.EN_VERIFICACION++;
      else if (p.estado === "VENCIDO") conteos.VENCIDO++;
      else if (p.estado === "PENDIENTE" || p.estado === "PARCIAL") conteos.PENDIENTE++;
    });

    return [
      {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: conteos.TODOS,
        isGlobal: true,
      },
      {
        value: "PAGADO",
        label: "Solventados",
        subtitle: "Cuotas pagadas",
        icon: CheckCircle2,
        iconClassName: "text-emerald-600",
        count: conteos.PAGADO,
      },
      {
        value: "EN_VERIFICACION",
        label: "En Verificación",
        subtitle: "Comprobante en revisión",
        icon: Clock,
        iconClassName: "text-blue-600",
        count: conteos.EN_VERIFICACION,
      },
      {
        value: "PENDIENTE",
        label: "Pendientes",
        subtitle: "Por solventar",
        icon: Clock,
        iconClassName: "text-amber-600",
        count: conteos.PENDIENTE,
      },
      {
        value: "VENCIDO",
        label: "En Mora",
        subtitle: "Cuotas vencidas",
        icon: AlertTriangle,
        iconClassName: "text-rose-600",
        count: conteos.VENCIDO,
      },
    ];
  }, [pagos]);

  // Opciones para el FilterDropdown de Año
  const opcionesAno = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODOS",
        label: "Todos los años",
        icon: Calendar,
        count: pagos.length,
        isGlobal: true,
      },
      ...anosDisponibles.map((ano) => ({
        value: String(ano),
        label: `Año ${ano}`,
        icon: Calendar,
        count: pagos.filter((p) => p.periodoAno === ano).length,
      })),
    ];
  }, [anosDisponibles, pagos]);

  // Filtrado reactivo de cuotas
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      // Estado derivado: si tiene comprobante y no está PAGADO => EN_VERIFICACION
      const enVerificacion = p.estado !== "PAGADO" && Boolean(p.comprobanteUrl);

      if (filtroEstado === "PAGADO" && p.estado !== "PAGADO") return false;
      if (
        filtroEstado === "PENDIENTE" &&
        ((p.estado !== "PENDIENTE" && p.estado !== "PARCIAL") || enVerificacion)
      )
        return false;
      if (filtroEstado === "VENCIDO" && (p.estado !== "VENCIDO" || enVerificacion)) return false;
      if (filtroEstado === "EN_VERIFICACION" && !enVerificacion) return false;

      if (filtroAno !== "TODOS" && p.periodoAno !== Number(filtroAno)) return false;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const mesNombre = (MESES[p.periodoMes - 1] || "").toLowerCase();
        const local = (p.contrato?.unidad?.codigo || "").toLowerCase();
        const prop = (p.contrato?.unidad?.propiedad?.nombre || "").toLowerCase();
        const ref = (p.referencia || "").toLowerCase();

        return (
          mesNombre.includes(q) ||
          local.includes(q) ||
          prop.includes(q) ||
          ref.includes(q) ||
          String(p.periodoAno).includes(q)
        );
      }

      return true;
    });
  }, [pagos, filtroEstado, filtroAno, busqueda]);

  // Agrupación jerárquica de cuotas por Local / Contrato arrendado
  const gruposPorLocal = useMemo(() => {
    interface GrupoLocal {
      contratoId: string;
      codigoContrato: string;
      unidadCodigo: string;
      unidadTipo?: string;
      propiedadNombre: string;
      propiedadCiudad?: string;
      canon: number;
      pagos: PagoItem[];
      totalPendienteUSD: number;
      tieneMora: boolean;
      tieneVerificacion: boolean;
    }

    const mapa = new Map<string, GrupoLocal>();

    pagosFiltrados.forEach((pago) => {
      const cId = pago.contratoId || "general";
      if (!mapa.has(cId)) {
        const unidad = pago.contrato?.unidad;
        mapa.set(cId, {
          contratoId: cId,
          codigoContrato: pago.contrato?.codigo || "Contrato",
          unidadCodigo: unidad?.codigo || "Espacio Arrendado",
          unidadTipo: unidad?.tipo,
          propiedadNombre: unidad?.propiedad?.nombre || "Inmueble",
          propiedadCiudad: unidad?.propiedad?.ciudad,
          canon: pago.montoEsperado || pago.contrato?.montoAlquiler || 0,
          pagos: [],
          totalPendienteUSD: 0,
          tieneMora: false,
          tieneVerificacion: false,
        });
      }
      const grupo = mapa.get(cId)!;
      grupo.pagos.push(pago);
      const pendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);
      grupo.totalPendienteUSD += pendiente;
      if (pago.estado === "VENCIDO") grupo.tieneMora = true;
      if (pago.estado !== "PAGADO" && Boolean(pago.comprobanteUrl)) grupo.tieneVerificacion = true;
    });

    const lista = Array.from(mapa.values());
    // Prioridad: locales con saldo pendiente de cobro primero, luego orden por código de unidad
    return lista.sort((a, b) => {
      if (a.totalPendienteUSD > 0 && b.totalPendienteUSD <= 0) return -1;
      if (a.totalPendienteUSD <= 0 && b.totalPendienteUSD > 0) return 1;
      return a.unidadCodigo.localeCompare(b.unidadCodigo);
    });
  }, [pagosFiltrados]);

  // Estado de apertura de acordeones por local (todos cerrados por defecto)
  const [localesAbiertos, setLocalesAbiertos] = useState<Record<string, boolean>>({});

  const isLocalAbierto = (contratoId: string) => {
    return Boolean(localesAbiertos[contratoId]);
  };

  const handleToggleLocal = (contratoId: string) => {
    setLocalesAbiertos((prev) => ({
      ...prev,
      [contratoId]: !prev[contratoId],
    }));
  };

  const toggleTodosLocales = (abrir: boolean) => {
    const nuevo: Record<string, boolean> = {};
    gruposPorLocal.forEach((g) => {
      nuevo[g.contratoId] = abrir;
    });
    setLocalesAbiertos(nuevo);
  };

  // Función para descargar la Nota de Entrega / Recibo PDF oficial
  const handleDescargarRecibo = async (pago: PagoItem) => {
    setDescargandoId(pago.id);
    try {
      const blob = await construirReciboPdf(pago);
      const url = URL.createObjectURL(blob);
      const mesNombre = MESES[pago.periodoMes - 1] || `Mes-${pago.periodoMes}`;
      const localCodigo = pago.contrato?.unidad?.codigo?.replace(/\s+/g, "_") || "Local";
      const nombreArchivo = `Recibo_${mesNombre}_${pago.periodoAno}_${localCodigo}.pdf`;

      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);

      toast.success("Recibo PDF descargado exitosamente.");
    } catch (err) {
      console.error("Error al generar PDF:", err);
      toast.error("No se pudo generar el comprobante PDF.");
    } finally {
      setDescargandoId(null);
    }
  };

  const abrirReporteParaCuota = (cuota: PagoItem) => {
    setPagoParaReportar(cuota);
    setModalReportarAbierto(true);
  };

  const abrirVisorCapture = (url: string, titulo: string) => {
    setUrlCaptureActivo(url);
    setTituloCapture(titulo);
    setVisorCaptureAbierto(true);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Modo Supervisión para el Administrador */}
      {esAdminModoSupervision && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Modo Supervisión:</strong> Estás explorando el Centro de Pagos como administrador
              auditando al inquilino <strong>{inquilinoNombre}</strong>.
            </span>
          </div>
          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-md">
            Solo Lectura / Auditoría
          </span>
        </div>
      )}

      {/* Encabezado Principal */}
      <PageHeader
        title="Mis Pagos y Recibos Digitales"
        description="Consulta el estado de tus mensualidades, reporta transferencias y descarga recibos contables."
        icon={<Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
        actions={
          cuotasParaReportar.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPagoParaReportar(null);
                setModalReportarAbierto(true);
              }}
              className="w-full sm:w-auto h-11 px-4 sm:px-5 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Reportar Pago</span>
            </button>
          )
        }
      />

      {/* Banner Oficial de Tasa BCV del Día */}
      {tasaBcvActual && tasaBcvActual.tasa > 0 && (
        <div className="bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#124b2d] text-white rounded-2xl p-4 sm:p-5 border border-white/10 border-b-[3px] border-b-[#0e3a23] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-emerald-400 shadow-2xs backdrop-blur-xs">
              <Building2 className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Tasa Oficial BCV del Día
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                  {tasaBcvActual.esFallback ? "Tasa de Referencia" : "Banco Central de Venezuela"}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Cálculo oficial y referencial para reportes de pago vía Pago Móvil o Transferencia Bancaria en Bolívares.
              </p>
            </div>
          </div>

          <div className="relative z-10 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 sm:text-right shrink-0 backdrop-blur-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
              1 USD =
            </span>
            <span className="text-lg sm:text-xl font-black font-heading text-white">
              Bs. {tasaBcvActual.tasa.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas Ejecutivas (StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Compromiso Mensual"
          value={formatUSD(resumen.montoMensualidadTotal || resumen.montoCanonTotal)}
          subtitle={
            tasaBcvActual?.tasa && (resumen.montoMensualidadTotal || resumen.montoCanonTotal)
              ? `Equivalente: ${formatBS((resumen.montoMensualidadTotal || resumen.montoCanonTotal) * tasaBcvActual.tasa)}`
              : "Mensualidad regular pactada"
          }
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Estado de Cuenta"
          value={
            resumen.semaforoEstado === "AL_DIA"
              ? "Al día"
              : resumen.semaforoEstado === "EN_MORA"
              ? "En mora"
              : "Por pagar"
          }
          subtitle={
            resumen.semaforoEstado === "AL_DIA"
              ? "Sin compromisos vencidos"
              : resumen.semaforoEstado === "EN_MORA"
              ? `${resumen.cuotasVencidasCount} mensualidad(es) adeudada(s)`
              : resumen.diasParaVencer !== null
              ? `Vence en ${resumen.diasParaVencer} día(s)`
              : "Pendiente por liquidar"
          }
          icon={
            resumen.semaforoEstado === "AL_DIA"
              ? CheckCircle2
              : resumen.semaforoEstado === "EN_MORA"
              ? AlertCircle
              : Clock
          }
          color={
            resumen.semaforoEstado === "AL_DIA"
              ? "emerald"
              : resumen.semaforoEstado === "EN_MORA"
              ? "rose"
              : "amber"
          }
        />

        <StatCard
          title="Próximo Vencimiento"
          value={
            resumen.proximoDiaCorte ? `Día ${resumen.proximoDiaCorte}` : "No aplica"
          }
          subtitle={
            resumen.periodoProximoVencimiento
              ? `Corte de ${resumen.periodoProximoVencimiento}`
              : "Sin cuotas próximas"
          }
          icon={Calendar}
          color="navy"
        />

        <StatCard
          title="Espacios en Posesión"
          value={`${resumen.totalLocalesActivos} ${resumen.totalLocalesActivos === 1 ? "unidad" : "unidades"}`}
          subtitle={resumen.detalleEspacioPrincipal || "Locales arrendados"}
          icon={Building2}
          color="navy"
        />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Búsqueda en vivo */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por mes, local, inmueble o referencia..."
              className="w-full h-11 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-colors"
            />
          </div>

          {/* Selectores de Filtro con Patrón Híbrido Institucional */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Filtro por Año */}
            {anosDisponibles.length > 1 && (
              <FilterDropdown
                value={filtroAno}
                onChange={setFiltroAno}
                options={opcionesAno}
                ariaLabel="Filtrar por año"
                className="w-full sm:w-44"
                menuWidth="w-52"
                align="right"
              />
            )}

            {/* Filtro por Estado */}
            <FilterDropdown
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={opcionesEstado}
              ariaLabel="Filtrar por estado"
              className="w-full sm:w-64 md:w-68"
              menuWidth="w-68"
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Listado de Locales y Mensualidades Agrupadas */}
      {pagosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
          <h4 className="text-base font-bold text-slate-800">No se encontraron mensualidades</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {busqueda || filtroEstado !== "TODOS" || filtroAno !== "TODOS"
              ? "Prueba cambiando los filtros o el término de búsqueda ingresado."
              : "Aún no se han generado cuotas para tus contratos activos."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de control y conteo */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <span>
              Mostrando <strong>{gruposPorLocal.length}</strong> {gruposPorLocal.length === 1 ? "local arrendado" : "locales arrendados"} · <strong>{pagosFiltrados.length}</strong> mensualidades
            </span>
            {gruposPorLocal.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleTodosLocales(true)}
                  className="text-[11px] font-bold text-[#175E38] hover:underline cursor-pointer"
                >
                  Expandir todos
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => toggleTodosLocales(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Colapsar todos
                </button>
              </div>
            )}
          </div>

          {/* Acordeones Desplegables por Local / Contrato */}
          {gruposPorLocal.map((grupo) => {
            const estaAbierto = isLocalAbierto(grupo.contratoId);

            return (
              <div
                key={grupo.contratoId}
                className="bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-2xs overflow-hidden transition-all duration-200"
              >
                {/* Cabecera del Acordeón con Efecto Sol y Acciones */}
                <div
                  onClick={() => handleToggleLocal(grupo.contratoId)}
                  className="relative p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors group select-none"
                >
                  {/* Efecto Sol ambiental en esquina superior izquierda */}
                  <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent rounded-full blur-xl pointer-events-none -translate-x-12 -translate-y-12 transition-transform duration-500 group-hover:scale-125" />

                  {/* Lado Izquierdo: Icono + Título + Badges */}
                  <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xs flex items-center justify-center text-[#175E38] shrink-0 group-hover:scale-105 transition-transform">
                      <Store className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 font-heading tracking-tight text-base sm:text-lg truncate">
                          {grupo.unidadCodigo}
                        </h3>
                        <span className="text-xs font-bold text-slate-400">·</span>
                        <span className="text-xs font-bold text-slate-600 truncate">
                          {grupo.propiedadNombre}
                        </span>
                      </div>

                      {/* Metadatos y Badges del Local */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {/* Canon mensual */}
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <span>Canon:</span>
                          <strong className="text-slate-800 font-bold">{formatUSD(grupo.canon)}</strong>
                          {tasaBcvActual?.tasa && (
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({formatBS(grupo.canon * tasaBcvActual.tasa)})
                            </span>
                          )}
                        </span>

                        <span className="text-slate-300">|</span>

                        {/* Estado de solvencia del Local */}
                        {grupo.totalPendienteUSD > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Por Pagar: {formatUSD(grupo.totalPendienteUSD)}</span>
                            {tasaBcvActual?.tasa && (
                              <span className="text-[10px] opacity-85">
                                ({formatBS(grupo.totalPendienteUSD * tasaBcvActual.tasa)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Al Día / Solvente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado Derecho: Botón Acción Rápida + Desplegable Chevron */}
                  <div className="flex items-center gap-2 self-end md:self-center relative z-10 shrink-0">
                    {grupo.totalPendienteUSD > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Imputación secuencial: seleccionar siempre la cuota impaga más antigua del local
                          const cuotaPendiente = [...grupo.pagos]
                            .filter((p) => p.estado !== "PAGADO")
                            .sort((a, b) =>
                              a.periodoAno !== b.periodoAno
                                ? a.periodoAno - b.periodoAno
                                : a.periodoMes - b.periodoMes
                            )[0];
                          if (cuotaPendiente) abrirReporteParaCuota(cuotaPendiente);
                        }}
                        className="h-9 px-3.5 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Reportar Pago</span>
                      </button>
                    )}

                    {/* Botón Desplegable con Chevron giratorio */}
                    <div className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all">
                      <span className="hidden sm:inline">{estaAbierto ? "Ocultar" : "Ver mensualidades"}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
                          estaAbierto ? "rotate-180 text-[#175E38]" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Contenido Interior con Transición CSS Grid 60 FPS */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    estaAbierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-4 sm:p-5 pt-2 border-t border-slate-100 bg-slate-50/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grupo.pagos.map((pago) => {
                          const mesNombre = MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
                          const localStr = grupo.unidadCodigo;
                          const propStr = grupo.propiedadNombre;
                          const saldoPendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);

                          // Estado Derivado
                          const esEnVerificacion = pago.estado !== "PAGADO" && Boolean(pago.comprobanteUrl);
                          const esPagado = pago.estado === "PAGADO";
                          const esParcial =
                            (pago.estado === "PARCIAL" ||
                              (pago.montoPagado > 0 && pago.montoPagado < pago.montoEsperado)) &&
                            !esEnVerificacion;
                          const esVencido = pago.estado === "VENCIDO" && !esEnVerificacion;
                          const esPendiente = pago.estado === "PENDIENTE" && !esEnVerificacion && !esParcial;

                          // Detección de comprobante previamente descartado por la administración
                          const matchRechazo = pago.notas?.match(/Comprobante descartado por administración:\s*([^.\n]+)/i);
                          const motivoRechazo = matchRechazo ? matchRechazo[1].trim() : null;

                          // Imputación Secuencial (Fase 24): Verificar si hay mensualidades anteriores impagas para este contrato
                          const cuotaAnteriorImpaga = grupo.pagos.find(
                            (p) =>
                              (p.periodoAno < pago.periodoAno ||
                                (p.periodoAno === pago.periodoAno && p.periodoMes < pago.periodoMes)) &&
                              p.estado !== "PAGADO"
                          );
                          const tieneAnteriorImpaga = Boolean(cuotaAnteriorImpaga);

                          return (
                            <div
                              key={pago.id}
                              className={`bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative group ${
                                motivoActivoId === pago.id ? "z-30" : "z-0"
                              }`}
                            >
                              {/* Resplandor ambiental de esquina contenido */}
                              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                <div
                                  className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-125 ${
                                    esPagado
                                      ? "bg-emerald-500/10"
                                      : esVencido
                                      ? "bg-rose-500/10"
                                      : esEnVerificacion || esParcial
                                      ? "bg-blue-500/10"
                                      : "bg-amber-500/10"
                                  }`}
                                />
                              </div>

                              <div className="space-y-3 relative z-10">
                                {/* Fila superior: Mes y Badge de Estado */}
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-base sm:text-lg font-black font-heading text-slate-900 tracking-tight leading-tight">
                                    {mesNombre} {pago.periodoAno}
                                  </h3>

                                  <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                                    {/* Badge flotante interactivo de Comprobante Descartado */}
                                    {!esPagado && !esEnVerificacion && motivoRechazo && (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMotivoActivoId(motivoActivoId === pago.id ? null : pago.id);
                                          }}
                                          className="h-6 px-2 rounded-full text-[10px] font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                          title="Comprobante observado. Haz clic para ver detalles."
                                        >
                                          <AlertCircle className="w-3 h-3 text-[#CC1A22] shrink-0" />
                                          <span>Observado</span>
                                        </button>

                                        {/* Popover flotante con motivo de descarte */}
                                        {motivoActivoId === pago.id && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-rose-200 shadow-2xl p-3.5 z-50 text-left animate-in fade-in-0 zoom-in-95"
                                          >
                                            <div className="flex items-center justify-between pb-2 border-b border-rose-100 mb-2">
                                              <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                                                <AlertCircle className="w-3.5 h-3.5 text-[#CC1A22]" /> Comprobante Observado
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setMotivoActivoId(null)}
                                                className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <p className="text-[11px] text-slate-700 leading-snug">
                                              <span className="font-bold text-rose-900 block mb-0.5">Motivo del descarte:</span>
                                              {motivoRechazo}
                                            </p>
                                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                              <span className="text-[10px] text-slate-400">Puedes reportar uno nuevo</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setMotivoActivoId(null);
                                                  abrirReporteParaCuota(pago);
                                                }}
                                                className="text-[10px] font-bold text-[#175E38] hover:underline cursor-pointer shrink-0"
                                              >
                                                Corregir ahora →
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Badge de Estado del Alquiler */}
                                    {esPagado ? (
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Solvente</span>
                                      </span>
                                    ) : esEnVerificacion ? (
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>En Verificación</span>
                                      </span>
                                    ) : esParcial ? (
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                        <Receipt className="w-3 h-3" />
                                        <span>Abonado Parcial</span>
                                      </span>
                                    ) : esVencido ? (
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>En Mora</span>
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>Por Pagar</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Servicios Públicos (Fase 27: Corpoelec y Agua - Fila independiente arriba de las cajas financieras) */}
                                <button
                                  type="button"
                                  onClick={() => setPagoParaServicios(pago)}
                                  className="w-full grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/70 hover:border-slate-300 transition-all cursor-pointer active:scale-[0.99] text-xs"
                                  title="Consultar o reportar solvencia de luz y agua"
                                >
                                  {/* Badge Luz (Corpoelec) */}
                                  <span
                                    className={`inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold border transition-colors ${
                                      pago.luzSolvente
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
                                        : "bg-amber-50 text-amber-800 border-amber-200/90"
                                    }`}
                                    title={pago.luzSolvente ? "Luz: Solvente / Al día" : "Luz: Pendiente"}
                                  >
                                    <Zap
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        pago.luzSolvente ? "text-emerald-600 fill-emerald-500" : "text-amber-500 fill-amber-400"
                                      }`}
                                    />
                                    <span>Luz</span>
                                    {pago.luzSolvente ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-amber-600 stroke-[2.5] shrink-0" />
                                    )}
                                  </span>

                                  {/* Badge Agua (Azul Hidroandes) */}
                                  <span
                                    className={`inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold border transition-colors ${
                                      pago.aguaSolvente
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
                                        : "bg-blue-50 text-blue-700 border-blue-200/90"
                                    }`}
                                    title={pago.aguaSolvente ? "Agua: Solvente / Al día" : "Agua: Pendiente"}
                                  >
                                    <Droplets
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        pago.aguaSolvente ? "text-emerald-600 fill-emerald-500" : "text-blue-500 fill-blue-400"
                                      }`}
                                    />
                                    <span>Agua</span>
                                    {pago.aguaSolvente ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-blue-600 stroke-[2.5] shrink-0" />
                                    )}
                                  </span>
                                </button>

                                {/* Cajas de Datos Financieros con soporte multimoneda */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  {esPagado ? (
                                    <>
                                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                                          Fecha de Pago
                                        </span>
                                        <span className="text-sm font-extrabold text-slate-900 block truncate">
                                          {pago.fechaPago
                                            ? new Date(pago.fechaPago).toLocaleDateString("es-VE", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                              })
                                            : "Liquidado"}
                                        </span>
                                        <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">
                                          Totalmente solvente
                                        </span>
                                      </div>

                                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 rounded-xl">
                                        <span className="text-[10px] font-bold uppercase tracking-wide block opacity-75">
                                          Monto Liquidado
                                        </span>
                                        <span className="text-sm font-extrabold block">
                                          {formatUSD(pago.montoPagado)}
                                        </span>
                                        {pago.montoBs && pago.tasaBcv ? (
                                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200/70 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                            {formatBS(pago.montoBs)} · Tasa {pago.tasaBcv.toFixed(2)}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-semibold text-emerald-700/80 block mt-0.5">
                                            Liquidado en divisas
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                                          Mensualidad Acordada
                                        </span>
                                        <span className="text-sm font-extrabold text-slate-900 block">
                                          {formatUSD(pago.montoEsperado)}
                                        </span>
                                        {tasaBcvActual?.tasa && (
                                          <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                                            {formatBS(pago.montoEsperado * tasaBcvActual.tasa)}
                                          </span>
                                        )}
                                      </div>

                                      <div
                                        className={`p-2.5 rounded-xl border ${
                                          esVencido
                                            ? "bg-rose-50/60 border-rose-200/80 text-rose-900"
                                            : esParcial
                                            ? "bg-blue-50/60 border-blue-200/80 text-blue-900"
                                            : "bg-amber-50/60 border-amber-200/80 text-amber-900"
                                        }`}
                                      >
                                        <span className="text-[10px] font-bold uppercase tracking-wide block opacity-75">
                                          {esParcial ? `Resta ($${pago.montoPagado.toFixed(2)} abonado)` : "Saldo Pendiente"}
                                        </span>
                                        <span className="text-sm font-extrabold block">
                                          {formatUSD(saldoPendiente)}
                                        </span>
                                        {tasaBcvActual?.tasa && saldoPendiente > 0 && (
                                          <span className="text-[10px] font-black text-amber-900 bg-amber-100/90 border border-amber-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5">
                                            <span>{formatBS(saldoPendiente * tasaBcvActual.tasa)}</span>
                                            <span className="text-[9px] font-medium text-amber-700">(BCV hoy)</span>
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Información adicional / Metadatos simétricos */}
                                <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                                  {esPagado ? (
                                    <div className="flex items-center justify-between">
                                      <span>Referencia:</span>
                                      <strong className="text-slate-700 truncate max-w-[170px]">
                                        {pago.referencia || "Conciliado por administración"}
                                      </strong>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span>{esVencido ? "Venció:" : "Vencimiento:"}</span>
                                      <strong className={esVencido ? "text-rose-700 font-bold" : "text-slate-700"}>
                                        {new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </strong>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Footer de Acciones (Grid 2 columnas simétricas o botón ancho completo) */}
                              <div className="pt-3 border-t border-slate-100">
                                {esPagado ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDescargarRecibo(pago)}
                                    disabled={descargandoId === pago.id}
                                    className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-[#1C2539] hover:bg-[#2a3754] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5 disabled:opacity-50"
                                  >
                                    {descargandoId === pago.id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Generando PDF...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Descargar Recibo PDF</span>
                                      </>
                                    )}
                                  </button>
                                ) : esEnVerificacion ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    {pago.comprobanteUrl && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          abrirVisorCapture(
                                            pago.comprobanteUrl!,
                                            `Comprobante: ${mesNombre} ${pago.periodoAno} (${localStr})`
                                          )
                                        }
                                        className="w-full h-10 px-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span className="truncate">Ver Capture</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => abrirReporteParaCuota(pago)}
                                      className={`h-10 px-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 ${
                                        !pago.comprobanteUrl ? "col-span-2" : ""
                                      }`}
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                      <span className="truncate">Actualizar</span>
                                    </button>
                                  </div>
                                ) : tieneAnteriorImpaga ? (
                                  <div className="w-full relative group/lock">
                                    <button
                                      type="button"
                                      disabled
                                      className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-1.5 opacity-90 transition-all select-none"
                                    >
                                      <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                      <span className="truncate">Mes anterior pendiente</span>
                                    </button>
                                    <div className="hidden group-hover/lock:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 text-white text-[11px] leading-snug rounded-xl shadow-xl text-center z-50 pointer-events-none">
                                      Para mantener la correlatividad contable, debes solventar primero la mensualidad de{" "}
                                      <strong className="text-emerald-400">
                                        {MESES[(cuotaAnteriorImpaga?.periodoMes || 1) - 1]} {cuotaAnteriorImpaga?.periodoAno}
                                      </strong>.
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => abrirReporteParaCuota(pago)}
                                    className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-[#175E38] hover:bg-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.2)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>{esParcial ? "Abonar Resto" : "Reportar Pago"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Reportar Pago */}
      <ReportarPagoModal
        isOpen={modalReportarAbierto}
        onClose={() => {
          setModalReportarAbierto(false);
          setPagoParaReportar(null);
        }}
        pagosPendientes={cuotasParaReportar}
        pagoPreseleccionado={pagoParaReportar}
        tasaBcvActual={tasaBcvActual}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Modal de Control de Servicios Públicos (Fase 27) */}
      <ServiciosSolvenciaModal
        isOpen={Boolean(pagoParaServicios)}
        onClose={() => setPagoParaServicios(null)}
        pago={pagoParaServicios}
        onActualizado={() => {
          setPagoParaServicios(null);
          router.refresh();
        }}
      />

      {/* Visor de Comprobante / Capture */}
      {urlCaptureActivo && (
        <ImageViewerModal
          isOpen={visorCaptureAbierto}
          onClose={() => {
            setVisorCaptureAbierto(false);
            setUrlCaptureActivo("");
          }}
          images={[urlCaptureActivo]}
          initialIndex={0}
          title={tituloCapture}
        />
      )}
    </div>
  );
}
