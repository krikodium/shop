import { UsuariosSkeleton } from "./UsuariosSkeleton";

export default function UsuariosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-skeleton-shimmer rounded" />
          <div className="h-8 w-36 animate-skeleton-shimmer rounded-md" />
          <div className="h-4 w-72 max-w-full animate-skeleton-shimmer rounded" />
        </div>
        <div className="h-9 w-40 animate-skeleton-shimmer rounded-md" />
      </div>
      <UsuariosSkeleton />
    </div>
  );
}
