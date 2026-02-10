import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productoSchema } from "@/lib/validaciones/productoSchema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        proveedor: true,
      },
    });
    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error obteniendo producto:", error);
    return NextResponse.json(
      { error: "Error al obtener producto" },
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
    const data = productoSchema.parse(body);

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        sku: data.sku,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        categoriaId: data.categoriaId || null,
        precioCompra: data.precioCompra ?? null,
        precioVenta: data.precioVenta,
        enConsignacion: data.enConsignacion,
        comisionConsignacion: data.comisionConsignacion ?? null,
        stockActual: data.stockActual,
        stockMinimo: data.stockMinimo,
        proveedorId: data.proveedorId || null,
        imagenUrl: data.imagenUrl && data.imagenUrl !== "" ? data.imagenUrl : null,
        activo: data.activo,
      },
      include: {
        categoria: true,
        proveedor: true,
      },
    });
    return NextResponse.json(producto);
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error actualizando producto:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
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
    await prisma.producto.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
