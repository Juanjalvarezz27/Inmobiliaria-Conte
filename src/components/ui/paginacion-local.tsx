import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginacionLocalProps {
  paginaActual: number;
  totalPaginas: number;
  totalItems: number;
  indiceInicio: number;
  itemsPorPagina: number;
  itemLabel?: string;
  onCambiarPagina: (pag: number) => void;
}

// Componente de paginación local reutilizable con elipses institucionales
export function PaginacionLocal({
  paginaActual,
  totalPaginas,
  totalItems,
  indiceInicio,
  itemsPorPagina,
  itemLabel = "elementos",
  onCambiarPagina,
}: PaginacionLocalProps) {
  if (totalPaginas <= 1) return null;

  const obtenerPaginasVisibles = () => {
    if (totalPaginas <= 5) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    if (paginaActual <= 3) {
      return [1, 2, 3, 4, "...", totalPaginas];
    }
    if (paginaActual >= totalPaginas - 2) {
      return [1, "...", totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
    }
    return [1, "...", paginaActual - 1, paginaActual, paginaActual + 1, "...", totalPaginas];
  };

  const paginas = obtenerPaginasVisibles();

  return (
    <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
      <span className="text-slate-500 text-[11px]">
        Mostrando <strong className="text-slate-800 font-bold">{indiceInicio + 1}</strong> a{" "}
        <strong className="text-slate-800 font-bold">
          {Math.min(indiceInicio + itemsPorPagina, totalItems)}
        </strong>{" "}
        de <strong className="text-slate-800 font-bold">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onCambiarPagina(Math.max(1, paginaActual - 1))}
          disabled={paginaActual === 1}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-bold text-xs shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="flex items-center gap-1">
          {paginas.map((p, idx) =>
            typeof p === "number" ? (
              <button
                key={idx}
                type="button"
                onClick={() => onCambiarPagina(p)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paginaActual === p
                    ? "bg-[#175E38] text-white shadow-2xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="px-1 text-slate-400 font-black">
                {p}
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onCambiarPagina(Math.min(totalPaginas, paginaActual + 1))}
          disabled={paginaActual === totalPaginas}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-bold text-xs shadow-2xs cursor-pointer"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
