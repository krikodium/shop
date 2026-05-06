import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NuevoProductoLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in duration-300 sm:px-6">
      <div className="flex justify-center sm:justify-start">
        <Skeleton className="h-10 w-28 rounded-md animate-skeleton-shimmer" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56 animate-skeleton-shimmer" />
        <Skeleton className="h-4 w-full max-w-md animate-skeleton-shimmer" />
      </div>

      <Card>
        <CardHeader className="space-y-2 pb-4">
          <Skeleton className="h-6 w-40 animate-skeleton-shimmer" />
          <Skeleton className="h-3 w-full max-w-sm animate-skeleton-shimmer" />
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Identificación */}
          <div className="space-y-4">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-14 animate-skeleton-shimmer" />
                  <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16 animate-skeleton-shimmer" />
                  <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
                </div>
              </div>
              <Skeleton className="h-36 w-36 shrink-0 rounded-xl animate-skeleton-shimmer lg:self-start" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 animate-skeleton-shimmer" />
              <Skeleton className="h-24 w-full animate-skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full max-w-md animate-skeleton-shimmer" />
            </div>
          </div>

          {/* Precios */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
          </div>

          {/* Imagen + stock row placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 animate-skeleton-shimmer" />
            <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
          </div>

          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-10 w-32 animate-skeleton-shimmer" />
            <Skeleton className="h-10 w-40 animate-skeleton-shimmer" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
