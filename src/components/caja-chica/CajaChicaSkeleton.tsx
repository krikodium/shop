import { Skeleton } from "@/components/ui/skeleton";

export function CajaChicaSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-in fade-in duration-300">
      <div className="rounded-xl border bg-card/70 px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 animate-skeleton-shimmer rounded-md" />
            <Skeleton className="h-4 w-full max-w-md animate-skeleton-shimmer rounded" />
          </div>
          <Skeleton className="h-10 w-full animate-skeleton-shimmer rounded-lg sm:w-[220px]" />
        </div>
      </div>
      <Skeleton className="h-16 w-full animate-skeleton-shimmer rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 animate-skeleton-shimmer rounded-xl" />
        <Skeleton className="h-32 animate-skeleton-shimmer rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full animate-skeleton-shimmer rounded-xl" />
      <Skeleton className="h-72 w-full animate-skeleton-shimmer rounded-xl" />
    </div>
  );
}
