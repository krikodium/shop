import { PedidoDetalle } from "@/components/pedidos/PedidoDetalle";
export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PedidoDetalle id={id} />;
}
