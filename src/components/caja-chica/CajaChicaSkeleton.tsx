import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder acorde a la pantalla: turno, fila de saldos, movimiento, libro y cierre mensual. */
export function CajaChicaSkeleton({
  conEncabezado = true,
}: {
  /** En la página el encabezado real ya está visible: solo va el cuerpo. */
  conEncabezado?: boolean;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {conEncabezado && (
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 animate-skeleton-shimmer rounded" />
          <Skeleton className="h-8 w-44 animate-skeleton-shimmer rounded-md" />
          <Skeleton className="h-4 w-72 animate-skeleton-shimmer rounded" />
        </div>
        <Skeleton className="h-9 w-48 animate-skeleton-shimmer rounded-lg" />
      </div>
      )}
      <Skeleton className="h-12 w-full animate-skeleton-shimmer rounded-lg" />
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card px-4 py-3.5">
            <Skeleton className="h-3 w-20 animate-skeleton-shimmer rounded" />
            <Skeleton className="mt-2 h-6 w-32 animate-skeleton-shimmer rounded" />
            <Skeleton className="mt-1.5 h-3 w-24 animate-skeleton-shimmer rounded" />
          </div>
        ))}
      </div>
      <Skeleton className="h-40 w-full animate-skeleton-shimmer rounded-lg" />
      <Skeleton className="h-56 w-full animate-skeleton-shimmer rounded-lg" />
    </div>
  );
}
