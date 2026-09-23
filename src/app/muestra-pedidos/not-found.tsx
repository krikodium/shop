import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PedidoMuestraNoEncontrado() {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-dashed border-border px-6 py-8 text-center">
      <h1 className="text-xl font-semibold">Pedido ficticio no encontrado</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Volvé a la bandeja para elegir uno de los registros de la muestra.</p>
      <Button asChild className="mt-5"><Link href="/muestra-pedidos/pedidos">Ver pedidos</Link></Button>
    </div>
  );
}
