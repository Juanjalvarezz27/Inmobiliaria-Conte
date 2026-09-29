import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col font-sans bg-slate-100">
      {/* Indicador de actividad superior con acento de marca */}
      <div className="h-1 w-full bg-slate-200/70 overflow-hidden">
        <div className="h-full w-2/5 bg-conte-green animate-pulse rounded-full" />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        {/* Tarjeta de carga universal */}
        <div className="w-full max-w-lg bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-300/40 border border-slate-200/80 space-y-6">
          {/* Identidad institucional simulada */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-44 h-5" />
              <Skeleton className="w-28 h-3.5" />
            </div>
          </div>

          {/* Estructura de contenido esquelético */}
          <div className="space-y-4">
            <Skeleton className="w-full h-11 rounded-xl" />
            <Skeleton className="w-full h-11 rounded-xl" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          </div>

          {/* Pie de carga con acción simulada */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-28 h-8 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
