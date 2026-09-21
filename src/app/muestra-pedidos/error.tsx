"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MuestraPedidosError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 text-center sm:p-8">
      <h1 className="text-xl font-semibold">No pudimos abrir la muestra</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">El error no queda oculto detrás de una carga infinita. Podés reintentar sin perder el contexto.</p>
      <Button className="mt-5" onClick={reset}><RotateCcw aria-hidden="true" />Reintentar</Button>
    </div>
  );
}
