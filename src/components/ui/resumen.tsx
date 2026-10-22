import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ItemResumen {
  label: string;
  valor: ReactNode;
  hint?: ReactNode;
}

/**
 * Banda de cifras que encabeza una pantalla: dos a cuatro celdas separadas por
 * divisores de 1px.
 *
 * Deliberadamente compacta: una banda de información, no una fila de tarjetones.
 * Tampoco hay celda "destacada" con fondo lleno — en tema oscuro un fondo
 * invertido se convierte en una plancha blanca gigante. La jerarquía la dan el
 * orden y el peso tipográfico, no un bloque de color.
 */
export function Resumen({
  items,
  className,
}: {
  items: ItemResumen[];
  className?: string;
}) {
  const columnas =
    items.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : items.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs",
        columnas,
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-between bg-card px-4 py-4 transition-colors hover:bg-muted/20 sm:px-5"
        >
          <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {item.label}
          </dt>
          <div>
            <dd className="mt-2 font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
              {item.valor}
            </dd>
            {item.hint && (
              <dd className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.hint}</dd>
            )}
          </div>
        </div>
      ))}
    </dl>
  );
}
