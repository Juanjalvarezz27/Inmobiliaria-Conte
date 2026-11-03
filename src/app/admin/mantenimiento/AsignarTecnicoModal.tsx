"use client";

import React, { useState, useMemo } from "react";
import {
  UserCheck,
  User,
  Phone,
  Briefcase,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { FormSectionHeader } from "@/components/ui/form-section-header";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { getAfinidadTecnico } from "@/lib/constants/mantenimiento";
import {
  asignarTecnicoAction,
  type TicketItem,
  type TecnicoDisponible,
} from "@/lib/actions/mantenimiento";

interface AsignarTecnicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
  tecnicos: TecnicoDisponible[];
  onSuccess: () => void;
}

const ITEMS_POR_PAGINA = 8;

export function AsignarTecnicoModal({
  isOpen,
  onClose,
  ticket,
  tecnicos,
  onSuccess,
}: AsignarTecnicoModalProps) {
  // Ordenar técnicos priorizando a los que coinciden con la especialidad del ticket
  const tecnicosOrdenados = useMemo(() => {
    return [...tecnicos].sort((a, b) => {
      const afinidadA = getAfinidadTecnico(a.cargo, ticket?.categoria);
      const afinidadB = getAfinidadTecnico(b.cargo, ticket?.categoria);

      // 1. Mayor afinidad a la categoría primero
      if (afinidadB.score !== afinidadA.score) {
        return afinidadB.score - afinidadA.score;
      }
      // 2. Menor carga de tickets activos
      if (a.ticketsActivosCount !== b.ticketsActivosCount) {
        return a.ticketsActivosCount - b.ticketsActivosCount;
      }
      // 3. Orden alfabético
      return a.nombre.localeCompare(b.nombre);
    });
  }, [tecnicos, ticket?.categoria]);

  const [empleadoId, setEmpleadoId] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [notasAdmin, setNotasAdmin] = useState<string>(ticket?.notasAdmin || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Al abrir el modal: si el ticket ya tiene un técnico asignado, se preselecciona; si está vacío, queda sin selección
  React.useEffect(() => {
    if (isOpen) {
      const idAsignado = ticket?.empleadoId || ticket?.empleado?.id || "";
      setEmpleadoId(idAsignado);
      setNotasAdmin(ticket?.notasAdmin || "");
      setBusqueda("");

      // Si ya tiene técnico asignado, posicionar la página donde se encuentra
      if (idAsignado) {
        const index = tecnicosOrdenados.findIndex((t) => t.id === idAsignado);
        if (index >= 0) {
          const pag = Math.floor(index / ITEMS_POR_PAGINA) + 1;
          setPaginaActual(pag);
        } else {
          setPaginaActual(1);
        }
      } else {
        setPaginaActual(1);
      }
    }
  }, [isOpen, ticket, tecnicosOrdenados]);

  // Filtrado reactivo en tiempo real sobre la lista ya ordenada por idoneidad
  const tecnicosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return tecnicosOrdenados;
    const q = busqueda.toLowerCase().trim();
    return tecnicosOrdenados.filter((tec) => {
      const nombreCompleto = `${tec.nombre} ${tec.apellido || ""}`.toLowerCase();
      const cargo = tec.cargo.replace(/_/g, " ").toLowerCase();
      const telefono = (tec.telefono || "").toLowerCase();
      return (
        nombreCompleto.includes(q) ||
        cargo.includes(q) ||
        telefono.includes(q)
      );
    });
  }, [tecnicosOrdenados, busqueda]);

  // Paginación local
  const totalItems = tecnicosFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const tecnicosPaginados = tecnicosFiltrados.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empleadoId) {
      toast.error("Por favor selecciona un técnico o empleado para asignar.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await asignarTecnicoAction(
        ticket.id,
        empleadoId,
        notasAdmin.trim() || undefined
      );

      if (res.success) {
        toast.success(
          "Técnico asignado exitosamente. Se ha notificado por correo institucional."
        );
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "No se pudo asignar el técnico.");
      }
    } catch (err) {
      console.error("Error al asignar técnico:", err);
      toast.error("Error inesperado al asignar el técnico.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ticket.empleadoId || ticket.empleado ? "Reasignar Técnico" : "Asignar Técnico"}
      icon={UserCheck}
      headerVariant="green"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resumen del Ticket */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs shrink-0">
              {ticket.codigo}
            </span>
            <p className="text-xs font-bold text-slate-800 line-clamp-1 flex-1">
              {ticket.titulo}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            {ticket.propiedad.nombre} •{" "}
            {ticket.unidad ? `Local ${ticket.unidad.codigo}` : "Áreas Comunes"}
          </p>
        </div>

        {/* Paso 1: Seleccionar Especialista */}
        <div className="space-y-3">
          <div>
            <FormSectionHeader
              step={1}
              title="Seleccionar Técnico o Empleado"
            />
            <p className="text-xs text-slate-500 mt-1">
              Elige al profesional calificado para atender y reparar esta incidencia.
            </p>
          </div>

          {/* Buscador de Personal Operativo */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Buscar por nombre, especialidad o teléfono..."
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setPaginaActual(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista Compacta de Especialistas */}
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {tecnicos.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No hay personal operativo activo registrado en el sistema.</span>
              </div>
            ) : tecnicosFiltrados.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
                <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No se encontraron especialistas</p>
                <p className="text-[11px] text-slate-500">
                  No hay resultados que coincidan con &ldquo;{busqueda}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setPaginaActual(1);
                  }}
                  className="text-xs font-bold text-[#175E38] hover:underline cursor-pointer pt-1"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              tecnicosPaginados.map((tec) => {
                const seleccionado = empleadoId === tec.id;

                return (
                  <label
                    key={tec.id}
                    className={`group flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                      seleccionado
                        ? "bg-emerald-50/70 border-[#175E38] shadow-2xs ring-1 ring-[#175E38]/20"
                        : "bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300"
                    }`}
                  >
                    {/* Indicador de Selección Tipo Radio Institucional alineado verticalmente */}
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          seleccionado
                            ? "border-[#175E38] bg-[#175E38]"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tecnicoId"
                          value={tec.id}
                          checked={seleccionado}
                          onChange={() => setEmpleadoId(tec.id)}
                          className="sr-only"
                        />
                        {seleccionado && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    {/* Contenido Completo del Técnico (Estructura en 2 filas limpias) */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Fila 1: Nombre + Conteo de Activos */}
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                            seleccionado
                              ? "text-[#175E38]"
                              : "text-slate-900 group-hover:text-black"
                          }`}
                        >
                          {tec.nombre} {tec.apellido || ""}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                              tec.ticketsActivosCount > 0
                                ? "bg-amber-50 text-amber-800 border-amber-200/80"
                                : "bg-slate-100 text-slate-600 border-slate-200/80"
                            }`}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>
                              {tec.ticketsActivosCount === 1
                                ? "1 activo"
                                : `${tec.ticketsActivosCount} activos`}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Fila 2: Especialidad y Teléfono completos sin cortes ni puntos suspensivos */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold uppercase tracking-wider text-[10.5px] text-slate-600 flex items-center gap-1 shrink-0">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{tec.cargo.replace(/_/g, " ")}</span>
                        </span>
                        {tec.telefono && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{tec.telefono}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Paginación Local Reutilizable */}
          {totalPaginas > 1 && (
            <div className="pt-1">
              <PaginacionLocal
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                totalItems={totalItems}
                indiceInicio={indiceInicio}
                itemsPorPagina={ITEMS_POR_PAGINA}
                itemLabel="especialistas"
                onCambiarPagina={(pag) => setPaginaActual(pag)}
              />
            </div>
          )}
        </div>

        {/* Paso 2: Instrucciones / Notas Administrativas */}
        <div>
          <FormSectionHeader
            step={2}
            title="Instrucciones al Técnico (Opcional)"
          />
          <p className="text-xs text-slate-500 mt-1">
            Indica detalles especiales, herramientas o presupuesto estimado.
          </p>

          <textarea
            value={notasAdmin}
            onChange={(e) => setNotasAdmin(e.target.value)}
            placeholder="Ej: Pasar primero por conserjería a recoger la llave de paso..."
            rows={2}
            disabled={isSubmitting}
            maxLength={350}
            className="w-full mt-2.5 p-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all placeholder:text-slate-400 resize-none"
          />
        </div>

        {/* Botones de Acción (Regla de oro: Grid 50/50 en móvil) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[110px] h-11 px-4 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:translate-y-0.5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !empleadoId}
            className="w-full sm:w-auto min-w-[180px] h-11 px-4 sm:px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white border-b-[3px] border-b-[#0e3a23] hover:brightness-105 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {ticket.empleadoId || ticket.empleado
                    ? "Guardar Reasignación"
                    : "Confirmar Asignación"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
