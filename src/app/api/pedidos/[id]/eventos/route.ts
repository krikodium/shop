import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { eventoSchema } from "@/lib/validaciones/ventaSchema";
import { registrarEventoPedido } from "@/lib/pedidos";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (s.user.role === "VIEWER")
    return NextResponse.json(
      { error: "Usuario de solo lectura" },
      { status: 403 },
    );
  try {
    const { id } = await ctx.params;
    return NextResponse.json(
      await registrarEventoPedido(
        id,
        eventoSchema.parse(await request.json()),
        s.user.id,
      ),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el evento",
      },
      { status: 400 },
    );
  }
}
