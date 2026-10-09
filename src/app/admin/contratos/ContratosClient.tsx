"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  User,
  Store,
  Pencil,
  Trash2,
  Archive,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  ChevronDown,
  Check,
  Layers,
  Calendar,
  Building2,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { ContratoFormModal } from "./ContratoFormModal";
import { ContratoDetalleModal } from "./ContratoDetalleModal";
import { FinalizarContratoModal } from "./FinalizarContratoModal";
import {
  createContrato,
  updateContrato,
  deleteContrato,
  updateEstadoContrato,
  getContratoDetalle,
  type CreateContratoInput,
  type UpdateContratoInput,
} from "@/lib/actions/contratos";
import { EstadoContrato, EstadoDeposito, TipoPropiedad } from "@prisma/client";
import { ShieldCheck } from "lucide-react";
import {
  formatCurrency,
  WhatsAppIcon,
  getWhatsAppUrl,
  tipoPropiedadBadgeConfig,
  tipoPropiedadCornerSun,
} from "../propiedades/constants";
import type {
  ContratoConRelaciones,
  ContratosClientProps,
  ModalMode,
} from "./types";

// Sol decorativo en esquina según el estado del contrato
const getContratoCornerSun = (estado: EstadoContrato) => {
  switch (estado) {
    case EstadoContrato.ACTIVO:
      return {
        glow: "bg-emerald-500/20",
        ring: "bg-emerald-500/[0.08] border-emerald-400/25",
        sun: "from-[#175E38]/30 to-emerald-400/5",
      };
    case EstadoContrato.POR_VENCER:
      return {
        glow: "bg-amber-500/20",
        ring: "bg-amber-500/[0.08] border-amber-400/25",
        sun: "from-amber-600/25 to-amber-400/5",
      };
    case EstadoContrato.RESCINDIDO:
      return {
        glow: "bg-rose-500/20",
        ring: "bg-rose-500/[0.08] border-rose-400/25",
        sun: "from-[#CC1A22]/25 to-rose-400/5",
      };
    case EstadoContrato.FINALIZADO:
      return {
        glow: "bg-blue-500/20",
        ring: "bg-blue-500/[0.08] border-blue-400/25",
        sun: "from-blue-600/25 to-blue-400/5",
      };
    default:
      return {
        glow: "bg-slate-500/20",
        ring: "bg-slate-500/[0.08] border-slate-400/25",
        sun: "from-slate-600/25 to-slate-400/5",
      };
  }
};

const PAGE_SIZE = 15;

