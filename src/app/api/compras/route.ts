import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/compras
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get("proveedorId");
    const estado = searchParams.get("estado");

    const ordenes = await prisma.ordenCompra.findMany({
      where: {
        ...(proveedorId ? { proveedorId } : {}),
        ...(estado ? { estado: estado as "PENDIENTE" | "PARCIAL" | "RECIBIDO" | "CANCELADO" } : {}),
      },
      include: {
        proveedor: true,
        items: { include: { producto: true } },
      },
      orderBy: { fecha: "desc" },
      take: 50,
    });

    return NextResponse.json(ordenes);
  } catch (error) {
    console.error("Error listando órdenes:", error);
    return NextResponse.json(
      { error: "Error al listar órdenes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compras
 * Body: { proveedorId, items: [{ productoId, cantidad, precioUnitario }], notas? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedorId, items, notas } = body;

    if (!proveedorId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "proveedorId e items son requeridos" },
        { status: 400 }
      );
    }

    const ultima = await prisma.ordenCompra.findFirst({
      orderBy: { numeroOrden: "desc" },
      select: { numeroOrden: true },
    });
    let siguienteNum = 1;
    if (ultima?.numeroOrden) {
      const match = ultima.numeroOrden.match(/OC-(\d+)/);
      if (match) siguienteNum = parseInt(match[1], 10) + 1;
    }
    const numeroOrden = `OC-${String(siguienteNum).padStart(5, "0")}`;

    let total = 0;
    const itemsData = items.map((i: { productoId: string; cantidad: number; precioUnitario: number }) => {
      const sub = i.cantidad * i.precioUnitario;
      total += sub;
      return {
        productoId: i.productoId,
        cantidad: i.cantidad,
        precioUnitario: new Prisma.Decimal(i.precioUnitario),
        subtotal: new Prisma.Decimal(sub),
      };
    });

    const orden = await prisma.ordenCompra.create({
      data: {
        numeroOrden,
        proveedorId,
        total: new Prisma.Decimal(total),
        items: { create: itemsData },
        notas: notas ?? null,
      },
      include: {
        proveedor: true,
        items: { include: { producto: true } },
      },
    });

    return NextResponse.json(orden, { status: 201 });
  } catch (error) {
    console.error("Error creando orden:", error);
    return NextResponse.json(
      { error: "Error al crear orden" },
      { status: 500 }
    );
  }
}
