"use client";

import React, { useState, useTransition, useCallback } from "react";
import { Building2, Plus, MapPin, Store, RefreshCw, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { CentroComercialForm } from "./CentroComercialForm";
import { LocalForm } from "./LocalForm";
import {
  createCentroComercial,
  updateCentroComercial,
  deleteCentroComercial,
  toggleActivoCentroComercial,
  type CentroComercialInput,
} from "@/lib/actions/centros-comerciales";
import {
  createLocal,
  updateLocal,
  deleteLocal,
  cambiarEstadoLocal,
  type LocalInput,
} from "@/lib/actions/locales";
import { EstadoLocal } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CentroConConteo = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  descripcion: string | null;
  imagenUrl: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { locales: number };
};

type LocalConCentro = {
  id: string;
  codigo: string;
  piso: string | null;
  areaMt2: number | null;
  precioAlquiler: number | null;
  descripcion: string | null;
  estado: EstadoLocal;
  imagenes: string[];
  centroComercialId: string;
  createdAt: Date;
  updatedAt: Date;
  centroComercial: { nombre: string };
};

type Stats = {
  total: number;
  disponibles: number;
  ocupados: number;
  mantenimiento: number;
};

interface PropiedadesClientProps {
  centros: CentroConConteo[];
  locales: LocalConCentro[];
  stats: Stats;
}

type Tab = "centros" | "locales";
type ModalMode = "crear" | "editar" | "eliminar" | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const estadoBadgeVariant = (estado: EstadoLocal): "DISPONIBLE" | "OCUPADO" | "MANTENIMIENTO" | "INACTIVO" => {
  const map = {
    DISPONIBLE: "DISPONIBLE" as const,
    OCUPADO: "OCUPADO" as const,
    MANTENIMIENTO: "MANTENIMIENTO" as const,
    INACTIVO: "INACTIVO" as const,
  };
  return map[estado];
};

const estadoLabel = (estado: EstadoLocal): string => {
  const map: Record<EstadoLocal, string> = {
    DISPONIBLE: "Disponible",
    OCUPADO: "Ocupado",
    MANTENIMIENTO: "Mantenimiento",
    INACTIVO: "Inactivo",
  };
  return map[estado];
};

const formatCurrency = (val: number | null) => {
  if (val === null) return "—";
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(val);
};

// ─── Componente Principal ────────────────────────────────────────────────────

