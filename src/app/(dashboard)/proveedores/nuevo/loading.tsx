import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NuevoProveedorLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 animate-in fade-in duration-300 sm:px-6">
      <div className="flex justify-center sm:justify-start">
        <Skeleton className="h-10 w-32 rounded-md animate-skeleton-shimmer" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-52 animate-skeleton-shimmer" />
        <Skeleton className="h-4 w-full max-w-lg animate-skeleton-shimmer" />
      </div>

      <Card>
        <CardHeader className="space-y-2 pb-4">
          <Skeleton className="h-6 w-44 animate-skeleton-shimmer" />
          <Skeleton className="h-3 w-full max-w-sm animate-skeleton-shimmer" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-14 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2 pb-4">
          <Skeleton className="h-6 w-36 animate-skeleton-shimmer" />
          <Skeleton className="h-3 w-64 animate-skeleton-shimmer" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 animate-skeleton-shimmer" />
              <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 animate-skeleton-shimmer" />
            <Skeleton className="h-10 w-full animate-skeleton-shimmer" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Skeleton className="h-11 w-44 animate-skeleton-shimmer rounded-md" />
      </div>
    </div>
  );
}
