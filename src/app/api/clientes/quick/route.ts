import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datosClienteVentaSchema } from "@/lib/validaciones/clienteSchema";

/**
 * POST: Crear cliente rápido desde el punto de venta.
 * Todos los campos opcionales. Se necesita al menos uno.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = datosClienteVentaSchema.parse(body);

    const nombre = (data.nombre ?? "").trim();
    const email = (data.email ?? "").trim() || null;
    const telefono = (data.telefono ?? "").trim() || null;
    const dni = (data.dni ?? "").trim() || null;

    if (!nombre && !email && !telefono && !dni) {
      return NextResponse.json(
        { error: "Agregá al menos un dato (nombre, email, teléfono o DNI)" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: nombre || "Cliente",
        email,
        telefono,
        dni,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error creando cliente rápido:", error);
    return NextResponse.json(
      { error: "Error al crear cliente" },
      { status: 500 }
    );
  }
}
