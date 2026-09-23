"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type VistaCatalogo = "fotos" | "lista" | "compacta";

/** Configuración de cada vista del catálogo del punto de venta. */
export const VISTAS_CATALOGO: ReadonlyArray<{
  id: VistaCatalogo;
  etiqueta: string;
  descripcion: string;
  porPagina: number;
}> = [
  { id: "fotos", etiqueta: "Fotos", descripcion: "Fotos: grilla con imagen", porPagina: 12 },
  { id: "lista", etiqueta: "Lista", descripcion: "Lista: filas sin foto", porPagina: 25 },
  {
    id: "compacta",
    etiqueta: "Compacta",
    descripcion: "Compacta: máxima densidad, para cargar por SKU",
    porPagina: 40,
  },
];

export function esVistaCatalogo(valor: unknown): valor is VistaCatalogo {
  return VISTAS_CATALOGO.some((v) => v.id === valor);
}

/**
 * Control segmentado compacto (radiogroup) para elegir la vista del catálogo.
 * Flechas izquierda/derecha mueven la selección, como un grupo de radios.
 */
export function SelectorVistaCatalogo({
  valor,
  onCambiar,
  className,
}: {
  valor: VistaCatalogo;
  onCambiar: (vista: VistaCatalogo) => void;
  className?: string;
}) {
  const botones = useRef<Array<HTMLButtonElement | null>>([]);

  const moverCon = (evento: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const delta =
      evento.key === "ArrowRight" || evento.key === "ArrowDown"
        ? 1
        : evento.key === "ArrowLeft" || evento.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    evento.preventDefault();
    const siguiente = (indice + delta + VISTAS_CATALOGO.length) % VISTAS_CATALOGO.length;
    onCambiar(VISTAS_CATALOGO[siguiente].id);
    botones.current[siguiente]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Vista del catálogo"
      className={cn("inline-flex rounded-md border border-border p-0.5", className)}
    >
      {VISTAS_CATALOGO.map((vista, indice) => {
        const activa = vista.id === valor;
        return (
          <button
            key={vista.id}
            ref={(el) => {
              botones.current[indice] = el;
            }}
            type="button"
            role="radio"
            aria-checked={activa}
            aria-label={vista.descripcion}
            title={vista.descripcion}
            tabIndex={activa ? 0 : -1}
            onClick={() => {
              if (!activa) onCambiar(vista.id);
            }}
            onKeyDown={(e) => moverCon(e, indice)}
            className={cn(
              "h-7 rounded-[5px] px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
              activa
                ? "bg-action text-action-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {vista.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
