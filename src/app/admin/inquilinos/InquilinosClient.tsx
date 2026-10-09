"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  User,
  Building2,
  CreditCard,
  Mail,
  Pencil,
  Archive,
  RotateCcw,
  X,
  RefreshCw,
  FileText,
  UserCheck,
  ChevronDown,
  Check,
  Layers,
  FileCheck,
  Store,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { InquilinoFormModal } from "./InquilinoFormModal";
import { InquilinoDetalleModal } from "./InquilinoDetalleModal";
import {
  createInquilino,
  updateInquilino,
  archivarInquilino,
  reactivarInquilino,
  getInquilinoDetalle,
  type CreateInquilinoInput,
  type UpdateInquilinoInput,
} from "@/lib/actions/inquilinos";
import { TipoPersona } from "@prisma/client";
import { WhatsAppIcon, getWhatsAppUrl } from "../propiedades/constants";
import type {
  InquilinoConContratos,
  InquilinosClientProps,
  ModalMode,
} from "./types";

// Sol decorativo en esquina según el tipo de persona
const getPersonaCornerSun = (tipo: TipoPersona) => {
  if (tipo === TipoPersona.JURIDICA) {
    return {
      glow: "bg-indigo-500/20",
      ring: "bg-indigo-500/[0.08] border-indigo-400/25",
      sun: "from-indigo-600/25 to-indigo-400/5",
    };
  }
  return {
    glow: "bg-emerald-500/20",
    ring: "bg-emerald-500/[0.08] border-emerald-400/25",
    sun: "from-[#175E38]/30 to-emerald-400/5",
  };
};

