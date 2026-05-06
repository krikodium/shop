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
    const q = searchParams.get("q")?.trim();
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const montoMin = searchParams.get("montoMin");
    const montoMax = searchParams.get("montoMax");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(10, Number(searchParams.get("pageSize") ?? 20) || 20)
    );

    const where: Prisma.OrdenCompraWhereInput = {};

    if (proveedorId) where.proveedorId = proveedorId;
    if (estado) {
      where.estado = estado as "PENDIENTE" | "PARCIAL" | "RECIBIDO" | "CANCELADO";
    }
    if (q) {
      where.OR = [
        { numeroOrden: { contains: q, mode: "insensitive" } },
        { proveedor: { nombre: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (fechaDesde || fechaHasta) {
      where.fecha = {
        ...(fechaDesde ? { gte: new Date(`${fechaDesde}T00:00:00`) } : {}),
        ...(fechaHasta ? { lte: new Date(`${fechaHasta}T23:59:59`) } : {}),
      };
    }
    if (montoMin || montoMax) {
      where.total = {
        ...(montoMin ? { gte: new Prisma.Decimal(montoMin) } : {}),
        ...(montoMax ? { lte: new Prisma.Decimal(montoMax) } : {}),
      };
    }

    const [ordenes, total] = await prisma.$transaction([
      prisma.ordenCompra.findMany({
        where,
        select: {
          id: true,
          numeroOrden: true,
          fecha: true,
          total: true,
          estado: true,
          proveedor: {
            select: {
              id: true,
              nombre: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { fecha: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ordenCompra.count({ where }),
    ]);

    return NextResponse.json({
      data: ordenes.map((orden) => ({
        id: orden.id,
        numeroOrden: orden.numeroOrden,
        fecha: orden.fecha,
        total: orden.total,
        estado: orden.estado,
        proveedor: orden.proveedor,
        itemsCount: orden._count.items,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
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