export function PropiedadesClient({ centros: initialCentros, locales: initialLocales, stats: initialStats }: PropiedadesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("centros");
  const [centros, setCentros] = useState(initialCentros);
  const [locales, setLocales] = useState(initialLocales);
  const [stats, setStats] = useState(initialStats);

  const [centroModal, setCentroModal] = useState<ModalMode>(null);
  const [centroSeleccionado, setCentroSeleccionado] = useState<CentroConConteo | null>(null);

  const [localModal, setLocalModal] = useState<ModalMode>(null);
  const [localSeleccionado, setLocalSeleccionado] = useState<LocalConCentro | null>(null);

  const [isPending, startTransition] = useTransition();

  const recalcStats = useCallback((updatedLocales: LocalConCentro[]) => {
    setStats({
      total: updatedLocales.length,
      disponibles: updatedLocales.filter((l) => l.estado === "DISPONIBLE").length,
      ocupados: updatedLocales.filter((l) => l.estado === "OCUPADO").length,
      mantenimiento: updatedLocales.filter((l) => l.estado === "MANTENIMIENTO").length,
    });
  }, []);

  // ─── Acciones CentroComercial ─────────────────────────────────────────────

  const handleCrearCentro = (data: CentroComercialInput) => {
    startTransition(async () => {
      try {
        const nuevo = await createCentroComercial(data);
        setCentros((prev) => [...prev, { ...nuevo, _count: { locales: 0 } }]);
        setCentroModal(null);
        toast.success("Centro comercial creado correctamente.");
      } catch {
        toast.error("No se pudo crear el centro comercial.");
      }
    });
  };

  const handleEditarCentro = (data: CentroComercialInput) => {
    if (!centroSeleccionado) return;
    startTransition(async () => {
      try {
        const actualizado = await updateCentroComercial(centroSeleccionado.id, data);
        setCentros((prev) =>
          prev.map((c) => (c.id === actualizado.id ? { ...actualizado, _count: c._count } : c))
        );
        setCentroModal(null);
        setCentroSeleccionado(null);
        toast.success("Centro comercial actualizado.");
      } catch {
        toast.error("No se pudo actualizar el centro comercial.");
      }
    });
  };

  const handleEliminarCentro = () => {
    if (!centroSeleccionado) return;
    startTransition(async () => {
      try {
        await deleteCentroComercial(centroSeleccionado.id);
        setCentros((prev) => prev.filter((c) => c.id !== centroSeleccionado.id));
        setCentroModal(null);
        setCentroSeleccionado(null);
        toast.success("Centro comercial eliminado.");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
        setCentroModal(null);
      }
    });
  };

  const handleToggleCentro = (centro: CentroConConteo) => {
    startTransition(async () => {
      try {
        await toggleActivoCentroComercial(centro.id, !centro.activo);
        setCentros((prev) => prev.map((c) => (c.id === centro.id ? { ...c, activo: !c.activo } : c)));
        toast.success(`Centro ${!centro.activo ? "activado" : "desactivado"}.`);
      } catch {
        toast.error("No se pudo cambiar el estado.");
      }
    });
  };

  // ─── Acciones Local ───────────────────────────────────────────────────────

  const handleCrearLocal = (data: LocalInput) => {
    startTransition(async () => {
      try {
        const nuevo = await createLocal(data);
        const centroNombre = centros.find((c) => c.id === nuevo.centroComercialId)?.nombre ?? "";
        const updatedLocales = [...locales, { ...nuevo, centroComercial: { nombre: centroNombre } }];
        setLocales(updatedLocales);
        recalcStats(updatedLocales);
        setCentros((prev) =>
          prev.map((c) => c.id === nuevo.centroComercialId ? { ...c, _count: { locales: c._count.locales + 1 } } : c)
        );
        setLocalModal(null);
        toast.success(`Local ${nuevo.codigo} creado correctamente.`);
      } catch {
        toast.error("No se pudo crear el local.");
      }
    });
  };

  const handleEditarLocal = (data: LocalInput) => {
    if (!localSeleccionado) return;
    startTransition(async () => {
      try {
        const actualizado = await updateLocal(localSeleccionado.id, data);
        const centroNombre = centros.find((c) => c.id === actualizado.centroComercialId)?.nombre ?? localSeleccionado.centroComercial.nombre;
        const updatedLocales = locales.map((l) =>
          l.id === actualizado.id ? { ...actualizado, centroComercial: { nombre: centroNombre } } : l
        );
        setLocales(updatedLocales);
        recalcStats(updatedLocales);
        setLocalModal(null);
        setLocalSeleccionado(null);
        toast.success(`Local ${actualizado.codigo} actualizado.`);
      } catch {
        toast.error("No se pudo actualizar el local.");
      }
    });
  };

  const handleEliminarLocal = () => {
    if (!localSeleccionado) return;
    startTransition(async () => {
      try {
        await deleteLocal(localSeleccionado.id);
        const updatedLocales = locales.filter((l) => l.id !== localSeleccionado.id);
        setLocales(updatedLocales);
        recalcStats(updatedLocales);
        setCentros((prev) =>
          prev.map((c) => c.id === localSeleccionado.centroComercialId
            ? { ...c, _count: { locales: Math.max(0, c._count.locales - 1) } }
            : c)
        );
        setLocalModal(null);
        setLocalSeleccionado(null);
        toast.success("Local eliminado.");
      } catch {
        toast.error("No se pudo eliminar el local.");
      }
    });
  };

  const handleCambiarEstado = (local: LocalConCentro, estado: EstadoLocal) => {
    startTransition(async () => {
      try {
        await cambiarEstadoLocal(local.id, estado);
        const updatedLocales = locales.map((l) => l.id === local.id ? { ...l, estado } : l);
        setLocales(updatedLocales);
        recalcStats(updatedLocales);
        toast.success(`Estado actualizado a "${estadoLabel(estado)}".`);
      } catch {
        toast.error("No se pudo actualizar el estado.");
      }
    });
  };

  // ─── Columnas DataTable ───────────────────────────────────────────────────

  const columnasCentros: ColumnDef<CentroConConteo>[] = [
    {
      key: "nombre",
      header: "Centro Comercial",
      accessor: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{row.nombre}</p>
            <p className="text-xs text-slate-500">{row.ciudad}</p>
          </div>
        </div>
      ),
    },
    {
      key: "direccion",
      header: "Dirección",
      accessor: (row) => (
        <span className="text-sm text-slate-600 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {row.direccion}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "_count",
      header: "Locales",
      accessor: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
          <Store className="w-3.5 h-3.5 text-slate-400" />
          {row._count.locales}
        </span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      accessor: (row) => (
        <Badge variant={row.activo ? "ACTIVO" : "INACTIVO"} dot>
          {row.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      accessor: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleToggleCentro(row)}
            disabled={isPending}
            title={row.activo ? "Desactivar" : "Activar"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {row.activo
              ? <ToggleRight className="w-4 h-4 text-emerald-600" />
              : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setCentroSeleccionado(row); setCentroModal("editar"); }}
            disabled={isPending}
            title="Editar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCentroSeleccionado(row); setCentroModal("eliminar"); }}
            disabled={isPending}
            title="Eliminar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const columnasLocales: ColumnDef<LocalConCentro>[] = [
    {
      key: "codigo",
      header: "Local",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.codigo}</p>
          {row.piso && <p className="text-xs text-slate-500">{row.piso}</p>}
        </div>
      ),
    },
    {
      key: "centroComercial",
      header: "Centro Comercial",
      accessor: (row) => (
        <span className="text-sm text-slate-600 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {row.centroComercial.nombre}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "areaMt2",
      header: "Área",
      accessor: (row) => <span className="text-sm text-slate-700">{row.areaMt2 ? `${row.areaMt2} m²` : "—"}</span>,
      hideOnMobile: true,
    },
    {
      key: "precioAlquiler",
      header: "Precio/mes",
      accessor: (row) => <span className="text-sm font-medium text-slate-800">{formatCurrency(row.precioAlquiler)}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={estadoBadgeVariant(row.estado)} dot size="sm">
            {estadoLabel(row.estado)}
          </Badge>
          {/* Menú cambio de estado */}
          <div className="relative group">
            <button className="text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors">
              ▾
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 hidden group-hover:block min-w-[140px]">
              {(["DISPONIBLE", "OCUPADO", "MANTENIMIENTO", "INACTIVO"] as EstadoLocal[]).map((e) => (
                <button
                  key={e}
                  onClick={() => handleCambiarEstado(row, e)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${row.estado === e ? "font-semibold text-slate-900" : "text-slate-600"}`}
                >
                  {estadoLabel(e)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "acciones",
      header: "",
      accessor: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => { setLocalSeleccionado(row); setLocalModal("editar"); }}
            disabled={isPending}
            title="Editar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setLocalSeleccionado(row); setLocalModal("eliminar"); }}
            disabled={isPending}
            title="Eliminar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <PageHeader
        title="Propiedades"
        description="Gestiona los centros comerciales y sus locales disponibles para arrendar."
        icon={<Building2 className="w-5 h-5" />}
        actions={
          activeTab === "centros" ? (
            <button
              id="btn-nuevo-centro"
              onClick={() => { setCentroSeleccionado(null); setCentroModal("crear"); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C2539] text-white text-sm font-semibold hover:bg-[#2a3550] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Centro
            </button>
          ) : (
            <button
              id="btn-nuevo-local"
              onClick={() => { setLocalSeleccionado(null); setLocalModal("crear"); }}
              disabled={centros.length === 0}
              title={centros.length === 0 ? "Primero crea un centro comercial" : ""}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C2539] text-white text-sm font-semibold hover:bg-[#2a3550] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Nuevo Local
            </button>
          )
        }
      />

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Locales", value: stats.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Disponibles", value: stats.disponibles, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Ocupados", value: stats.ocupados, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "Mantenimiento", value: stats.mantenimiento, color: "text-orange-700", bg: "bg-orange-50" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-white/60 shadow-xs`}>
            <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-heading ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["centros", "locales"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "centros" ? (
              <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />Centros ({centros.length})</span>
            ) : (
              <span className="flex items-center gap-2"><Store className="w-3.5 h-3.5" />Locales ({locales.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      {activeTab === "centros" ? (
        centros.length === 0 ? (
          <EmptyState
            icon="building"
            title="Sin centros comerciales"
            description="Aún no has registrado ningún centro comercial. Comienza agregando el primero."
            action={{
              label: "Agregar primer centro",
              onClick: () => { setCentroSeleccionado(null); setCentroModal("crear"); },
            }}
          />
        ) : (
          <DataTable
            data={centros}
            columns={columnasCentros}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Buscar centro comercial..."
            searchFilter={(item, q) => {
              const lq = q.toLowerCase();
              return (
                item.nombre.toLowerCase().includes(lq) ||
                item.ciudad.toLowerCase().includes(lq) ||
                item.direccion.toLowerCase().includes(lq)
              );
            }}
            pageSize={10}
          />
        )
      ) : (
        locales.length === 0 ? (
          <EmptyState
            icon="building"
            title={centros.length === 0 ? "Primero crea un centro comercial" : "Sin locales registrados"}
            description={
              centros.length === 0
                ? "Debes tener al menos un centro comercial antes de agregar locales."
                : "Agrega locales a tus centros comerciales para gestionarlos."
            }
            action={
              centros.length > 0
                ? { label: "Agregar primer local", onClick: () => { setLocalSeleccionado(null); setLocalModal("crear"); } }
                : { label: "Ir a Centros", onClick: () => setActiveTab("centros"), variant: "secondary" }
            }
          />
        ) : (
          <DataTable
            data={locales}
            columns={columnasLocales}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Buscar local por código..."
            searchFilter={(item, q) => {
              const lq = q.toLowerCase();
              return (
                item.codigo.toLowerCase().includes(lq) ||
                item.centroComercial.nombre.toLowerCase().includes(lq) ||
                (item.piso?.toLowerCase().includes(lq) ?? false)
              );
            }}
            pageSize={15}
          />
        )
      )}

      {/* ─── Modals de Centro Comercial ─── */}
      <Modal
        isOpen={centroModal === "crear" || centroModal === "editar"}
        onClose={() => { setCentroModal(null); setCentroSeleccionado(null); }}
        title={centroModal === "crear" ? "Nuevo Centro Comercial" : "Editar Centro Comercial"}
        headerVariant="green"
      >
        <CentroComercialForm
          initialData={centroSeleccionado ?? undefined}
          onSubmit={centroModal === "crear" ? handleCrearCentro : handleEditarCentro}
          onCancel={() => { setCentroModal(null); setCentroSeleccionado(null); }}
          isLoading={isPending}
        />
      </Modal>

      <Modal
        isOpen={centroModal === "eliminar"}
        onClose={() => { setCentroModal(null); setCentroSeleccionado(null); }}
        title="Eliminar Centro Comercial"
        headerVariant="red"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar{" "}
            <strong className="text-slate-900">{centroSeleccionado?.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          {centroSeleccionado && centroSeleccionado._count.locales > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              ⚠️ Este centro tiene <strong>{centroSeleccionado._count.locales}</strong> local(es). Debes eliminarlos primero.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setCentroModal(null); setCentroSeleccionado(null); }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleEliminarCentro}
              disabled={isPending || (centroSeleccionado?._count.locales ?? 0) > 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Modals de Local ─── */}
      <Modal
        isOpen={localModal === "crear" || localModal === "editar"}
        onClose={() => { setLocalModal(null); setLocalSeleccionado(null); }}
        title={localModal === "crear" ? "Nuevo Local" : "Editar Local"}
        headerVariant="green"
      >
        <LocalForm
          centros={centros}
          initialData={localSeleccionado ?? undefined}
          onSubmit={localModal === "crear" ? handleCrearLocal : handleEditarLocal}
          onCancel={() => { setLocalModal(null); setLocalSeleccionado(null); }}
          isLoading={isPending}
        />
      </Modal>

      <Modal
        isOpen={localModal === "eliminar"}
        onClose={() => { setLocalModal(null); setLocalSeleccionado(null); }}
        title="Eliminar Local"
        headerVariant="red"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar el local{" "}
            <strong className="text-slate-900">{localSeleccionado?.codigo}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setLocalModal(null); setLocalSeleccionado(null); }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleEliminarLocal}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
