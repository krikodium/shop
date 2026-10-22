import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validaciones/clienteSchema";
import { auth } from "@/auth";
import { resumenVentas } from "@/lib/resumenFinanciero";
import { serializable } from "@/lib/calculadores/finanzasServidor";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        ventas: { orderBy: { fecha: "desc" }, include: { pagos: { select: { montoArs: true } }, pedido: { select: { id: true } } } },
      },
    });
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    const resumen = resumenVentas(cliente.ventas.filter(v => !v.anulada));
    return NextResponse.json({ ...cliente, resumen,
      ventas: cliente.ventas.slice(0, 20).map(v => ({ ...v, resumen: resumenVentas([v]) })) });
  } catch (error) {
    console.error("Error obteniendo cliente:", error);
    return NextResponse.json(
      { error: "Error al obtener cliente" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role === "VIEWER") return NextResponse.json({ error: "Usuario de solo lectura" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    const data = clienteSchema.parse(body);

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        email: data.email || null,
        telefono: data.telefono ?? null,
        dni: data.dni ?? null,
        direccion: data.direccion ?? null,
        recibeNotificaciones: data.recibeNotificaciones,
        notas: data.notas ?? null,
      },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error actualizando cliente:", error);
    return NextResponse.json(
      { error: "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  try {
    const { id } = await params;
    const eliminado = await serializable(async tx => {
      if (await tx.venta.count({ where: { clienteId: id } })) return false;
      await tx.cliente.delete({ where: { id } });
      return true;
    });
    if (!eliminado) return NextResponse.json({ error: "No se puede eliminar una clienta con ventas o pedidos" }, { status: 409 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error eliminando cliente:", error);
    return NextResponse.json(
      { error: "Error al eliminar cliente" },
      { status: 500 }
    );
  }
}
