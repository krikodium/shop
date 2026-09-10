import { notFound } from "next/navigation";
import { PedidoDetalleDemo } from "@/components/pedidos-demo/PedidoDetalleDemo";
import { pedidosDemo } from "@/lib/pedidos-demo";

export default async function PedidoDetalleMuestraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = pedidosDemo.find((item) => item.id === id);

  if (!pedido) notFound();

  return <PedidoDetalleDemo pedido={pedido} />;
}
