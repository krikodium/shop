import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { obtenerPedidos } from "@/lib/pedidos";
import { ventaSchema } from "@/lib/validaciones/ventaSchema";
import { procesarVenta } from "@/lib/procesarVenta";
export async function GET() {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await obtenerPedidos());
}
export async function POST(request: Request) {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (s.user.role === "VIEWER")
    return NextResponse.json(
      { error: "Usuario de solo lectura" },
      { status: 403 },
    );
  try {
    const datos = ventaSchema.parse(await request.json());
    if (!datos.claveIdempotencia)
      return NextResponse.json(
        { error: "Falta clave de operación" },
        { status: 400 },
      );
    const venta = await procesarVenta({
      ...datos,
      pedido: datos.pedido ?? {},
      usuarioId: s.user.id,
    });
    return NextResponse.json((await obtenerPedidos(venta.pedido!.id))[0], {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el pedido",
      },
      { status: 400 },
    );
  }
}
