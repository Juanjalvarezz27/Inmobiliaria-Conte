"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { EmpleadoTareaCard } from "./EmpleadoTareaCard";
import { TareaFichaModal } from "./TareaFichaModal";
import { TareaFinalizarModal } from "./TareaFinalizarModal";
import type { PortalEmpleadoData } from "@/lib/actions/personal-portal";
import { EstadoTarea } from "@prisma/client";

interface Props {
  initialTareas: PortalEmpleadoData["tareas"];
  empleadoNombre: string;
}

type FiltroEstado = "PENDIENTES" | "COMPLETADAS";

export function EmpleadoTareasClient({ initialTareas, empleadoNombre }: Props) {
  const [tareas, setTareas] = useState(initialTareas);
  const [filtro, setFiltro] = useState<FiltroEstado>("PENDIENTES");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [tareaACompletar, setTareaACompletar] = useState<PortalEmpleadoData["tareas"][0] | null>(null);
  const [tareaFicha, setTareaFicha] = useState<PortalEmpleadoData["tareas"][0] | null>(null);
  const [visorUrl, setVisorUrl] = useState<string | null>(null);

  // Filtrado reactivo
  const tareasFiltradas = tareas.filter((t) => {
    if (filtro === "PENDIENTES" && t.estado === EstadoTarea.COMPLETADA) return false;
    if (filtro === "COMPLETADAS" && t.estado !== EstadoTarea.COMPLETADA) return false;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const coincideTitulo = t.titulo.toLowerCase().includes(q);
      const coincideDesc = t.descripcion?.toLowerCase().includes(q) || false;
      const coincideLugar = t.propiedadNombre?.toLowerCase().includes(q) || false;
      return coincideTitulo || coincideDesc || coincideLugar;
    }

    return true;
  });

  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 18;

  useEffect(() => {
    setPaginaActual(1);
  }, [filtro, busqueda]);

  const totalPaginas = Math.ceil(tareasFiltradas.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const tareasPaginadas = tareasFiltradas.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  const countPendientes = tareas.filter((t) => t.estado !== EstadoTarea.COMPLETADA).length;
  const countCompletadas = tareas.filter((t) => t.estado === EstadoTarea.COMPLETADA).length;

  const handleTareaCompletada = (tareaActualizada: PortalEmpleadoData["tareas"][0]) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === tareaActualizada.id ? tareaActualizada : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <PageHeader
        title="Mis Órdenes de Trabajo"
        description={`Panel de asignaciones operativas y comprobantes fotográficos • ${empleadoNombre}`}
        badge={
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              countPendientes > 0
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            {countPendientes} pendientes
          </span>
        }
      />

      {/* Tarjetas Estadísticas Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <StatCard
          title="Pendientes por Hacer"
          value={countPendientes}
          icon={Clock}
          color="amber"
          subtitle="Revisión o ejecución"
          className="shadow-2xs"
        />
        <StatCard
          title="Completadas"
          value={countCompletadas}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Finalizadas con éxito"
          className="shadow-2xs"
        />
        <StatCard
          title="Total Asignadas"
          value={tareas.length}
          icon={CheckSquare}
          color="navy"
          subtitle="Órdenes de trabajo"
          className="shadow-2xs"
        />
      </div>

      {/* Toolbar Institucional: Buscador y Píldoras de Filtro */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por labor, descripción o inmueble..."
            className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 md:flex md:items-center gap-1 p-1 bg-slate-100/80 rounded-xl w-full md:w-auto">
          {[
            { id: "PENDIENTES", label: "Pendientes", count: countPendientes },
            { id: "COMPLETADAS", label: "Completadas", count: countCompletadas },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFiltro(item.id as FiltroEstado)}
              className={`h-9 md:h-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                filtro === item.id
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  filtro === item.id
                    ? "bg-[#1C2539] text-white"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Órdenes de Trabajo */}
      {tareasFiltradas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#175E38] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h3 className="font-heading font-black text-slate-900 text-lg">
            {filtro === "PENDIENTES"
              ? "¡No tienes labores pendientes!"
              : "Sin labores completadas"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {filtro === "PENDIENTES"
              ? "Todo tu trabajo asignado se encuentra al día. Las nuevas asignaciones aparecerán automáticamente aquí."
              : "Aún no has finalizado órdenes de trabajo."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tareasPaginadas.map((tarea) => (
              <EmpleadoTareaCard
                key={tarea.id}
                tarea={tarea}
                onCompletar={(t) => setTareaACompletar(t)}
                onVerFicha={(t) => setTareaFicha(t)}
              />
            ))}
          </div>

          <PaginacionLocal
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalItems={tareasFiltradas.length}
            indiceInicio={indiceInicio}
            itemsPorPagina={ITEMS_POR_PAGINA}
            itemLabel="tareas"
            onCambiarPagina={(pag) => setPaginaActual(pag)}
          />
        </div>
      )}

      {/* Modal Institucional de Finalización de Tarea */}
      <TareaFinalizarModal
        tarea={tareaACompletar}
        empleadoNombre={empleadoNombre}
        onClose={() => setTareaACompletar(null)}
        onSuccess={handleTareaCompletada}
        onVerImagen={(url) => setVisorUrl(url)}
      />

      {/* Modal de Ficha Técnica / Vista Previa (Fotos bajo demanda) */}
      <TareaFichaModal
        tarea={tareaFicha}
        empleadoNombre={empleadoNombre}
        onClose={() => setTareaFicha(null)}
        onCompletar={(t) => setTareaACompletar(t)}
        onVerImagen={(url) => setVisorUrl(url)}
      />

      {/* Visor modal de fotografía a pantalla completa */}
      <ImageViewerModal
        isOpen={!!visorUrl}
        onClose={() => setVisorUrl(null)}
        images={visorUrl ? [visorUrl] : []}
        title="Evidencia de Labor"
      />
    </div>
  );
}