export function ContratosClient({
  contratos: initialContratos,
  stats: initialStats,
  unidadesDisponibles,
  inquilinos,
  propiedades = [],
  inquilinoIdPreseleccionado,
  unidadIdPreseleccionada,
  abrirCrear = false,
  initialSearch = "",
}: ContratosClientProps) {
  const [contratos, setContratos] = useState(initialContratos);
  const [stats, setStats] = useState(initialStats);
  const [busqueda, setBusqueda] = useState(initialSearch);
  const [filtroEstado, setFiltroEstado] = useState<string>(
    initialSearch ? "TODOS" : EstadoContrato.ACTIVO
  );
  const [filtroPropiedad, setFiltroPropiedad] = useState<string>("TODAS");

  const [propiedadesDesplegadas, setPropiedadesDesplegadas] = useState<Record<string, boolean>>({});
  const [propiedadesCargadas, setPropiedadesCargadas] = useState<Record<string, boolean>>({});
  const [paginasPorPropiedad, setPaginasPorPropiedad] = useState<Record<string, number>>({});

  const [isDropdownEstadoOpen, setIsDropdownEstadoOpen] = useState(false);
  const [isDropdownPropiedadOpen, setIsDropdownPropiedadOpen] = useState(false);
  const dropdownEstadoRef = useRef<HTMLDivElement>(null);
  const dropdownPropiedadRef = useRef<HTMLDivElement>(null);

  const toggleDesplieguePropiedad = (propId: string) => {
    setPropiedadesDesplegadas((prev) => {
      const nuevoEstado = !prev[propId];
      if (nuevoEstado) {
        setPropiedadesCargadas((c) => ({ ...c, [propId]: true }));
        setPaginasPorPropiedad((p) => ({ ...p, [propId]: 1 }));
      }
      return { ...prev, [propId]: nuevoEstado };
    });
  };

  const changePaginaPropiedad = (propId: string, page: number) => {
    setPaginasPorPropiedad((prev) => ({ ...prev, [propId]: page }));
  };

  // Cierre de dropdowns al hacer clic fuera o presionar Escape
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

  // Lista de propiedades para el selector de filtro con conteo de contratos
  const propiedadesParaSelector = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; ciudad: string; tipo: TipoPropiedad; count: number }>();
    for (const p of propiedades) {
      map.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        ciudad: p.ciudad,
        tipo: p.tipo,
        count: 0,
      });
    }
    for (const c of contratos) {
      const prop = c.unidad.propiedad;
      if (!map.has(prop.id)) {
        map.set(prop.id, {
          id: prop.id,
          nombre: prop.nombre,
          ciudad: prop.ciudad,
          tipo: prop.tipo,
          count: 0,
        });
      }
      map.get(prop.id)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [propiedades, contratos]);

  const propiedadActivaFiltro = useMemo(() => {
    if (filtroPropiedad === "TODAS") return null;
    return propiedadesParaSelector.find((p) => p.id === filtroPropiedad) || null;
  }, [filtroPropiedad, propiedadesParaSelector]);

  const propiedadActivaConfig = useMemo(() => {
    if (filtroPropiedad === "TODAS") {
      return {
        value: "TODAS",
        label: "Todos los inmuebles",
        count: contratos.length,
      };
    }
    const prop = propiedadesParaSelector.find((p) => p.id === filtroPropiedad);
    return {
      value: filtroPropiedad,
      label: prop ? prop.nombre : "Inmueble",
      count: prop ? prop.count : 0,
    };
  }, [filtroPropiedad, propiedadesParaSelector, contratos.length]);

  const estadosDisponibles = useMemo(() => {
    return [
      {
        value: EstadoContrato.ACTIVO,
        label: "Activos / Vigentes",
        icon: CheckCircle2,
        count: contratos.filter((c) => c.estado === EstadoContrato.ACTIVO).length,
      },
      {
        value: EstadoContrato.POR_VENCER,
        label: "Por Vencer (30 días)",
        icon: AlertTriangle,
        count: contratos.filter((c) => c.estado === EstadoContrato.POR_VENCER).length,
      },
      {
        value: EstadoContrato.FINALIZADO,
        label: "Finalizados",
        icon: FileCheck,
        count: contratos.filter((c) => c.estado === EstadoContrato.FINALIZADO).length,
      },
      {
        value: EstadoContrato.RESCINDIDO,
        label: "Rescindidos",
        icon: XCircle,
        count: contratos.filter((c) => c.estado === EstadoContrato.RESCINDIDO).length,
      },
    ];
  }, [contratos]);

  const estadoActivoConfig = useMemo(() => {
    if (filtroEstado === "TODOS") {
      return {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: contratos.length,
      };
    }
    return (
      estadosDisponibles.find((o) => o.value === filtroEstado) || {
        value: "TODOS",
        label: "Todos los estados",
        icon: Layers,
        count: contratos.length,
      }
    );
  }, [filtroEstado, estadosDisponibles, contratos.length]);

  // Limpieza de searchParams de la URL tras cerrar o guardar
  const limpiarSearchParams = () => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const [prevParams, setPrevParams] = useState({
    abrirCrear,
    inquilinoIdPreseleccionado,
    unidadIdPreseleccionada,
  });

  const [modalMode, setModalMode] = useState<ModalMode>(
    abrirCrear || inquilinoIdPreseleccionado || unidadIdPreseleccionada ? "crear" : null
  );
  const [contratoSeleccionado, setContratoSeleccionado] = useState<ContratoConRelaciones | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Apertura lazy de ficha con carga de historial de pagos en segundo plano
  const abrirDetalle = async (c: ContratoConRelaciones) => {
    setContratoSeleccionado(c);
    setModalMode("detalle");
    const tienePagosCargados = c.pagos && c.pagos.length > 0;
    if (!tienePagosCargados) {
      setIsLoadingDetalle(true);
    }
    try {
      const res = await getContratoDetalle(c.id);
      if (res.success && res.data) {
        const full = res.data as unknown as ContratoConRelaciones;
        setContratoSeleccionado(full);
        setContratos((prev) =>
          prev.map((item) => (item.id === c.id ? full : item))
        );
      }
    } catch (err) {
      console.error("Error al cargar detalle del contrato:", err);
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  // Sincronizar apertura cuando cambian los parámetros de búsqueda en navegación
  if (
    prevParams.abrirCrear !== abrirCrear ||
    prevParams.inquilinoIdPreseleccionado !== inquilinoIdPreseleccionado ||
    prevParams.unidadIdPreseleccionada !== unidadIdPreseleccionada
  ) {
    setPrevParams({
      abrirCrear,
      inquilinoIdPreseleccionado,
      unidadIdPreseleccionada,
    });
    if (abrirCrear || inquilinoIdPreseleccionado || unidadIdPreseleccionada) {
      setModalMode("crear");
    }
  }

  const [isPending, startTransition] = useTransition();

  // Recalcular estadísticas locales al mutar
  const recalcStats = (updated: ContratoConRelaciones[]) => {
    const total = updated.length;
    const activos = updated.filter((c) => c.estado === EstadoContrato.ACTIVO).length;
    const porVencer = updated.filter((c) => c.estado === EstadoContrato.POR_VENCER).length;
    const finalizados = updated.filter(
      (c) => c.estado === EstadoContrato.FINALIZADO || c.estado === EstadoContrato.RESCINDIDO
    ).length;

    setStats({ total, activos, porVencer, finalizados });
  };

  // Filtrado de contratos
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      const coincidePropiedad =
        filtroPropiedad === "TODAS" || c.unidad.propiedad.id === filtroPropiedad;

      const coincideEstado =
        filtroEstado === "TODOS" || c.estado === filtroEstado;

      const q = busqueda.toLowerCase().trim();
      const nombreInquilino = `${c.inquilino.nombre} ${c.inquilino.apellido ?? ""}`.toLowerCase();
      const coincideBusqueda =
        !q ||
        c.codigo.toLowerCase().includes(q) ||
        nombreInquilino.includes(q) ||
        c.inquilino.documentoIdentidad.toLowerCase().includes(q) ||
        c.unidad.codigo.toLowerCase().includes(q) ||
        c.unidad.propiedad.nombre.toLowerCase().includes(q);

      return coincidePropiedad && coincideEstado && coincideBusqueda;
    });
  }, [contratos, busqueda, filtroEstado, filtroPropiedad]);

  // Agrupación de contratos filtrados por Inmueble
  const gruposPorPropiedad = useMemo(() => {
    const mapa = new Map<string, ContratoConRelaciones[]>();
    for (const c of contratosFiltrados) {
      const propId = c.unidad.propiedad.id;
      if (!mapa.has(propId)) {
        mapa.set(propId, []);
      }
      mapa.get(propId)!.push(c);
    }

    const resultado: Array<{
      propiedad: {
        id: string;
        nombre: string;
        ciudad: string;
        tipo: TipoPropiedad;
        direccion?: string | null;
      };
      contratos: ContratoConRelaciones[];
      recaudacionMensual: number;
    }> = [];

    for (const [propId, listaContratos] of mapa.entries()) {
      const propInfo =
        propiedades.find((p) => p.id === propId) ||
        listaContratos[0]?.unidad.propiedad;

      if (propInfo) {
        const recaudacionMensual = listaContratos
          .filter((c) => c.estado === EstadoContrato.ACTIVO || c.estado === EstadoContrato.POR_VENCER)
          .reduce((acc, c) => acc + (c.montoAlquiler || 0), 0);

        resultado.push({
          propiedad: {
            id: propInfo.id,
            nombre: propInfo.nombre,
            ciudad: propInfo.ciudad,
            tipo: propInfo.tipo,
            direccion: propInfo.direccion,
          },
          contratos: listaContratos,
          recaudacionMensual,
        });
      }
    }

    return resultado;
  }, [contratosFiltrados, propiedades]);

  // Manejadores CRUD
  const handleCrear = (data: CreateContratoInput | UpdateContratoInput) => {
    startTransition(async () => {
      const res = await createContrato(data as CreateContratoInput);
      if (res.success && res.data) {
        const contratoCreado = res.data as unknown as ContratoConRelaciones;
        const nuevaLista = [contratoCreado, ...contratos];
        setContratos(nuevaLista);
        recalcStats(nuevaLista);
        setModalMode(null);
        limpiarSearchParams();
        toast.success(`Contrato "${contratoCreado.codigo}" activado exitosamente.`);
      } else {
        toast.error(res.error || "No se pudo registrar el contrato.");
      }
    });
  };

  const handleEditar = (data: CreateContratoInput | UpdateContratoInput) => {
    if (!contratoSeleccionado) return;
    startTransition(async () => {
      const res = await updateContrato(contratoSeleccionado.id, data as UpdateContratoInput);
      if (res.success && res.data) {
        const contratoActualizado = res.data as unknown as ContratoConRelaciones;
        const nuevaLista = contratos.map((c) =>
          c.id === contratoSeleccionado.id ? contratoActualizado : c
        );
        setContratos(nuevaLista);
        recalcStats(nuevaLista);
        setModalMode(null);
        setContratoSeleccionado(null);
        toast.success("Contrato actualizado exitosamente.");
      } else {
        toast.error(res.error || "No se pudo actualizar el contrato.");
      }
    });
  };

  const handleCambiarEstado = (id: string, nuevoEstado: EstadoContrato) => {
    startTransition(async () => {
      const res = await updateEstadoContrato(id, nuevoEstado);
      if (res.success && res.data) {
        const contratoActualizado = res.data as unknown as ContratoConRelaciones;
        const nuevaLista = contratos.map((c) =>
          c.id === id ? contratoActualizado : c
        );
        setContratos(nuevaLista);
        recalcStats(nuevaLista);
        if (contratoSeleccionado?.id === id) {
          setContratoSeleccionado(contratoActualizado);
        }
        toast.success(`Estado actualizado a ${nuevoEstado.toLowerCase()}.`);
      } else {
        toast.error(res.error || "No se pudo cambiar el estado.");
      }
    });
  };

  const handleEliminar = () => {
    if (!contratoSeleccionado) return;
    startTransition(async () => {
      const res = await deleteContrato(contratoSeleccionado.id);
      if (res.success) {
        const nuevaLista = contratos.filter((c) => c.id !== contratoSeleccionado.id);
        setContratos(nuevaLista);
        recalcStats(nuevaLista);
        setModalMode(null);
        setContratoSeleccionado(null);
        toast.success("Contrato eliminado.");
      } else {
        toast.error(res.error || "No se pudo eliminar el contrato.");
      }
    });
  };

  // Helper para renderizar cada tarjeta individual de contrato
  const renderContratoCard = (c: ContratoConRelaciones) => {
    const cornerSun = getContratoCornerSun(c.estado);
    const fFin = new Date(c.fechaFin).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const nombreInquilino = `${c.inquilino.nombre} ${c.inquilino.apellido ?? ""}`.trim();

    return (
      <div
        key={c.id}
        className="group/contractcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
      >
        {/* Sol decorativo en esquina */}
        <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
          <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
          <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
          <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/contractcard:scale-125`} />
        </div>

        <div className="p-5 sm:p-5.5 space-y-4 relative z-10 flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Header con Badge de Estado y Botones de Acción */}
            <div className="flex items-center justify-between gap-2 relative z-10">
              <Badge
                variant={
                  c.estado === EstadoContrato.ACTIVO
                    ? "DISPONIBLE"
                    : c.estado === EstadoContrato.POR_VENCER
                    ? "OCUPADO"
                    : c.estado === EstadoContrato.FINALIZADO
                    ? "FINALIZADO"
                    : "RESCINDIDO"
                }
                dot
                size="sm"
              >
                {c.estado === EstadoContrato.ACTIVO
                  ? "Activo"
                  : c.estado === EstadoContrato.POR_VENCER
                  ? "Por Vencer"
                  : c.estado === EstadoContrato.FINALIZADO
                  ? "Finalizado"
                  : "Rescindido"}
              </Badge>

              {/* Botones rápidos Editar / Eliminar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Editar */}
                <div className="relative group/btn">
                  <button
                    type="button"
                    onClick={() => {
                      setContratoSeleccionado(c);
                      setModalMode("editar");
                    }}
                    disabled={isPending}
                    title="Editar contrato"
                    aria-label="Editar contrato"
                    className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                    <span>Editar</span>
                  </div>
                </div>

                {/* Eliminar o Archivar / Rescindir */}
                <div className="relative group/btn">
                  <button
                    type="button"
                    onClick={() => {
                      setContratoSeleccionado(c);
                      if ((c._count?.pagos ?? 0) > 0) {
                        setModalMode("rescindir");
                      } else {
                        setModalMode("eliminar");
                      }
                    }}
                    disabled={isPending}
                    title={
                      (c._count?.pagos ?? 0) > 0
                        ? "Archivar / Rescindir contrato (preserva historial contable)"
                        : "Eliminar contrato"
                    }
                    aria-label={
                      (c._count?.pagos ?? 0) > 0
                        ? "Archivar o rescindir contrato"
                        : "Eliminar contrato"
                    }
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                      (c._count?.pagos ?? 0) > 0
                        ? "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900"
                        : "bg-rose-50 text-rose-600 border-rose-200/90 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800"
                    }`}
                  >
                    {(c._count?.pagos ?? 0) > 0 ? (
                      <Archive className="w-3.5 h-3.5" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                    <span>
                      {(c._count?.pagos ?? 0) > 0 ? "Archivar / Rescindir" : "Eliminar"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Código de Contrato y Espacio Asignado */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md inline-block tracking-wider">
                  {c.codigo}
                </span>
                <span className="text-xs font-medium text-slate-400 capitalize">
                  • {c.unidad.tipo.toLowerCase()}
                </span>
              </div>

              {/* Identificador del Espacio */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#175E38]/10 text-[#175E38] border border-[#175E38]/20 shadow-2xs">
                  <Store className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  <span className="text-xs font-black font-heading tracking-wide">
                    Espacio {c.unidad.codigo}
                  </span>
                </div>
                {c.unidad.piso && (
                  <span className="text-xs text-slate-500 font-medium">
                    · Piso {c.unidad.piso}
                  </span>
                )}
                {c.unidad.areaMt2 && (
                  <span className="text-xs text-slate-500 font-medium">
                    · {c.unidad.areaMt2} m²
                  </span>
                )}
              </div>
            </div>

            {/* Inquilino y WhatsApp */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-900 truncate">
                    {nombreInquilino}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                  {c.inquilino.documentoIdentidad}
                </span>
              </div>

              <div className="pt-0.5">
                <a
                  href={getWhatsAppUrl(c.inquilino.telefono)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Contactar al inquilino"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950"
                >
                  <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                  <span className="underline decoration-emerald-300 underline-offset-2">
                    {c.inquilino.telefono}
                  </span>
                </a>
              </div>
            </div>

            {/* Vigencia y Mensualidad */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Vencimiento */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Vencimiento
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-slate-800 font-bold text-xs sm:text-sm font-heading">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{fFin}</span>
                </div>
              </div>

              {/* Mensualidad Destacada */}
              <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-2.5 flex flex-col justify-between text-right">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  Mensualidad
                </span>
                <div className="mt-0.5">
                  <span className="text-base sm:text-lg font-black text-[#175E38] font-heading tracking-tight">
                    {formatCurrency(c.montoAlquiler)}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700/80 ml-0.5">
                    /mes
                  </span>
                </div>
              </div>
            </div>

            {/* Píldora de Depósito en Garantía */}
            {c.depositoGarantia && c.depositoGarantia > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                  <span className="truncate">Depósito:</span>
                  <strong className="text-slate-900 shrink-0">{formatCurrency(c.depositoGarantia)}</strong>
                </div>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0 ${
                    c.depositoEstado === EstadoDeposito.COBRADO
                      ? "bg-emerald-100 text-emerald-800"
                      : c.depositoEstado === EstadoDeposito.PENDIENTE
                      ? "bg-amber-100 text-amber-800"
                      : c.depositoEstado === EstadoDeposito.REEMBOLSADO
                      ? "bg-blue-100 text-blue-800"
                      : c.depositoEstado === EstadoDeposito.RETENIDO
                      ? "bg-rose-100 text-rose-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {c.depositoEstado === EstadoDeposito.COBRADO
                    ? "En Custodia"
                    : c.depositoEstado === EstadoDeposito.PENDIENTE
                    ? "Por Cobrar"
                    : c.depositoEstado === EstadoDeposito.REEMBOLSADO
                    ? "Reembolsado"
                    : c.depositoEstado === EstadoDeposito.RETENIDO
                    ? "Retenido"
                    : "Liq. Parcial"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer 50/50: Ver Contrato y Cambiar Estado */}
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={() => abrirDetalle(c)}
            className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
            title="Ver detalles completos del contrato"
          >
            <FileText className="w-3.5 h-3.5 text-slate-200 shrink-0" />
            <span className="truncate">Ver Contrato</span>
          </button>

          {c.estado === EstadoContrato.ACTIVO || c.estado === EstadoContrato.POR_VENCER ? (
            <button
              type="button"
              onClick={() => {
                setContratoSeleccionado(c);
                setModalMode("finalizar");
              }}
              className="w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-2xs"
              title="Finalizar contrato y liberar espacio"
            >
              <span className="truncate">Finalizar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleCambiarEstado(c.id, EstadoContrato.ACTIVO)}
              className="w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 bg-[#175E38] text-white hover:bg-[#124b2d] shadow-[0_2px_6px_rgba(23,94,56,0.3)]"
              title="Reactivar contrato"
            >
              <span className="truncate">Reactivar</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <PageHeader
        title="Gestión de Contratos"
        icon={<FileText className="w-6 h-6" />}
        actions={
          <button
            onClick={() => {
              setContratoSeleccionado(null);
              setModalMode("crear");
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-xs sm:text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Contrato
          </button>
        }
      />

      {/* Tarjetas de Estadísticas Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          title="Total Contratos"
          value={stats.total}
          icon={FileText}
          color="navy"
          subtitle={stats.total === 1 ? "contrato histórico" : "contratos históricos"}
        />
        <StatCard
          title="Activos / Vigentes"
          value={stats.activos}
          icon={CheckCircle2}
          color="emerald"
          subtitle="espacios ocupados"
        />
        <StatCard
          title="Por Vencer"
          value={stats.porVencer}
          icon={AlertTriangle}
          color="amber"
          subtitle="en próximos 30 días"
        />
        <StatCard
          title="Finalizados"
          value={stats.finalizados}
          icon={XCircle}
          color="blue"
          subtitle="concluidos o rescindidos"
        />
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-[#1C2539]/[0.03] rounded-2xl p-3 sm:p-4 border border-[#1C2539]/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Input de Búsqueda */}
        <div className="relative w-full md:w-[320px] lg:w-[380px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, inquilino, cédula o espacio..."
            className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros: Inmueble y Estado */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {/* 1. Selector de Inmueble / Propiedad */}
          <div ref={dropdownPropiedadRef} className="relative w-full sm:w-auto">
            {/* Capa móvil nativa para iOS y Android */}
            <select
              value={filtroPropiedad}
              onChange={(e) => setFiltroPropiedad(e.target.value)}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar por inmueble"
            >
              <option value="TODAS">
                Todos los inmuebles ({contratos.length})
              </option>
              {propiedadesParaSelector.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.count})
                </option>
              ))}
            </select>

            {/* Botón Desktop */}
            <button
              type="button"
              onClick={() => setIsDropdownPropiedadOpen((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
            >
              <div className="flex items-center gap-2 truncate sm:max-w-[150px] lg:max-w-[180px]">
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
                    setFiltroPropiedad("TODAS");
                    setIsDropdownPropiedadOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    filtroPropiedad === "TODAS"
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
                      {contratos.length}
                    </span>
                    {filtroPropiedad === "TODAS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                  </div>
                </button>

                {propiedadesParaSelector.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {propiedadesParaSelector.map((p) => {
                  const isSelected = filtroPropiedad === p.id;
                  const IconComp = tipoPropiedadBadgeConfig(p.tipo).icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFiltroPropiedad(p.id);
                        setIsDropdownPropiedadOpen(false);
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
                          <p className="text-[10px] text-slate-400 truncate">{p.ciudad}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {p.count}
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
          <div ref={dropdownEstadoRef} className="relative w-full sm:w-auto">
            {/* Capa móvil nativa para iOS y Android */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoContrato | "TODOS")}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar por estado"
            >
              <option value="TODOS">
                Todos los estados {contratos.length > 0 ? `(${contratos.length})` : ""}
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
              onClick={() => setIsDropdownEstadoOpen((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
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
              <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroEstado("TODOS");
                    setIsDropdownEstadoOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    filtroEstado === "TODOS"
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
                      {contratos.length}
                    </span>
                    {filtroEstado === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                  </div>
                </button>

                {estadosDisponibles.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {estadosDisponibles.map((opt) => {
                  const isSelected = filtroEstado === opt.value;
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFiltroEstado(opt.value);
                        setIsDropdownEstadoOpen(false);
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
      </div>

      {/* Grid o Acordeón de Contratos */}
      {contratos.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 border border-slate-200/90 shadow-sm text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#175E38] flex items-center justify-center mx-auto border border-emerald-200">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-heading">
            Sin contratos registrados
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Comienza vinculando tus inquilinos con los espacios disponibles para generar contratos oficiales y habilitar el panel de cobranza mensual.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setContratoSeleccionado(null);
                setModalMode("crear");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear Primer Contrato
            </button>
          </div>
        </div>
      ) : contratosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/90 shadow-2xs text-center space-y-2.5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No se encontraron contratos</h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            No hay contratos que coincidan con los criterios de búsqueda o filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setFiltroEstado("TODOS");
              setFiltroPropiedad("TODAS");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100/80 rounded-lg border border-emerald-200/70 transition-all cursor-pointer mt-1"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Banner sutil cuando se está filtrando por un inmueble específico */}
          {filtroPropiedad !== "TODAS" && propiedadActivaFiltro && (
            <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50/70 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1C2539] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Filtrando por inmueble
                    </p>
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {propiedadActivaFiltro.nombre} ·{" "}
                    <span className="text-slate-500 font-normal">
                      {propiedadActivaFiltro.ciudad}
                    </span>
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContratoSeleccionado(null);
                    setModalMode("crear");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-semibold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Contrato</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroPropiedad("TODAS")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ver todos</span>
                </button>
              </div>
            </div>
          )}

          {/* Vista Agrupada por Inmueble con Acordeón Suave */}
          <div className="space-y-4 sm:space-y-5">
            {gruposPorPropiedad.map((grupo) => {
              const prop = grupo.propiedad;
              const badgeConfig = tipoPropiedadBadgeConfig(prop.tipo);
              const cornerSun = tipoPropiedadCornerSun(prop.tipo);
              const IconComp = badgeConfig.icon;
              const activosCount = grupo.contratos.filter(
                (c) => c.estado === EstadoContrato.ACTIVO
              ).length;
              const porVencerCount = grupo.contratos.filter(
                (c) => c.estado === EstadoContrato.POR_VENCER
              ).length;

              // Por defecto todos los desplegables inician cerrados; solo se abren al hacer clic o si hay búsqueda activa / filtro por inmueble específico
              const estaDesplegada =
                propiedadesDesplegadas[prop.id] !== undefined
                  ? propiedadesDesplegadas[prop.id]
                  : busqueda.trim() !== "" || (filtroPropiedad !== "TODAS" && filtroPropiedad === prop.id);

              // Montar tras el primer despliegue o si está abierto por búsqueda/filtro
              const haSidoMontada = estaDesplegada || !!propiedadesCargadas[prop.id];

              const paginaActual = paginasPorPropiedad[prop.id] ?? 1;
              const totalPaginas = Math.ceil(grupo.contratos.length / PAGE_SIZE);
              const inicio = (paginaActual - 1) * PAGE_SIZE;
              const fin = inicio + PAGE_SIZE;
              const contratosPagina = grupo.contratos.slice(inicio, fin);

              return (
                <section
                  key={prop.id}
                  className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300 ${
                    estaDesplegada ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
                  }`}
                >
                  {/* Sol decorativo en esquina superior izquierda */}
                  <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
                    <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                    <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                    <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/acordeon:scale-125`} />
                  </div>

                  {/* Cabecera del Inmueble (Clickeable) */}
                  <div
                    onClick={() => toggleDesplieguePropiedad(prop.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDesplieguePropiedad(prop.id);
                      }
                    }}
                    className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
                    title={estaDesplegada ? "Clic para cerrar contratos" : "Clic para desplegar contratos de este inmueble"}
                  >
                    {/* Información Principal del Inmueble */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                        <IconComp className="w-5 h-5 text-black" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                            {prop.nombre}
                          </h3>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeConfig.bg}`}>
                            {badgeConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{prop.ciudad}</span>
                          {prop.direccion && <span className="text-slate-400">· {prop.direccion}</span>}
                        </p>

                        {/* Conteo de Contratos y Recaudación */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                            {grupo.contratos.length} {grupo.contratos.length === 1 ? "contrato" : "contratos"}
                          </span>
                          {activosCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                              {activosCount} activo{activosCount > 1 ? "s" : ""}
                            </span>
                          )}
                          {porVencerCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/70">
                              {porVencerCount} por vencer
                            </span>
                          )}
                          {grupo.recaudacionMensual > 0 && (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100/70 text-[#175E38] font-black text-[11px] border border-emerald-300/80">
                              Total: {formatCurrency(grupo.recaudacionMensual)}/mes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones: Desplegar a la izquierda y Crear Contrato a la derecha */}
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Botón Desplegable */}
                      <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                            estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                          }`}
                        >
                          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 select-none">
                          {estaDesplegada ? "Cerrar" : "Ver contratos"}
                        </span>
                      </div>

                      {/* Botón Nuevo Contrato */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContratoSeleccionado(null);
                          setModalMode("crear");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Nuevo Contrato</span>
                      </button>
                    </div>
                  </div>

                  {/* Contenedor Animado con CSS Grid */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      estaDesplegada
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="overflow-hidden">
                      {haSidoMontada && (
                        <div className="border-t border-slate-100">
                          {/* Grid de Contratos de la página actual */}
                          <div className="p-4 sm:p-6 pt-3 sm:pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
                              {contratosPagina.map((c) => renderContratoCard(c))}
                            </div>
                          </div>

                          {/* Controles de paginación si supera PAGE_SIZE */}
                          {totalPaginas > 1 && (
                            <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex items-center justify-between gap-3">
                              <p className="text-xs text-slate-400 font-medium shrink-0">
                                {inicio + 1}–{Math.min(fin, grupo.contratos.length)} de{" "}
                                <span className="font-bold text-slate-600">{grupo.contratos.length}</span> contratos
                              </p>

                              <div className="flex items-center gap-1.5">
                                {/* Anterior */}
                                <button
                                  type="button"
                                  disabled={paginaActual === 1}
                                  onClick={() => changePaginaPropiedad(prop.id, paginaActual - 1)}
                                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                  aria-label="Página anterior"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                                </button>

                                {/* Números de página */}
                                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                  .filter((p) => {
                                    if (totalPaginas <= 5) return true;
                                    return p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1;
                                  })
                                  .map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => changePaginaPropiedad(prop.id, p)}
                                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                        paginaActual === p
                                          ? "bg-[#175E38] text-white shadow-xs"
                                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  ))}

                                {/* Siguiente */}
                                <button
                                  type="button"
                                  disabled={paginaActual === totalPaginas}
                                  onClick={() => changePaginaPropiedad(prop.id, paginaActual + 1)}
                                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                  aria-label="Página siguiente"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Formulario Contrato (Crear / Editar) */}
      {(modalMode === "crear" || modalMode === "editar") && (
        <ContratoFormModal
          key={`${modalMode}-${contratoSeleccionado?.id ?? "nuevo"}-${unidadIdPreseleccionada ?? "no-unidad"}-${inquilinoIdPreseleccionado ?? "no-inquilino"}`}
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setContratoSeleccionado(null);
            limpiarSearchParams();
          }}
          onSubmit={modalMode === "crear" ? handleCrear : handleEditar}
          inquilinos={inquilinos}
          unidadesDisponibles={unidadesDisponibles}
          initialData={modalMode === "editar" ? contratoSeleccionado : null}
          inquilinoIdPreseleccionado={inquilinoIdPreseleccionado}
          unidadIdPreseleccionada={unidadIdPreseleccionada}
          isLoading={isPending}
        />
      )}

      {/* Modal Detalle / Ficha de Contrato */}
      <ContratoDetalleModal
        isOpen={modalMode === "detalle" && !!contratoSeleccionado}
        contrato={contratoSeleccionado}
        onClose={() => {
          setModalMode(null);
          setContratoSeleccionado(null);
        }}
        onEditar={() => setModalMode("editar")}
        onCambiarEstado={handleCambiarEstado}
        onFinalizarORescindir={(c, modo) => {
          setContratoSeleccionado(c);
          setModalMode(modo);
        }}
        onContratoActualizado={(actualizado) => {
          const nuevaLista = contratos.map((c) =>
            c.id === actualizado.id ? actualizado : c
          );
          setContratos(nuevaLista);
          setContratoSeleccionado(actualizado);
        }}
        isPending={isPending}
        isLoadingPagos={isLoadingDetalle}
      />

      {/* Modal Unificado para Finalizar o Rescindir Contrato con Resolución Directa de Depósito */}
      <FinalizarContratoModal
        isOpen={(modalMode === "finalizar" || modalMode === "rescindir") && !!contratoSeleccionado}
        onClose={() => {
          setModalMode(null);
          setContratoSeleccionado(null);
        }}
        contrato={contratoSeleccionado}
        modo={modalMode === "rescindir" ? "rescindir" : "finalizar"}
        onSuccess={(actualizado) => {
          const nuevaLista = contratos.map((c) =>
            c.id === actualizado.id ? actualizado : c
          );
          setContratos(nuevaLista);
          recalcStats(nuevaLista);
          setContratoSeleccionado(actualizado);
          setModalMode(null);
        }}
      />

      {/* Modal de Confirmación: Eliminar Contrato Sin Historial */}
      <ConfirmActionModal
        isOpen={modalMode === "eliminar" && !!contratoSeleccionado}
        onClose={() => {
          setModalMode(null);
          setContratoSeleccionado(null);
        }}
        onConfirm={handleEliminar}
        title="Eliminar Contrato Definitivamente"
        subtitle="Acción destructiva irreversible"
        variant="danger"
        icon={Trash2}
        description="¿Estás seguro de que deseas eliminar permanentemente este contrato del sistema? Al no tener historial de pagos registrados, se eliminará de forma segura y se liberará el espacio a disponible."
        itemDetails={[
          { label: "Código de Contrato", value: contratoSeleccionado?.codigo },
          { label: "Inmueble", value: contratoSeleccionado?.unidad.propiedad.nombre },
          { label: "Espacio", value: `Espacio ${contratoSeleccionado?.unidad.codigo}` },
          {
            label: "Inquilino",
            value: `${contratoSeleccionado?.inquilino.nombre} ${contratoSeleccionado?.inquilino.apellido ?? ""}`.trim(),
          },
        ]}
        confirmationKeyword="ELIMINAR"
        infoNote="⚠️ Si este contrato está activo, al eliminarlo se liberará automáticamente el espacio asociado a estado disponible."
        confirmButtonText="Eliminar Contrato"
        cancelButtonText="Cancelar"
        isLoading={isPending}
      />
    </div>
  );
}
