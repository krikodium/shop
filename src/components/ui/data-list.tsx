import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TonoCifra } from "@/components/ui/figure";

const claseTono: Record<TonoCifra, string> = {
  neutro: "text-foreground",
  positivo: "text-num-positive",
  negativo: "text-num-negative",
  alerta: "text-num-warning",
};

/**
 * Lista densa con divisores. Reemplaza las listas de tarjetitas con borde
 * propio: un solo bloque, filas separadas por una línea.
 */
export function DataList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Fila de `DataList`: identificador a la izquierda, cifra a la derecha.
 * Con `href` toda la fila es clickeable.
 */
export function DataRow({
  titulo,
  meta,
  etiquetas,
  valor,
  valorHint,
  tono = "neutro",
  href,
  className,
}: {
  titulo: ReactNode;
  /** Segunda línea: fecha, SKU, contador. Va en mono para que alinee. */
  meta?: ReactNode;
  /** Badges al lado del título. */
  etiquetas?: ReactNode;
  valor?: ReactNode;
  valorHint?: ReactNode;
  tono?: TonoCifra;
  href?: string;
  className?: string;
}) {
  const contenido = (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{titulo}</span>
          {etiquetas}
        </div>
        {meta && (
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{meta}</p>
        )}
      </div>
      {valor !== undefined && (
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-mono text-sm font-semibold tabular-nums sm:text-base",
              claseTono[tono]
            )}
          >
            {valor}
          </p>
          {valorHint && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{valorHint}</p>
          )}
        </div>
      )}
    </>
  );

  const clases = cn(
    "flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-5",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          clases,
          "transition-colors duration-[--dur-fast] hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        )}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
