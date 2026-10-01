"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  X,
  Table as TableIcon,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "./skeleton";
import { EmptyState } from "./empty-state";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  accessor?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortKey?: (item: T) => string | number | Date | boolean | null | undefined;
  align?: "left" | "center" | "right";
  className?: string;
  hideOnMobile?: boolean;
  // Etiqueta opcional para la tarjeta móvil (si difiere del header)
  mobileLabel?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  /**
   * "auto"  (default): CSS controla la vista — tarjetas en móvil, tabla en desktop.
   *                     El usuario puede forzar una vista con el toggle.
   * "table":  siempre tabla (scroll horizontal en móvil).
   * "cards":  siempre tarjetas.
   */
  mobileLayout?: "auto" | "table" | "cards";
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

// El estado "viewOverride" solo se activa cuando el usuario presiona el toggle.
// "auto" significa que CSS decide (ningún override).
type ViewOverride = "auto" | "table" | "cards";

interface PaginationBarProps {
  border?: boolean;
  startRecord: number;
  endRecord: number;
  totalItems: number;
  validCurrentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (updater: (p: number) => number) => void;
  onPageSizeChange: (size: number) => void;
}

function PaginationBar({
  border = true,
  startRecord,
  endRecord,
  totalItems,
  validCurrentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  return (
    <div
      className={`px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white ${
        border ? "border-t border-slate-200/90" : "rounded-2xl border border-slate-200/80 shadow-2xs"
      }`}
    >
      <div className="flex items-center gap-3 text-xs text-slate-500 order-2 sm:order-1">
        <span>
          Mostrando{" "}
          <strong className="text-slate-800">{startRecord}</strong>–
          <strong className="text-slate-800">{endRecord}</strong> de{" "}
          <strong className="text-slate-800">{totalItems}</strong>
        </span>
        {pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="hidden sm:inline">Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="bg-slate-50 hover:bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-800 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          type="button"
          disabled={validCurrentPage <= 1}
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>
        <div className="px-2 text-xs font-semibold text-slate-700">
          {validCurrentPage} / {totalPages}
        </div>
        <button
          type="button"
          disabled={validCurrentPage >= totalPages}
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  title,
  subtitle,
  isLoading = false,
  searchable = true,
  searchPlaceholder = "Buscar...",
  searchFilter,
  filterSlot,
  actionSlot,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  emptyState,
  onRowClick,
  mobileLayout = "auto",
  renderMobileCard,
  className = "",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumnKey, setSortColumnKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Override manual por parte del usuario. "auto" = deja que CSS decida.
  const [viewOverride, setViewOverride] = useState<ViewOverride>("auto");

  // Filtrado
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase().trim();
    if (searchFilter) return data.filter((item) => searchFilter(item, query));
    return data.filter((item) =>
      Object.values(item as Record<string, unknown>).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchFilter]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    if (!sortColumnKey) return filteredData;
    const column = columns.find((col) => col.key === sortColumnKey);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA: unknown;
      let valB: unknown;
      if (column.sortKey) {
        valA = column.sortKey(a);
        valB = column.sortKey(b);
      } else {
        valA = (a as Record<string, unknown>)[column.key];
        valB = (b as Record<string, unknown>)[column.key];
      }
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === "asc"
        ? (valA as number) > (valB as number) ? 1 : -1
        : (valA as number) < (valB as number) ? 1 : -1;
    });
  }, [filteredData, sortColumnKey, sortDirection, columns]);

  // Paginación
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  const handleSort = (columnKey: string) => {
    if (sortColumnKey === columnKey) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumnKey(null); setSortDirection("asc"); }
    } else {
      setSortColumnKey(columnKey);
      setSortDirection("asc");
    }
  };

  const startRecord = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, totalItems);

  // ─── Clases de visibilidad SSR-safe ──────────────────────────────────────────
  // Nunca hay condicional `if (window)`. Solo strings de clase que el servidor
  // y el cliente renderizan de forma idéntica. CSS hace la diferencia.
  const getCardsClass = (): string => {
    if (mobileLayout === "cards") return "block"; // siempre tarjetas
    if (mobileLayout === "table") return "hidden"; // nunca tarjetas
    // mobileLayout === "auto"
    if (viewOverride === "cards") return "block";   // usuario forzó tarjetas
    if (viewOverride === "table") return "hidden";  // usuario forzó tabla
    return "block sm:hidden";                        // CSS: tarjetas solo en móvil
  };

  const getTableClass = (): string => {
    if (mobileLayout === "table") return "block"; // siempre tabla
    if (mobileLayout === "cards") return "hidden"; // nunca tabla
    // mobileLayout === "auto"
    if (viewOverride === "table") return "block";  // usuario forzó tabla
    if (viewOverride === "cards") return "hidden"; // usuario forzó tarjetas
    return "hidden sm:block";                       // CSS: tabla solo en desktop
  };

  // Estado activo del toggle (lo que CSS mostraría en móvil)
  const toggleActive: "table" | "cards" =
    viewOverride === "table" ? "table" : "cards";

  // ─── Render tarjeta móvil mejorada ──────────────────────────────────────────
  const defaultRenderMobileCard = (item: T, index: number) => {
    const primaryCol = columns.find((c) => c.key !== "acciones");
    const otherCols = columns.filter(
      (c) => c !== primaryCol && c.key !== "acciones"
    );
    const actionsCol = columns.find((c) => c.key === "acciones");

    return (
      <div
        key={keyExtractor(item, index)}
        onClick={() => onRowClick && onRowClick(item)}
        className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all ${
          onRowClick
            ? "cursor-pointer active:scale-[0.995] hover:border-slate-300 hover:shadow-sm"
            : ""
        }`}
      >
        {/* Cabecera de tarjeta: campo principal + acciones */}
        {primaryCol && (
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm leading-snug">
                  {primaryCol.accessor
                    ? primaryCol.accessor(item, index)
                    : String((item as Record<string, unknown>)[primaryCol.key] ?? "-")}
                </div>
              </div>
              {actionsCol && actionsCol.accessor && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {actionsCol.accessor(item, index)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pares clave-valor en grid 2 columnas */}
        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {otherCols.map((col) => {
            const label =
              col.mobileLabel ??
              (typeof col.header === "string" ? col.header : col.key);
            return (
              <div key={col.key} className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {label}
                </span>
                <span className="text-xs text-slate-800 font-medium leading-snug">
                  {col.accessor
                    ? col.accessor(item, index)
                    : String((item as Record<string, unknown>)[col.key] ?? "-")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Props comunes de paginación para reutilizar en ambas vistas
  const paginationProps = {
    startRecord,
    endRecord,
    totalItems,
    validCurrentPage,
    totalPages,
    pageSize,
    pageSizeOptions,
    onPageChange: setCurrentPage,
    onPageSizeChange: (size: number) => { setPageSize(size); setCurrentPage(1); },
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* ── Barra de Título, Búsqueda y Filtros ── */}
      {(title || subtitle || searchable || filterSlot || actionSlot) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {(title || subtitle) && (
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                )}
              </div>
            )}
            {actionSlot && <div className="shrink-0">{actionSlot}</div>}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-1 items-center gap-2">
              {searchable && (
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              {filterSlot}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {totalItems} {totalItems === 1 ? "registro" : "registros"}
              </span>

              {/* Toggle vista — solo visible en móvil cuando mobileLayout="auto".
                  Se renderiza en el HTML siempre (SSR-safe); CSS lo oculta en desktop. */}
              {mobileLayout === "auto" && (
                <div className="sm:hidden inline-flex p-0.5 rounded-lg border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() =>
                      setViewOverride(
                        toggleActive === "table" ? "auto" : "table"
                      )
                    }
                    aria-label="Ver como tabla"
                    aria-pressed={toggleActive === "table"}
                    className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                      toggleActive === "table"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewOverride("auto")}
                    aria-label="Ver como tarjetas"
                    aria-pressed={toggleActive === "cards"}
                    className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                      toggleActive === "cards"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cuerpo Principal ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Skeleton tabla en desktop */}
          <div className="hidden sm:block space-y-3">
            {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
          {/* Skeleton tarjetas en móvil */}
          <div className="sm:hidden space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
          {emptyState || (
            <EmptyState
              icon="search"
              title={
                searchQuery
                  ? "Sin resultados para tu búsqueda"
                  : "No hay registros disponibles"
              }
              description={
                searchQuery
                  ? `No se encontraron coincidencias para "${searchQuery}". Intenta con otros términos.`
                  : "Aún no se han agregado elementos en este módulo."
              }
              action={
                searchQuery
                  ? {
                      label: "Limpiar búsqueda",
                      onClick: () => setSearchQuery(""),
                      variant: "secondary",
                    }
                  : undefined
              }
              compact
            />
          )}
        </div>
      ) : (
        <>
          {/* ══ VISTA TARJETAS ══
              Siempre presente en el DOM. CSS controla si se ve:
              - mobileLayout="auto": "block sm:hidden" (visible solo en móvil)
              - Override de usuario o mobileLayout="cards": "block"
              - mobileLayout="table": "hidden" */}
          <div className={getCardsClass()}>
            <div className="space-y-3">
              {paginatedData.map((item, index) =>
                renderMobileCard
                  ? renderMobileCard(item, index)
                  : defaultRenderMobileCard(item, index)
              )}
            </div>
            {/* Paginación de tarjetas */}
            <div className="mt-3">
              <PaginationBar border={false} {...paginationProps} />
            </div>
          </div>

          {/* ══ VISTA TABLA ══
              Siempre presente en el DOM. CSS controla si se ve:
              - mobileLayout="auto": "hidden sm:block" (visible solo en desktop)
              - Override de usuario o mobileLayout="table": "block"
              - mobileLayout="cards": "hidden" */}
          <div className={getTableClass()}>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[11px] tracking-wider select-none">
                      {columns.map((col) => {
                        const isSorted = sortColumnKey === col.key;
                        const alignClass =
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : "text-left";
                        return (
                          <th
                            key={col.key}
                            scope="col"
                            onClick={() => col.sortable && handleSort(col.key)}
                            className={`py-3.5 px-4 font-bold ${alignClass} ${
                              col.className || ""
                            } ${
                              col.sortable
                                ? "cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                : ""
                            }`}
                          >
                            <div
                              className={`inline-flex items-center gap-1.5 ${
                                col.align === "right"
                                  ? "justify-end"
                                  : col.align === "center"
                                  ? "justify-center"
                                  : "justify-start"
                              }`}
                            >
                              <span>{col.header}</span>
                              {col.sortable && (
                                <span className="text-slate-400">
                                  {isSorted ? (
                                    sortDirection === "asc" ? (
                                      <ArrowUp className="w-3 h-3 text-slate-900 stroke-[2.5]" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3 text-slate-900 stroke-[2.5]" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                  )}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedData.map((item, index) => {
                      const rowKey = keyExtractor(item, index);
                      return (
                        <tr
                          key={rowKey}
                          onClick={() => onRowClick && onRowClick(item)}
                          className={`transition-colors ${
                            onRowClick
                              ? "cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/70"
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          {columns.map((col) => {
                            const alignClass =
                              col.align === "center"
                                ? "text-center"
                                : col.align === "right"
                                ? "text-right"
                                : "text-left";
                            return (
                              <td
                                key={col.key}
                                className={`py-3 px-4 align-middle ${alignClass} ${
                                  col.className || ""
                                }`}
                              >
                                {col.accessor
                                  ? col.accessor(item, index)
                                  : String(
                                      (item as Record<string, unknown>)[
                                        col.key
                                      ] ?? "-"
                                    )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar {...paginationProps} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
