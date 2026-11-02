"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { PageHeader, StatCard, Badge, ImageViewerModal } from "@/components/ui";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { formatUSD } from "@/lib/formatters";
import { MESES } from "@/lib/date-utils";
import type { PagoItem } from "@/app/admin/cobranza/types";
import type { ResumenFinancieroInquilino } from "@/lib/actions/inquilinoPortal";
import { ReportarPagoModal } from "./ReportarPagoModal";
import { construirReciboPdf } from "@/app/admin/cobranza/generarReciboPdf";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InquilinoPagosClientProps {
  initialPagos: PagoItem[];
  resumen: ResumenFinancieroInquilino;
  esAdminModoSupervision: boolean;
  inquilinoNombre: string;
}

export function InquilinoPagosClient({
  initialPagos,
  resumen,
  esAdminModoSupervision,
  inquilinoNombre,
}: InquilinoPagosClientProps) {
  const router = useRouter();
  const pagos = initialPagos;
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroAno, setFiltroAno] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Control de Modal Reportar Pago
  const [modalReportarAbierto, setModalReportarAbierto] = useState<boolean>(false);
  const [pagoParaReportar, setPagoParaReportar] = useState<PagoItem | null>(null);

  // Visor de Comprobante Bancario
  const [visorCaptureAbierto, setVisorCaptureAbierto] = useState<boolean>(false);
  const [urlCaptureActivo, setUrlCaptureActivo] = useState<string>("");
  const [tituloCapture, setTituloCapture] = useState<string>("");

  // Estado de descarga de PDF
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  // Años disponibles en el historial
  const anosDisponibles = useMemo(() => {
    const setAnos = new Set<number>();
    pagos.forEach((p) => setAnos.add(p.periodoAno));
    return Array.from(setAnos).sort((a, b) => b - a);
  }, [pagos]);

  // Cuotas pendientes o en mora que son elegibles para reportar pago
  const cuotasParaReportar = useMemo(() => {
    return pagos.filter((p) => p.estado !== "PAGADO");
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

      {/* Tarjetas de Métricas Ejecutivas (StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Compromiso Mensual"
          value={formatUSD(resumen.montoMensualidadTotal || resumen.montoCanonTotal)}
          subtitle="Mensualidad regular pactada"
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

      {/* Cuadrícula de Cuotas y Mensualidades */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagosFiltrados.map((pago) => {
            const mesNombre = MESES[pago.periodoMes - 1] || `Mes ${pago.periodoMes}`;
            const localStr = pago.contrato?.unidad?.codigo || "Espacio Arrendado";
            const propStr = pago.contrato?.unidad?.propiedad?.nombre || "Inmueble";
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

            return (
              <div
                key={pago.id}
                className="bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden group"
              >
                {/* Resplandor ambiental de esquina */}
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

                <div className="space-y-3 relative z-10">
                  {/* Fila superior: Período y Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {pago.contrato?.codigo || "Contrato"}
                      </span>
                      <h3 className="text-base sm:text-lg font-black font-heading text-slate-900 tracking-tight leading-tight">
                        {mesNombre} {pago.periodoAno}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">
                        {localStr} · {propStr}
                      </p>
                    </div>

                    <div className="shrink-0">
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

                  {/* Cajas de Datos Financieros */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Mensualidad Acordada
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatUSD(pago.montoEsperado)}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border ${
                        esPagado
                          ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                          : esVencido
                          ? "bg-rose-50/60 border-rose-200/80 text-rose-900"
                          : esParcial
                          ? "bg-blue-50/60 border-blue-200/80 text-blue-900"
                          : "bg-amber-50/60 border-amber-200/80 text-amber-900"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide block opacity-75">
                        {esPagado ? "Monto Liquidado" : esParcial ? `Resta ($${pago.montoPagado.toFixed(2)} abonado)` : "Saldo Pendiente"}
                      </span>
                      <span className="text-sm font-extrabold">
                        {esPagado ? formatUSD(pago.montoPagado) : formatUSD(saldoPendiente)}
                      </span>
                    </div>
                  </div>

                  {/* Información adicional del pago reportado o fecha de corte */}
                  <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span>Vencimiento:</span>
                      <strong className="text-slate-700">
                        {new Date(pago.fechaVencimiento).toLocaleDateString("es-VE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                    </div>

                    {pago.referencia && (
                      <div className="flex items-center justify-between">
                        <span>Referencia:</span>
                        <strong className="text-slate-700 truncate max-w-[150px]">
                          {pago.referencia}
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
        onSuccess={() => {
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
