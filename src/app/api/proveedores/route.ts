import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proveedorSchema } from "@/lib/validaciones/proveedorSchema";

export async function GET() {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: {
        _count: { select: { productos: true } },
      },
    });
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error("Error listando proveedores:", error);
    return NextResponse.json(
      { error: "Error al listar proveedores" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = proveedorSchema.parse(body);

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: data.nombre,
        contacto: data.contacto ?? null,
        telefono: data.telefono ?? null,
        email: data.email || null,
        direccion: data.direccion ?? null,
        tipoProveedor: data.tipoProveedor,
        comisionPorDefecto: data.comisionPorDefecto ?? null,
      },
    });
    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error creando proveedor:", error);
    return NextResponse.json(
      { error: "Error al crear proveedor" },
      { status: 500 }
    );
  }
}
