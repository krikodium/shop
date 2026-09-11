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
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className
      )}
    >
      {Icono && <Icono className="size-5 text-muted-foreground" aria-hidden="true" />}
      <p className="text-sm font-medium">{titulo}</p>
      {descripcion && (
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
