"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const PASOS: ReadonlyArray<{ titulo: string; texto: string }> = [
  {
    titulo: "Buscar",
    texto:
      "Escribí el nombre o el SKU en el catálogo. Elegí la vista: Fotos, Lista o Compacta (queda guardada para la próxima). Con el SKU exacto, Enter lo agrega directo.",
  },
  {
    titulo: "Agregar",
    texto:
      "Tocá el producto para sumarlo a la venta. Si ya estaba, se suma una unidad a esa misma línea en vez de duplicarla. Los productos sin stock no se pueden elegir.",
  },
  {
    titulo: "Ajustar",
    texto:
      "En la venta, cambiá cantidades con − y + o escribiendo el número; la × quita la línea. El descuento es un porcentaje sobre el subtotal.",
  },
  {
    titulo: "Cliente y pago",
    texto:
      "El cliente es opcional: sin elegir, queda como consumidor final (o dalo de alta con Nuevo). Elegí la forma de pago. Con “Dividir en dos pagos”, los dos importes tienen que sumar el total; los de USD se convierten con la cotización que cargues.",
  },
  {
    titulo: "Confirmar",
    texto:
      "Confirmar venta revisa el stock. Si alguna cantidad supera lo disponible, avisa y te deja ajustar las cantidades o continuar igual.",
  },
];

/**
 * Panel plegable "Cómo se carga una venta". Arranca abierto mientras el
 * carrito está vacío y se pliega solo al cargar el primer producto, salvo que
 * la persona lo haya abierto o cerrado a mano: ahí manda su elección.
 */
export function GuiaCargaVenta({ carritoVacio }: { carritoVacio: boolean }) {
  const [eleccion, setEleccion] = useState<boolean | null>(null);
  const abierto = eleccion ?? carritoVacio;

  return (
    <Collapsible
      open={abierto}
      onOpenChange={setEleccion}
      className="rounded-lg border border-border bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/60 sm:px-5">
        <span className="text-sm font-medium">Cómo se carga una venta</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {abierto ? "Ocultar" : "Ver los 5 pasos"}
          <ChevronDown
            className={cn(
              "size-4 transition-transform motion-reduce:transition-none",
              abierto && "rotate-180"
            )}
            aria-hidden="true"
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="grid gap-x-6 gap-y-3 border-t border-border px-4 py-3.5 sm:grid-cols-2 sm:px-5 xl:grid-cols-5">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="flex gap-2.5">
              <span className="pt-px font-mono text-[11px] tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{paso.titulo}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
