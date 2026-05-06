import { Skeleton } from "@/components/ui/skeleton";

/** Placeholders: cabecera, KPIs, tres gráficos (sin cards por vendedor). */
export function EstadisticasVendedoresSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-64 animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-4 w-full max-w-md animate-skeleton-shimmer rounded" />
          <Skeleton className="h-4 w-52 animate-skeleton-shimmer rounded" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-[140px] animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-10 w-[100px] animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-10 w-[180px] animate-skeleton-shimmer rounded-md" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28 animate-skeleton-shimmer rounded" />
              <Skeleton className="h-5 w-5 animate-skeleton-shimmer rounded" />
            </div>
            <Skeleton className="mt-3 h-9 w-32 animate-skeleton-shimmer rounded" />
            <Skeleton className="mt-2 h-3 w-24 animate-skeleton-shimmer rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="h-6 w-48 animate-skeleton-shimmer rounded" />
          <Skeleton className="mt-2 h-4 w-72 animate-skeleton-shimmer rounded" />
          <Skeleton className="mt-6 h-[280px] w-full animate-skeleton-shimmer rounded-lg" />
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="h-6 w-52 animate-skeleton-shimmer rounded" />
          <Skeleton className="mt-2 h-4 w-64 animate-skeleton-shimmer rounded" />
          <Skeleton className="mt-6 h-[280px] w-full animate-skeleton-shimmer rounded-lg" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <Skeleton className="h-6 w-56 animate-skeleton-shimmer rounded" />
        <Skeleton className="mt-2 h-4 w-80 animate-skeleton-shimmer rounded" />
        <Skeleton className="mt-6 h-[260px] w-full animate-skeleton-shimmer rounded-lg" />
      </div>
    </div>
  );
}
