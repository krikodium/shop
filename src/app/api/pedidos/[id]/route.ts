import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { obtenerPedidos } from "@/lib/pedidos";
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const pedido = (await obtenerPedidos(id))[0];
  return pedido
    ? NextResponse.json(pedido)
    : NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
}
