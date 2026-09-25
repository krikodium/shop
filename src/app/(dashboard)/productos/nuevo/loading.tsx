import { Skeleton } from "@/components/ui/skeleton";
import { ProductoFormSkeleton } from "@/components/productos/ProductoFormSkeleton";

/**
 * Esqueleto del alta: la página a ancho completo y el formulario con su forma
 * real (Identificación, Precios, Stock, Proveedor) en `max-w-3xl`.
 */
export default function NuevoProductoLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-28 rounded-md animate-skeleton-shimmer" />
      <div className="space-y-2 border-b pb-5">
        <Skeleton className="h-3 w-40 animate-skeleton-shimmer" />
        <Skeleton className="h-8 w-56 animate-skeleton-shimmer" />
        <Skeleton className="h-4 w-full max-w-md animate-skeleton-shimmer" />
      </div>
      <ProductoFormSkeleton />
    </div>
  );
}
