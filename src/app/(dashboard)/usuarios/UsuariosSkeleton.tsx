import { Skeleton } from "@/components/ui/skeleton";

export function UsuariosSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-xl border bg-card/70 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 animate-skeleton-shimmer rounded-md" />
            <Skeleton className="h-4 w-72 max-w-full animate-skeleton-shimmer rounded" />
          </div>
          <Skeleton className="h-11 w-44 animate-skeleton-shimmer rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full max-w-md animate-skeleton-shimmer rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-[160px] animate-skeleton-shimmer rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="flex gap-4">
              <Skeleton className="h-14 w-14 shrink-0 rounded-full animate-skeleton-shimmer" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-[55%] max-w-[180px] animate-skeleton-shimmer rounded" />
                <Skeleton className="h-4 w-full animate-skeleton-shimmer rounded" />
                <Skeleton className="h-4 w-24 animate-skeleton-shimmer rounded" />
              </div>
            </div>
            <Skeleton className="mt-4 h-9 w-full animate-skeleton-shimmer rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
