import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productoSchema } from "@/lib/validaciones/productoSchema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        const stocks = await prisma.producto.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true, stockActual: true },
        });
        return NextResponse.json(stocks);
      }
    }

    const categoriaId = searchParams.get("categoriaId");
    const proveedorId = searchParams.get("proveedorId");
    const enConsignacion = searchParams.get("enConsignacion");
    const stockBajo = searchParams.get("stockBajo");
    const activo = searchParams.get("activo");
    const q = searchParams.get("q")?.trim();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const paginado = pageParam != null || limitParam != null;
    const page = paginado ? Math.max(1, parseInt(pageParam ?? "1", 10)) : 1;
    const limit = paginado ? Math.min(50, Math.max(1, parseInt(limitParam ?? "10", 10))) : 1000;
    const skip = (page - 1) * limit;

    const baseWhere = {
      ...(categoriaId ? { categoriaId } : {}),
      ...(proveedorId ? { proveedorId } : {}),
      ...(enConsignacion === "true" ? { enConsignacion: true } : {}),
      ...(enConsignacion === "false" ? { enConsignacion: false } : {}),
      ...(activo !== "false" ? { activo: true } : {}),
      ...(stockBajo === "sin" ? { stockActual: 0 } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" as const } },
              { sku: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const takeAll = stockBajo === "bajo";
    let productos = await prisma.producto.findMany({
      where: baseWhere,
      orderBy: { nombre: "asc" },
      include: {
        categoria: true,
        proveedor: true,
      },
      skip: takeAll ? 0 : skip,
      take: takeAll ? 10000 : limit,
    });

    if (stockBajo === "bajo") {
      productos = productos.filter((p) => p.stockActual <= p.stockMinimo);
      const totalBajo = productos.length;
      productos = productos.slice(skip, skip + limit);
      if (paginado) {
        return NextResponse.json({ productos, total: totalBajo, page, limit });
      }
      return NextResponse.json(productos);
    }

    const total = await prisma.producto.count({ where: baseWhere });
    if (paginado) {
      return NextResponse.json({ productos, total, page, limit });
    }
    return NextResponse.json(productos);
  } catch (error) {
    console.error("Error listando productos:", error);
    return NextResponse.json(
      { error: "Error al listar productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = productoSchema.parse(body);

    const producto = await prisma.producto.create({
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
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error creando producto:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
