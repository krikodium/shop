/** Esqueleto del panel de usuarios: barra de filtros + filas de tabla. */
export function UsuariosSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" aria-hidden="true">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="space-y-1.5">
          <div className="h-4 w-20 animate-skeleton-shimmer rounded" />
          <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-56 animate-skeleton-shimmer rounded-md" />
          <div className="h-10 w-40 animate-skeleton-shimmer rounded-md" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-40 max-w-full animate-skeleton-shimmer rounded" />
              <div className="h-3 w-56 max-w-full animate-skeleton-shimmer rounded" />
            </div>
            <div className="hidden h-5 w-16 animate-skeleton-shimmer rounded-full sm:block" />
            <div className="hidden h-4 w-24 animate-skeleton-shimmer rounded md:block" />
            <div className="hidden h-5 w-36 animate-skeleton-shimmer rounded md:block" />
            <div className="h-8 w-16 animate-skeleton-shimmer rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
