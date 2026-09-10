import Link from "next/link";

export default function PedidoMuestraNoEncontrado() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-zinc-300 bg-white p-6 text-center sm:p-8">
      <h1 className="text-xl font-semibold">Pedido ficticio no encontrado</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">Volvé a la bandeja para elegir uno de los registros de la muestra.</p>
      <Link href="/muestra-pedidos/pedidos" className="mt-5 inline-flex min-h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800">Ver pedidos</Link>
    </div>
  );
}
