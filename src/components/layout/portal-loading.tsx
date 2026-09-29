import { Skeleton } from "@/components/ui/skeleton";

export function PortalLoading() {
  return (
    <div className="space-y-6 w-full animate-fadeIn" aria-label="Cargando contenido">
      {/* Cabecera Esqueleto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-48 sm:w-64 h-6 rounded-lg" />
              <Skeleton className="w-24 h-5 rounded-full" />
            </div>
            <Skeleton className="w-60 sm:w-96 h-4 rounded-md" />
          </div>
        </div>
        <Skeleton className="w-32 h-9 rounded-xl self-start sm:self-center" />
      </div>

      {/* Tarjeta de Contenido Esqueleto */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="w-56 h-4 rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-4/5 h-3.5 rounded-md" />
              <Skeleton className="w-3/5 h-3 rounded-md" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-3/4 h-3.5 rounded-md" />
              <Skeleton className="w-2/4 h-3 rounded-md" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-5/6 h-3.5 rounded-md" />
              <Skeleton className="w-1/2 h-3 rounded-md" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-4/5 h-3.5 rounded-md" />
              <Skeleton className="w-3/5 h-3 rounded-md" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center gap-2.5">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="w-72 h-3.5 rounded-md" />
        </div>
      </div>
    </div>
  );
}
