import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

/** Encabezado de panel en versión esqueleto (título + descripción). */
function CabeceraEsqueleto({ anchoTitulo = "w-32" }: { anchoTitulo?: string }) {
  return (
    <div className="space-y-1.5 border-b border-border px-4 py-3.5 sm:px-5">
      <Skeleton className={`h-4 ${anchoTitulo} animate-skeleton-shimmer`} />
      <Skeleton className="h-3 w-56 animate-skeleton-shimmer" />
    </div>
  );
}

function CampoEsqueleto({ anchoLabel = "w-20" }: { anchoLabel?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-3.5 ${anchoLabel} animate-skeleton-shimmer`} />
      <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
    </div>
  );
}

/**
 * Esqueleto con la forma real del formulario de productos: las mismas cuatro
 * secciones, en el mismo orden, con la misma cantidad de campos por fila.
 * Se usa en `productos/nuevo/loading.tsx` y mientras carga la edición.
 */
export function ProductoFormSkeleton() {
  return (
    <div className="max-w-3xl space-y-6" aria-hidden="true">
      {/* Identificación */}
      <Panel>
        <CabeceraEsqueleto anchoTitulo="w-28" />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoEsqueleto anchoLabel="w-10" />
            <CampoEsqueleto anchoLabel="w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 animate-skeleton-shimmer" />
            <Skeleton className="h-[88px] w-full animate-skeleton-shimmer" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoEsqueleto anchoLabel="w-20" />
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-3">
            <Skeleton className="size-24 shrink-0 animate-skeleton-shimmer" />
            <Skeleton className="h-3.5 w-56 animate-skeleton-shimmer" />
          </div>
        </div>
      </Panel>

      {/* Precios */}
      <Panel>
        <CabeceraEsqueleto anchoTitulo="w-16" />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoEsqueleto anchoLabel="w-28" />
            <CampoEsqueleto anchoLabel="w-28" />
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card px-4 py-3.5">
                <Skeleton className="h-2.5 w-20 animate-skeleton-shimmer" />
                <Skeleton className="mt-2.5 h-5 w-24 animate-skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Stock */}
      <Panel>
        <CabeceraEsqueleto anchoTitulo="w-14" />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoEsqueleto anchoLabel="w-24" />
            <CampoEsqueleto anchoLabel="w-24" />
          </div>
          <Skeleton className="h-3.5 w-3/4 animate-skeleton-shimmer" />
        </div>
      </Panel>

      {/* Proveedor */}
      <Panel>
        <CabeceraEsqueleto anchoTitulo="w-24" />
        <div className="space-y-4 p-4 sm:p-5">
          <Skeleton className="h-9 w-64 animate-skeleton-shimmer" />
          <Skeleton className="h-3.5 w-full max-w-md animate-skeleton-shimmer" />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoEsqueleto anchoLabel="w-20" />
            <CampoEsqueleto anchoLabel="w-28" />
          </div>
        </div>
      </Panel>

      <div className="flex gap-3 border-t border-border py-4">
        <Skeleton className="h-10 w-40 animate-skeleton-shimmer" />
      </div>
    </div>
  );
}
