"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MuestraPedidosError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-xl border border-zinc-950 bg-white p-6 text-center sm:p-8">
      <h1 className="text-xl font-semibold">No pudimos abrir la muestra</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">El error no queda oculto detrás de una carga infinita. Podés reintentar sin perder el contexto.</p>
      <Button className="mt-5 bg-zinc-950 text-white hover:bg-zinc-800" onClick={reset}><RotateCcw className="size-4" />Reintentar</Button>
    </div>
  );
}
