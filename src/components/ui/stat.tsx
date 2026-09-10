import { cn } from "@/lib/utils";

interface StatGridProps {
  children: React.ReactNode;
  className?: string;
}

/** Grilla de métricas estilo libro mayor (reemplaza grids de KPI-cards). */
export function StatGrid({ children, className }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatProps {
  label: string;
  value: React.ReactNode;
  /** Texto secundario debajo de la cifra */
  hint?: React.ReactNode;
  /** Color de la cifra: neutro (def.), positivo (verde), alerta (ámbar) */
  tone?: "default" | "positive" | "warning" | "muted";
  /** Pequeño punto/acento a la izquierda del label */
  accent?: boolean;
  className?: string;
}

const toneClass: Record<NonNullable<StatProps["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  muted: "text-muted-foreground/50",
};

/**
 * Métrica individual: label mono mayúsculas + cifra mono tabular.
 * Sin íconos en cuadritos ni border-l-4 de colores.
 */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
  accent = false,
  className,
}: StatProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="flex items-center gap-2">
        {accent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          {label}
        </p>
      </div>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums", toneClass[tone])}>
        {value}
      </p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
