import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

const PASO_MS = 35;
const TOPE = 12;

/**
 * Revelado escalonado. En una lista, pasá el índice de la fila: el
 * escalonamiento se topea a los 12 elementos para que una tabla larga no
 * termine de aparecer a los cinco segundos.
 *
 * El freno de `prefers-reduced-motion` vive en la clase CSS (`.anim-entrada`
 * en `globals.css`), no acá: así cualquier uso lo hereda sin tener que
 * acordarse.
 */
export function Reveal({
  indice = 0,
  as,
  className,
  children,
  ...resto
}: {
  indice?: number;
  /** Etiqueta o componente contenedor. Por defecto `div`; en tablas, `TableRow`. */
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const Etiqueta = (as ?? "div") as ElementType;
  const retraso = Math.min(indice, TOPE) * PASO_MS;

  return (
    <Etiqueta
      className={cn("anim-entrada", className)}
      style={{ animationDelay: `${retraso}ms` }}
      {...resto}
    >
      {children}
    </Etiqueta>
  );
}
