import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { datosClienteVentaSchema } from "@/lib/validaciones/clienteSchema";
import { dinero, serializable } from "@/lib/calculadores/finanzasServidor";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await auth();
  if (!sesion?.user?.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.user.role === "VIEWER")
    return NextResponse.json(
      { error: "Usuario de solo lectura" },
      { status: 403 },
    );
  try {
    const { id } = await params;
    const datos = datosClienteVentaSchema.parse(await request.json());
    const nombre = datos.nombre?.trim(),
      email = datos.email?.trim(),
      telefono = datos.telefono?.trim(),
      dni = datos.dni?.trim();
    if (!nombre && !email && !telefono && !dni)
      return NextResponse.json(
        { error: "Agregá al menos un dato de la clienta" },
        { status: 400 },
      );
    const resultado = await serializable(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id },
        include: { cliente: true },
      });
      if (!venta) throw new Error("Venta no encontrada");
      if (venta.anulada) throw new Error("La venta está anulada");
      const campos = {
        ...(nombre ? { nombre } : {}),
        ...(email ? { email } : {}),
        ...(telefono ? { telefono } : {}),
        ...(dni ? { dni } : {}),
      };
      const cliente = venta.cliente
        ? await tx.cliente.update({
            where: { id: venta.cliente.id },
            data: campos,
          })
        : await tx.cliente.create({
            data: {
              ...campos,
              nombre: nombre || "Clienta",
              totalCompras: venta.total,
              cantidadCompras: 1,
              ticketPromedio: dinero(venta.total),
              ultimaCompra: venta.fecha,
            },
          });
      await tx.venta.update({
        where: { id },
        data: {
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          notas: `${venta.notas ?? ""}\nDatos de clienta actualizados por ${sesion.user.id}`,
        },
      });
      return { clienteId: cliente.id, clienteNombre: cliente.nombre };
    });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof Error && !("code" in error))
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error actualizando clienta de venta", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la clienta" },
      { status: 500 },
    );
  }
}
