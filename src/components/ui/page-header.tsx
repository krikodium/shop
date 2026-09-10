import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Overline en mono mayúsculas, ej. "Gestión · Ventas" */
  overline?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Acciones a la derecha (botones, toggles) */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Masthead editorial del sistema "libro mayor".
 * Reemplaza el header en "tarjetón" (bg-card/70 backdrop-blur) por un
 * encabezado con overline mono, título sobrio y regla de base.
 */
export function PageHeader({
  overline,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {overline && (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
            {overline}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </header>
  );
}
