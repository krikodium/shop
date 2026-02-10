import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datosClienteVentaSchema } from "@/lib/validaciones/clienteSchema";

/**
 * POST: Guardar o actualizar datos del cliente asociados a una venta.
 * Todos los campos son opcionales. Si la venta ya tiene cliente, se actualiza.
 * Si no, se crea uno nuevo y se vincula.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ventaId } = await params;
    const body = await request.json();
    const data = datosClienteVentaSchema.parse(body);

    const nombre = (data.nombre ?? "").trim();
    const email = (data.email ?? "").trim() || null;
    const telefono = (data.telefono ?? "").trim() || null;
    const dni = (data.dni ?? "").trim() || null;

    // Si no hay ningún dato, no hacer nada
    if (!nombre && !email && !telefono && !dni) {
      return NextResponse.json(
        { error: "Agregá al menos un dato (nombre, email, teléfono o DNI)" },
        { status: 400 }
      );
    }

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: { cliente: true },
    });

    if (!venta) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    let clienteId: string;
    let clienteNombre: string;

    if (venta.clienteId && venta.cliente) {
      // Actualizar cliente existente
      const updated = await prisma.cliente.update({
        where: { id: venta.clienteId },
        data: {
          ...(nombre && { nombre }),
          ...(email !== null && { email }),
          ...(telefono !== null && { telefono }),
          ...(dni !== null && { dni }),
        },
      });
      clienteId = updated.id;
      clienteNombre = updated.nombre;
    } else {
      // Crear nuevo cliente
      const nuevo = await prisma.cliente.create({
        data: {
          nombre: nombre || "Cliente",
          email,
          telefono,
          dni,
        },
      });
      clienteId = nuevo.id;
      clienteNombre = nuevo.nombre;
    }

    // Vincular venta al cliente
    await prisma.venta.update({
      where: { id: ventaId },
      data: { clienteId, clienteNombre },
    });

    return NextResponse.json({ clienteId, clienteNombre });
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error guardando datos cliente:", error);
    return NextResponse.json(
      { error: "Error al guardar datos del cliente" },
      { status: 500 }
    );
  }
}
