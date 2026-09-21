import { Skeleton } from "@/components/ui/skeleton";

/** Placeholders acordes a la pantalla: encabezado, banda de cifras y tres paneles con gráfico. */
export function EstadisticasVendedoresSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-28 animate-skeleton-shimmer rounded" />
          <Skeleton className="h-8 w-64 animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-4 w-80 max-w-full animate-skeleton-shimmer rounded" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-[180px] animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-9 w-[140px] animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-9 w-[96px] animate-skeleton-shimmer rounded-md" />
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card px-4 py-3.5">
            <Skeleton className="h-3 w-24 animate-skeleton-shimmer rounded" />
            <Skeleton className="mt-2 h-6 w-32 animate-skeleton-shimmer rounded" />
            <Skeleton className="mt-1.5 h-3 w-20 animate-skeleton-shimmer rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border">
            <div className="border-b border-border px-5 py-3.5">
              <Skeleton className="h-4 w-44 animate-skeleton-shimmer rounded" />
              <Skeleton className="mt-1.5 h-3 w-64 max-w-full animate-skeleton-shimmer rounded" />
            </div>
            <div className="p-5">
              <Skeleton className="h-[280px] w-full animate-skeleton-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-5 py-3.5">
          <Skeleton className="h-4 w-56 animate-skeleton-shimmer rounded" />
          <Skeleton className="mt-1.5 h-3 w-72 max-w-full animate-skeleton-shimmer rounded" />
        </div>
        <div className="p-5">
          <Skeleton className="h-[260px] w-full animate-skeleton-shimmer rounded" />
        </div>
      </div>
    </div>
  );
}
