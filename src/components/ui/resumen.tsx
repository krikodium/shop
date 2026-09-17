import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ItemResumen {
  label: string;
  valor: ReactNode;
  hint?: ReactNode;
  /**
   * Invierte la celda (fondo negro, texto blanco). Es el gesto que cierra un
   * resumen: la cifra que el usuario vino a mirar. Una sola por bloque.
   */
  destacado?: boolean;
}

/**
 * Bloque de cifras que encabeza una pantalla: dos a cuatro celdas con
 * divisores de 1px y una sola celda invertida.
 *
 * Es el gesto más reconocible del sistema. Se usa arriba de todo, para las
 * cifras que resumen la pantalla; para métricas secundarias va `FigureGrid`.
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
        "grid gap-px overflow-hidden rounded-xl border border-border bg-border",
        columnas,
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "px-5 py-5",
            item.destacado ? "bg-primary text-primary-foreground" : "bg-card"
          )}
        >
          <dt
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.18em]",
              item.destacado ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {item.label}
          </dt>
          <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
            {item.valor}
          </dd>
          {item.hint && (
            <dd
              className={cn(
                "mt-1.5 text-xs",
                item.destacado ? "text-primary-foreground/60" : "text-muted-foreground"
              )}
            >
              {item.hint}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
