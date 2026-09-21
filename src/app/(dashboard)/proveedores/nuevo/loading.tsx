import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto del alta: misma estructura que el formulario (paneles planos). */
function PanelEsqueleto({ campos }: { campos: number }) {
  return (
    <Panel>
      <div className="space-y-1.5 border-b border-border px-4 py-3.5 sm:px-5">
        <Skeleton className="h-4 w-32 animate-skeleton-shimmer" />
        <Skeleton className="h-3 w-56 animate-skeleton-shimmer" />
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {Array.from({ length: campos }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20 animate-skeleton-shimmer" />
            <Skeleton className="h-9 w-full animate-skeleton-shimmer" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function NuevoProveedorLoading() {
  return (
    <div className="max-w-3xl space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-28 rounded-md animate-skeleton-shimmer" />
      <div className="space-y-2 border-b pb-5">
        <Skeleton className="h-3 w-40 animate-skeleton-shimmer" />
        <Skeleton className="h-8 w-56 animate-skeleton-shimmer" />
        <Skeleton className="h-4 w-full max-w-md animate-skeleton-shimmer" />
      </div>
      <PanelEsqueleto campos={2} />
      <PanelEsqueleto campos={4} />
    </div>
  );
}
