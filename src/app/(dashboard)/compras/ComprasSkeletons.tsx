import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/** Encabezado de página: overline, título y una acción, con la regla de base. */
function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/** Banda de cifras con la misma geometría que `Resumen`. */
function ResumenSkeleton() {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-card px-4 py-3.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-28" />
          <Skeleton className="mt-1.5 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ComprasPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <ResumenSkeleton />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-36" />
        ))}
      </div>
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}

export function CompraDetalleSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <HeaderSkeleton />
      <ResumenSkeleton />
      <TableSkeleton rows={5} cols={7} />
    </div>
  );
}
