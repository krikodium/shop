import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validaciones/clienteSchema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const clientes = await prisma.cliente.findMany({
      where: q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { telefono: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined,
      orderBy: { nombre: "asc" },
      take: 100,
    });
    return NextResponse.json(clientes);
  } catch (error) {
    console.error("Error listando clientes:", error);
    return NextResponse.json(
      { error: "Error al listar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = clienteSchema.parse(body);

    const cliente = await prisma.cliente.create({
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
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error creando cliente:", error);
    return NextResponse.json(
      { error: "Error al crear cliente" },
      { status: 500 }
    );
  }
}
