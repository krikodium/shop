import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proveedorSchema } from "@/lib/validaciones/proveedorSchema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      include: {
        productos: { where: { activo: true } },
      },
    });
    if (!proveedor) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(proveedor);
  } catch (error) {
    console.error("Error obteniendo proveedor:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = proveedorSchema.parse(body);

    const proveedor = await prisma.proveedor.update({
      where: { id },
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
    return NextResponse.json(proveedor);
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error actualizando proveedor:", error);
    return NextResponse.json(
      { error: "Error al actualizar proveedor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [productosActivos, rendicionesPendientes] = await Promise.all([
      prisma.producto.count({ where: { proveedorId: id, activo: true } }),
      prisma.rendicion.count({
        where: { proveedorId: id, estado: "PENDIENTE" },
      }),
    ]);

    if (productosActivos > 0 || rendicionesPendientes > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: tiene productos activos o rendiciones pendientes",
        },
        { status: 400 }
      );
    }

    await prisma.proveedor.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error eliminando proveedor:", error);
    return NextResponse.json(
      { error: "Error al eliminar proveedor" },
      { status: 500 }
    );
  }
}
