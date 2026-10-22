import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Superficie de contenido del sistema. Reemplaza el uso genérico de Card:
 * plana, sin sombra, sin borde de color, sin degradado.
 */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  descripcion,
  acciones,
  className,
}: {
  title: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border bg-surface/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {descripcion && (
          <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}