export function InquilinosClient({
  inquilinos: initialInquilinos,
  stats: initialStats,
}: InquilinosClientProps) {
  const router = useRouter();
  const [inquilinos, setInquilinos] = useState(initialInquilinos);
  const [stats, setStats] = useState(initialStats);
  const [vistaArchivados, setVistaArchivados] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroContrato, setFiltroContrato] = useState<string>("TODOS");

  const [isDropdownTipoOpen, setIsDropdownTipoOpen] = useState(false);
  const [isDropdownContratoOpen, setIsDropdownContratoOpen] = useState(false);
  const dropdownTipoRef = useRef<HTMLDivElement>(null);
  const dropdownContratoRef = useRef<HTMLDivElement>(null);

  // Cierre de dropdowns al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownTipoRef.current && !dropdownTipoRef.current.contains(e.target as Node)) {
        setIsDropdownTipoOpen(false);
      }
      if (dropdownContratoRef.current && !dropdownContratoRef.current.contains(e.target as Node)) {
        setIsDropdownContratoOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownTipoOpen(false);
        setIsDropdownContratoOpen(false);
      }
    };
    if (isDropdownTipoOpen || isDropdownContratoOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownTipoOpen, isDropdownContratoOpen]);

  const tiposDisponibles = useMemo(() => {
    return [
      {
        value: TipoPersona.NATURAL,
        label: "Persona Natural",
        icon: User,
        count: inquilinos.filter((i) => i.tipoPersona === TipoPersona.NATURAL).length,
      },
      {
        value: TipoPersona.JURIDICA,
        label: "Empresa / Jurídica",
        icon: Building2,
        count: inquilinos.filter((i) => i.tipoPersona === TipoPersona.JURIDICA).length,
      },
    ];
  }, [inquilinos]);

  const tipoActivoConfig = useMemo(() => {
    if (filtroTipo === "TODOS") {
      return {
        value: "TODOS",
        label: "Todos los tipos",
        icon: Layers,
        count: inquilinos.length,
      };
    }
    return (
      tiposDisponibles.find((o) => o.value === filtroTipo) || {
        value: "TODOS",
        label: "Todos los tipos",
        icon: Layers,
        count: inquilinos.length,
      }
    );
  }, [filtroTipo, tiposDisponibles, inquilinos.length]);

  const estadosContratoDisponibles = useMemo(() => {
    return [
      {
        value: "CON_CONTRATO",
        label: "Con Contrato",
        icon: FileCheck,
        count: inquilinos.filter((i) => i._count.contratos > 0).length,
      },
      {
        value: "SIN_CONTRATO",
        label: "Sin Contrato",
        icon: FileText,
        count: inquilinos.filter((i) => i._count.contratos === 0).length,
      },
    ];
  }, [inquilinos]);

  const contratoActivoConfig = useMemo(() => {
    if (filtroContrato === "TODOS") {
      return {
        value: "TODOS",
        label: "Todos los contratos",
        icon: Layers,
        count: inquilinos.length,
      };
    }
    return (
      estadosContratoDisponibles.find((o) => o.value === filtroContrato) || {
        value: "TODOS",
        label: "Todos los contratos",
        icon: Layers,
        count: inquilinos.length,
      }
    );
  }, [filtroContrato, estadosContratoDisponibles, inquilinos.length]);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [inquilinoSeleccionado, setInquilinoSeleccionado] = useState<InquilinoConContratos | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Apertura lazy de ficha con carga en segundo plano de solvencia y contratos
  const abrirDetalle = async (inq: InquilinoConContratos) => {
    setInquilinoSeleccionado(inq);
    setModalMode("detalle");
    const tienePagosCargados = inq.contratos?.some(
      (c) => c.pagos && c.pagos.length > 0
    );
    if (!tienePagosCargados) {
      setIsLoadingDetalle(true);
    }
    try {
      const res = await getInquilinoDetalle(inq.id);
      if (res.success && res.data) {
        const full = res.data as unknown as InquilinoConContratos;
        setInquilinoSeleccionado(full);
        setInquilinos((prev) =>
          prev.map((item) => (item.id === inq.id ? full : item))
        );
      }
    } catch (err) {
      console.error("Error al cargar detalle del inquilino:", err);
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  const [isPending, startTransition] = useTransition();

  // Recalcular estadísticas locales al mutar
  const recalcStats = (updated: InquilinoConContratos[]) => {
    const total = updated.length;
    const activos = updated.filter((i) => i.activo).length;
    const archivados = total - activos;
    const conContratosActivos = updated.filter((i) => i.activo && i._count.contratos > 0).length;
    setStats({
      total,
      activos,
      archivados,
      conContratosActivos,
      sinContrato: activos - conContratosActivos,
    });
  };

  // Paginación local de 15 en 15 (Ultra liviana para el servidor y el navegador)
  const PAGE_SIZE = 15;
  const [paginaActual, setPaginaActual] = useState(1);
  const [prevFiltros, setPrevFiltros] = useState({ busqueda, filtroTipo, filtroContrato, vistaArchivados });

  // Resetear página durante el render si cambiaron los filtros o búsqueda
  if (
    prevFiltros.busqueda !== busqueda ||
    prevFiltros.filtroTipo !== filtroTipo ||
    prevFiltros.filtroContrato !== filtroContrato ||
    prevFiltros.vistaArchivados !== vistaArchivados
  ) {
    setPrevFiltros({ busqueda, filtroTipo, filtroContrato, vistaArchivados });
    setPaginaActual(1);
  }

  // Filtrado de inquilinos
  const inquilinosFiltrados = useMemo(() => {
    return inquilinos.filter((inq) => {
      // Filtro de pestaña activa vs archivados
      const coincideActivo = vistaArchivados ? !inq.activo : inq.activo;
      if (!coincideActivo) return false;

      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !q ||
        inq.nombre.toLowerCase().includes(q) ||
        (inq.apellido?.toLowerCase().includes(q) ?? false) ||
        inq.documentoIdentidad.toLowerCase().includes(q) ||
        inq.telefono.includes(q) ||
        (inq.email?.toLowerCase().includes(q) ?? false);

      const coincideTipo =
        filtroTipo === "TODOS" || inq.tipoPersona === filtroTipo;

      const coincideContrato =
        filtroContrato === "TODOS" ||
        (filtroContrato === "CON_CONTRATO" && inq._count.contratos > 0) ||
        (filtroContrato === "SIN_CONTRATO" && inq._count.contratos === 0);

      return coincideBusqueda && coincideTipo && coincideContrato;
    });
  }, [inquilinos, vistaArchivados, busqueda, filtroTipo, filtroContrato]);

  // Segmentación por página
  const totalPaginas = Math.ceil(inquilinosFiltrados.length / PAGE_SIZE);
  const paginaSegura = totalPaginas > 0 ? Math.min(Math.max(1, paginaActual), totalPaginas) : 1;
  const inicio = (paginaSegura - 1) * PAGE_SIZE;
  const fin = inicio + PAGE_SIZE;
  const inquilinosPagina = inquilinosFiltrados.slice(inicio, fin);

  // Manejadores CRUD
  const handleCrear = (data: CreateInquilinoInput | UpdateInquilinoInput) => {
    startTransition(async () => {
      const res = await createInquilino(data as CreateInquilinoInput);
      if (res.success && res.data) {
        const nuevoInquilino = res.data as unknown as InquilinoConContratos;
        const nuevaLista = [nuevoInquilino, ...inquilinos];
        setInquilinos(nuevaLista);
        recalcStats(nuevaLista);
        setModalMode(null);
        toast.success("Inquilino registrado exitosamente.");
      } else {
        toast.error(res.error || "No se pudo registrar el inquilino.");
      }
    });
  };

  const handleEditar = (data: CreateInquilinoInput | UpdateInquilinoInput) => {
    if (!inquilinoSeleccionado) return;
    startTransition(async () => {
      const res = await updateInquilino(inquilinoSeleccionado.id, data as UpdateInquilinoInput);
      if (res.success && res.data) {
        const actualizado = res.data as unknown as InquilinoConContratos;
        const nuevaLista = inquilinos.map((i) =>
          i.id === inquilinoSeleccionado.id ? actualizado : i
        );
        setInquilinos(nuevaLista);
        recalcStats(nuevaLista);
        setModalMode(null);
        setInquilinoSeleccionado(null);
        toast.success("Datos actualizados correctamente.");
      } else {
        toast.error(res.error || "No se pudo actualizar el inquilino.");
      }
    });
  };

  const handleArchivar = () => {
    if (!inquilinoSeleccionado) return;
    startTransition(async () => {
      const tieneContratos = (inquilinoSeleccionado._count.contratos ?? 0) > 0;
      const res = await archivarInquilino(inquilinoSeleccionado.id, {
        rescindirContratos: tieneContratos,
      });
      if (res.success && res.data) {
        const actualizado = res.data as unknown as InquilinoConContratos;
        const nuevaLista = inquilinos.map((i) =>
          i.id === inquilinoSeleccionado.id ? actualizado : i
        );
        setInquilinos(nuevaLista);
        recalcStats(nuevaLista);
        setModalMode(null);
        setInquilinoSeleccionado(null);
        toast.success(
          tieneContratos
            ? "Inquilino archivado y contratos rescindidos exitosamente. Espacios liberados a disponible."
            : "Inquilino archivado exitosamente. Todo su historial contable se conserva intacto."
        );
      } else {
        toast.error(res.error || "No se pudo archivar el inquilino.");
      }
    });
  };

  const handleReactivar = (inq: InquilinoConContratos) => {
    startTransition(async () => {
      const res = await reactivarInquilino(inq.id);
      if (res.success && res.data) {
        const actualizado = res.data as unknown as InquilinoConContratos;
        const nuevaLista = inquilinos.map((i) =>
          i.id === inq.id ? actualizado : i
        );
        setInquilinos(nuevaLista);
        recalcStats(nuevaLista);
        toast.success(`Inquilino "${inq.nombre}" reactivado exitosamente.`);
      } else {
        toast.error(res.error || "No se pudo reactivar el inquilino.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <PageHeader
        title="Directorio de Inquilinos"
        icon={<Users className="w-6 h-6" />}
        actions={
          <button
            onClick={() => {
              setInquilinoSeleccionado(null);
              setModalMode("crear");
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-xs sm:text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Inquilino
          </button>
        }
      />

      {/* Tarjetas de Estadísticas Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          title="Total Inquilinos"
          value={stats.total}
          icon={Users}
          color="navy"
          subtitle={stats.total === 1 ? "arrendatario" : "arrendatarios"}
        />
        <StatCard
          title="Activos"
          value={stats.activos}
          icon={UserCheck}
          color="emerald"
          subtitle="en operaciones"
        />
        <StatCard
          title="Con Alquileres"
          value={stats.conContratosActivos}
          icon={FileText}
          color="blue"
          subtitle="con contrato vigente"
        />
        <StatCard
          title="Archivados"
          value={stats.archivados ?? 0}
          icon={Archive}
          color="amber"
          subtitle="histórico preservado"
        />
      </div>

      {/* Selector de Pestañas: Activos vs Archivados */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-2xl w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setVistaArchivados(false);
            setPaginaActual(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            !vistaArchivados
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4 text-[#175E38]" />
          <span>Inquilinos Activos</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#175E38] border border-emerald-200">
            {stats.activos}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setVistaArchivados(true);
            setPaginaActual(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            vistaArchivados
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Archive className="w-4 h-4 text-amber-600" />
          <span>Archivados / Inactivos</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {stats.archivados ?? 0}
          </span>
        </button>
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
            placeholder="Buscar por nombre, cédula, RIF o teléfono..."
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

        {/* Filtros Dropdown Híbridos (Estilo Propiedades) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {/* Filtro Tipo de Persona */}
          <div ref={dropdownTipoRef} className="relative w-full sm:w-auto">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar por tipo de persona"
            >
              <option value="TODOS">
                Todos los tipos {inquilinos.length > 0 ? `(${inquilinos.length})` : ""}
              </option>
              {tiposDisponibles.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsDropdownTipoOpen((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
            >
              <div className="flex items-center gap-2 truncate">
                {React.createElement(tipoActivoConfig.icon, {
                  className: "w-4 h-4 text-slate-500 shrink-0",
                })}
                <span className="truncate">{tipoActivoConfig.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                  isDropdownTipoOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownTipoOpen && (
              <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo("TODOS");
                    setIsDropdownTipoOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    filtroTipo === "TODOS"
                      ? "bg-slate-50 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Todos los tipos</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {inquilinos.length}
                    </span>
                    {filtroTipo === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                  </div>
                </button>

                {tiposDisponibles.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {tiposDisponibles.map((opt) => {
                  const isSelected = filtroTipo === opt.value;
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFiltroTipo(opt.value);
                        setIsDropdownTipoOpen(false);
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

          {/* Filtro Contratos */}
          <div ref={dropdownContratoRef} className="relative w-full sm:w-auto">
            <select
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
              className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Filtrar por estado de contrato"
            >
              <option value="TODOS">
                Todos los contratos {inquilinos.length > 0 ? `(${inquilinos.length})` : ""}
              </option>
              {estadosContratoDisponibles.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsDropdownContratoOpen((prev) => !prev)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
            >
              <div className="flex items-center gap-2 truncate">
                {React.createElement(contratoActivoConfig.icon, {
                  className: "w-4 h-4 text-slate-500 shrink-0",
                })}
                <span className="truncate">{contratoActivoConfig.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                  isDropdownContratoOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownContratoOpen && (
              <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroContrato("TODOS");
                    setIsDropdownContratoOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                    filtroContrato === "TODOS"
                      ? "bg-slate-50 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">Todos los contratos</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {inquilinos.length}
                    </span>
                    {filtroContrato === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                  </div>
                </button>

                {estadosContratoDisponibles.length > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}

                {estadosContratoDisponibles.map((opt) => {
                  const isSelected = filtroContrato === opt.value;
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFiltroContrato(opt.value);
                        setIsDropdownContratoOpen(false);
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

      {/* Listado de Tarjetas */}
      {inquilinos.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 border border-slate-200/90 shadow-sm text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#175E38] flex items-center justify-center mx-auto border border-emerald-200">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-heading">
            Sin inquilinos registrados
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Comienza dando de alta a tus arrendatarios para poder asignarles contratos, asociarles locales comerciales y gestionar sus cobros mensuales.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setInquilinoSeleccionado(null);
                setModalMode("crear");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Primer Inquilino
            </button>
          </div>
        </div>
      ) : inquilinosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/90 shadow-2xs text-center space-y-2.5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No se encontraron inquilinos</h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            No hay arrendatarios que coincidan con los criterios de búsqueda seleccionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setFiltroTipo("TODOS");
              setFiltroContrato("TODOS");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#175E38] hover:text-[#124b2d] bg-emerald-50 hover:bg-emerald-100/80 rounded-lg border border-emerald-200/70 transition-all cursor-pointer mt-1"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {inquilinosPagina.map((inq) => {
            const cornerSun = getPersonaCornerSun(inq.tipoPersona);
            const esJuridica = inq.tipoPersona === TipoPersona.JURIDICA;
            const nombreCompleto = esJuridica
              ? inq.nombre
              : `${inq.nombre} ${inq.apellido ?? ""}`.trim();

            return (
              <div
                key={inq.id}
                className="group/inqcard relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_16px_36px_-4px_rgba(28,37,57,0.13),0_6px_12px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Sol decorativo en esquina superior izquierda */}
                <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full">
                  <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                  <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                  <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/inqcard:scale-125`} />
                </div>

                <div className="p-5 sm:p-6 space-y-4 relative z-10 flex-1 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    {/* Header con Badge y Botones de Acción */}
                    <div className="flex items-center justify-between gap-2 relative z-10">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border shadow-xs ${
                          esJuridica
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : "bg-emerald-50 text-[#175E38] border-emerald-200"
                        }`}
                      >
                        {esJuridica ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        {esJuridica ? "Empresa / Jurídica" : "Persona Natural"}
                      </span>

                      {/* Botones rápidos Editar / Eliminar */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Editar */}
                        <div className="relative group/btn">
                          <button
                            type="button"
                            onClick={() => {
                              setInquilinoSeleccionado(inq);
                              setModalMode("editar");
                            }}
                            disabled={isPending}
                            title="Editar inquilino"
                            aria-label="Editar inquilino"
                            className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                            <span>Editar</span>
                          </div>
                        </div>

                        {/* Reactivar o Archivar */}
                        {vistaArchivados ? (
                          <div className="relative group/btn">
                            <button
                              type="button"
                              onClick={() => handleReactivar(inq)}
                              disabled={isPending}
                              title="Reactivar inquilino"
                              aria-label="Reactivar inquilino"
                              className="w-8 h-8 rounded-xl bg-emerald-50 text-[#175E38] border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 hover:text-[#124b2d] flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                              <span>Reactivar</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group/btn">
                            <button
                              type="button"
                              onClick={() => {
                                setInquilinoSeleccionado(inq);
                                setModalMode("archivar");
                              }}
                              disabled={isPending}
                              title="Archivar inquilino"
                              aria-label="Archivar inquilino"
                              className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/90 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <div className="pointer-events-none absolute top-full mt-1.5 right-0 px-2 py-0.5 bg-[#1C2539] text-white text-[10px] font-semibold rounded-md shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30">
                              <span>Archivar</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nombre y Documento */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xl leading-snug line-clamp-1 group-hover/inqcard:text-slate-950 transition-colors">
                        {nombreCompleto}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                          <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{inq.documentoIdentidad}</span>
                        </span>
                        {!inq.activo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                            Archivado / Inactivo
                          </span>
                        ) : inq._count.contratos > 0 ? (
                          <Badge variant="DISPONIBLE" size="sm">
                            {inq._count.contratos}{" "}
                            {inq._count.contratos === 1 ? "alquiler activo" : "alquileres activos"}
                          </Badge>
                        ) : (
                          <Badge variant="INACTIVO" size="sm">
                            Sin alquileres activos
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Contacto Directo: WhatsApp y Correo */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      {/* WhatsApp */}
                      <div className="flex items-center gap-2">
                        <a
                          href={getWhatsAppUrl(inq.telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar WhatsApp"
                          className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer group/ws"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                          <span className="underline decoration-emerald-300 underline-offset-2 group-hover/ws:decoration-emerald-600">
                            {inq.telefono}
                          </span>
                        </a>
                      </div>

                      {/* Correo */}
                      {inq.email && (
                        <p className="text-slate-500 flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{inq.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Espacios arrendados si los tiene */}
                  {inq.contratos && inq.contratos.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Espacios en posesión ({inq.contratos.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {inq.contratos.slice(0, 2).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => router.push(`/admin/contratos?search=${encodeURIComponent(c.codigo)}`)}
                            title={`Ir al contrato ${c.codigo} del espacio ${c.unidad.codigo}`}
                            className="w-full text-left p-2 rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/60 hover:from-emerald-50/50 hover:to-white hover:border-emerald-300 transition-all duration-200 flex items-center justify-between gap-2 group/spacebtn cursor-pointer shadow-2xs hover:shadow-xs active:translate-y-0.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#175E38] border border-emerald-200/70 flex items-center justify-center shrink-0 group-hover/spacebtn:scale-105 group-hover/spacebtn:bg-[#175E38] group-hover/spacebtn:text-white transition-all">
                                <Store className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-xs text-slate-900 font-heading">
                                    Espacio {c.unidad.codigo}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-slate-400">
                                    ({c.codigo})
                                  </span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-500 truncate" title={c.unidad.propiedad.nombre}>
                                  {c.unidad.propiedad.nombre}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#175E38] group-hover/spacebtn:text-[#124b2d] bg-white group-hover/spacebtn:bg-emerald-50 px-2 py-1 rounded-md border border-slate-200/80 group-hover/spacebtn:border-emerald-300 shrink-0 shadow-2xs transition-all">
                              <span>Ver</span>
                              <ArrowUpRight className="w-3 h-3 group-hover/spacebtn:translate-x-0.5 group-hover/spacebtn:-translate-y-0.5 transition-transform" />
                            </div>
                          </button>
                        ))}
                        {inq.contratos.length > 2 && (
                          <button
                            type="button"
                            onClick={() => abrirDetalle(inq)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors block text-center w-full pt-0.5 cursor-pointer"
                          >
                            +{inq.contratos.length - 2} espacios más en ficha técnica →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer 50/50: Ver Ficha y Crear Contrato */}
                <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
                  <button
                    type="button"
                    onClick={() => abrirDetalle(inq)}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                    title="Ver ficha técnica completa del inquilino"
                  >
                    <User className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                    <span className="truncate">Ver Ficha</span>
                  </button>

                  {vistaArchivados ? (
                    <button
                      type="button"
                      onClick={() => handleReactivar(inq)}
                      disabled={isPending}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
                      title="Reactivar inquilino en operaciones"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                      <span className="truncate">Reactivar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/admin/contratos?inquilinoId=${inq.id}`);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
                      title="Crear un nuevo contrato para este inquilino"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                      <span className="truncate">Crear Contrato</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>

          {/* Controles de Paginación de 15 en 15 */}
          {totalPaginas > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-medium">
                Mostrando <span className="font-bold text-slate-800">{inicio + 1}</span>–
                <span className="font-bold text-slate-800">{Math.min(fin, inquilinosFiltrados.length)}</span> de{" "}
                <span className="font-bold text-slate-800">{inquilinosFiltrados.length}</span> inquilinos
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaSegura === 1}
                  onClick={() => {
                    setPaginaActual(Math.max(1, paginaSegura - 1));
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
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
                      onClick={() => {
                        setPaginaActual(p);
                        window.scrollTo({ top: 350, behavior: "smooth" });
                      }}
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
                  onClick={() => {
                    setPaginaActual(Math.min(totalPaginas, paginaSegura + 1));
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                  aria-label="Página siguiente"
                >
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Formulario Inquilino (Crear / Editar) */}
      {(modalMode === "crear" || modalMode === "editar") && (
        <InquilinoFormModal
          key={`${modalMode}-${inquilinoSeleccionado?.id ?? "nuevo"}`}
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setInquilinoSeleccionado(null);
          }}
          onSubmit={modalMode === "crear" ? handleCrear : handleEditar}
          initialData={modalMode === "editar" ? inquilinoSeleccionado : null}
          isLoading={isPending}
        />
      )}

      {/* Modal Detalle / Ficha Técnica */}
      <InquilinoDetalleModal
        isOpen={modalMode === "detalle" && !!inquilinoSeleccionado}
        inquilino={inquilinoSeleccionado}
        onClose={() => {
          setModalMode(null);
          setInquilinoSeleccionado(null);
        }}
        onEditar={() => setModalMode("editar")}
        onCrearContrato={() => {
          if (inquilinoSeleccionado) {
            router.push(`/admin/contratos?inquilinoId=${inquilinoSeleccionado.id}`);
          }
        }}
        isLoading={isLoadingDetalle}
      />

      {/* Modal Archivar Inquilino */}
      <Modal
        isOpen={modalMode === "archivar" || modalMode === "eliminar"}
        onClose={() => {
          setModalMode(null);
          setInquilinoSeleccionado(null);
        }}
        title="Archivar Inquilino"
        headerVariant="red"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Deseas archivar al inquilino{" "}
            <strong className="text-slate-900">
              {inquilinoSeleccionado?.nombre}{" "}
              {inquilinoSeleccionado?.apellido ? inquilinoSeleccionado.apellido : ""}
            </strong>{" "}
            ({inquilinoSeleccionado?.documentoIdentidad})?
          </p>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
            🛡️ <strong>Preservación contable:</strong> El inquilino se moverá a la pestaña de{" "}
            <strong>Archivados / Inactivos</strong>. Todo su historial contable (contratos, pagos, recibos) se
            mantendrá intacto e inalterable. Podrás reactivarlo en cualquier momento.
          </div>
          {inquilinoSeleccionado && inquilinoSeleccionado._count.contratos > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-900 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>⚠️</span>
                <span>
                  Este inquilino posee {inquilinoSeleccionado._count.contratos}{" "}
                  {inquilinoSeleccionado._count.contratos === 1 ? "alquiler vigente" : "alquileres vigentes"}:
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Al confirmar, el sistema <strong>rescindirá automáticamente sus contratos vigentes</strong>,{" "}
                <strong>liberará los espacios físicos a estado disponible</strong> y cancelará las cuotas
                futuras no devengadas. Todos los pagos ya realizados permanecerán protegidos e inalterables.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setModalMode(null);
                setInquilinoSeleccionado(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleArchivar}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : inquilinoSeleccionado && inquilinoSeleccionado._count.contratos > 0 ? (
                "Archivar y Rescindir Contratos"
              ) : (
                "Archivar Inquilino"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
