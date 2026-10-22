import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Estado vacío monocromo: borde punteado, sin ilustración ni color. */
export function EmptyState({
  titulo,
  descripcion,
  accion,
  icono: Icono,
  className,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center",
        className
      )}
    >
      {Icono && (
        <div className="mb-1 flex size-10 items-center justify-center rounded-full border border-border bg-card">
          <Icono className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium tracking-tight">{titulo}</p>
      {descripcion && (
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="mt-2.5">{accion}</div>}
    </div>
  );
}
