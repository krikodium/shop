import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TonoCifra = "neutro" | "positivo" | "negativo" | "alerta";

const claseTono: Record<TonoCifra, string> = {
  neutro: "text-foreground",
  positivo: "text-num-positive",
  negativo: "text-num-negative",
  alerta: "text-num-warning",
};

/**
 * Cifra informativa. El color vive acá y solo acá: en el número, nunca en el
 * fondo ni en un borde decorativo.
 */
export function Figure({
  label,
  valor,
  hint,
  tono = "neutro",
  alineacion = "izquierda",
  className,
}: {
  label: ReactNode;
  valor: ReactNode;
  hint?: ReactNode;
  tono?: TonoCifra;
  alineacion?: "izquierda" | "derecha";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between bg-card px-4 py-4 sm:px-5",
        alineacion === "derecha" && "text-right",
        className
      )}
    >
      <div>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1.5 font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl", claseTono[tono])}>
          {valor}
        </p>
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const claseColumnas: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Fila de cifras. Es UN bloque con divisores internos, no N tarjetas sueltas:
 * eso es lo que saca de encima el look de "tarjetón".
 *
 * Los divisores se dibujan con un gap de 1px que deja ver el `bg-border` del
 * contenedor por detrás de cada celda (que a su vez pinta su propio `bg-card`).
 * A diferencia de `divide-y`/`divide-x`, esta técnica dibuja líneas exactas en
 * cualquier cantidad de filas y en cualquier breakpoint — con 4 cifras en
 * `sm:grid-cols-2` la grilla arma 2 filas y el hueco sigue cerrando prolijo.
 */
export function FigureGrid({
  columnas = 4,
  className,
  children,
}: {
  columnas?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-border bg-border",
        claseColumnas[columnas],
        className
      )}
    >
      {children}
    </div>
  );
}
