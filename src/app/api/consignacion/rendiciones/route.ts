import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calcularPreviewRendicion } from "@/lib/calculadores/consignacionCalculator";
import {
  itemsNoRendidos,
  normalizarRangoFechas,
  validarCreacionRendicion,
} from "@/lib/consignacionHelpers";

/**
 * GET /api/consignacion/rendiciones
 * Lista rendiciones con filtros opcionales.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get("proveedorId");
    const estado = searchParams.get("estado");

    const rendiciones = await prisma.rendicion.findMany({
      where: {
        ...(proveedorId ? { proveedorId } : {}),
        ...(estado ? { estado: estado as "PENDIENTE" | "PAGADO" | "PARCIAL" } : {}),
      },
      include: { proveedor: true },
      orderBy: { fechaRendicion: "desc" },
      take: 50,
    });

    return NextResponse.json(rendiciones);
  } catch (error) {
    console.error("Error listando rendiciones:", error);
    return NextResponse.json(
      { error: "Error al listar rendiciones" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consignacion/rendiciones
 * Crea una nueva rendición.
 * Body: { proveedorId, fechaDesde, fechaHasta, notas?, monedaLiquidacion?: "ARS"|"USD", cotizacionUsd?: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedorId, fechaDesde, fechaHasta, notas } = body;
    const monedaRaw = body.monedaLiquidacion;
    const monedaLiquidacion: "ARS" | "USD" =
      monedaRaw === "USD" ? "USD" : "ARS";

    if (!proveedorId || !fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: "proveedorId, fechaDesde y fechaHasta son requeridos" },
        { status: 400 }
      );
    }

    const validacion = await validarCreacionRendicion(proveedorId);
    if (!validacion.permitido) {
      return NextResponse.json(
        { error: validacion.motivo, code: "RENDICION_MES_EXISTENTE" },
        { status: 409 }
      );
    }

    const { desde: fDesde, hasta: fHasta } = normalizarRangoFechas(
      new Date(fechaDesde),
      new Date(fechaHasta)
    );

    const items = await itemsNoRendidos(proveedorId, fDesde, fHasta);

    const itemsParaPreview = items.map((i) => ({
      ventaId: i.ventaId,
      productoNombre: i.productoNombre,
      productoSku: i.productoSku,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.subtotal,
      comisionShop: i.comisionShop,
      deudaProveedor: i.deudaProveedor,
    }));

    if (itemsParaPreview.length === 0) {
      return NextResponse.json(
        { error: "No hay ventas nuevas de consignación en ese período (todas ya fueron rendidas)" },
        { status: 400 }
      );
    }

    const preview = calcularPreviewRendicion(itemsParaPreview);

    let cotizacionUsd: Prisma.Decimal | null = null;
    let totalARendirUsd: Prisma.Decimal | null = null;
    if (monedaLiquidacion === "USD") {
      const c = Number(body.cotizacionUsd);
      if (!Number.isFinite(c) || c <= 0) {
        return NextResponse.json(
          {
            error:
              "Para liquidar en USD indicá una cotización válida (ARS por 1 USD, mayor a 0)",
          },
          { status: 400 }
        );
      }
      cotizacionUsd = new Prisma.Decimal(c);
      totalARendirUsd = new Prisma.Decimal(preview.totalARendir).div(cotizacionUsd);
    }

    const ultima = await prisma.rendicion.findFirst({
      where: { proveedorId },
      orderBy: { numeroRendicion: "desc" },
      select: { numeroRendicion: true },
    });

    let siguienteNum = 1;
    if (ultima?.numeroRendicion) {
      const match = ultima.numeroRendicion.match(/R-(\d+)/);
      if (match) siguienteNum = parseInt(match[1], 10) + 1;
    }
    const numeroRendicion = `R-${String(siguienteNum).padStart(5, "0")}`;

    const rendicion = await prisma.rendicion.create({
      data: {
        numeroRendicion,
        proveedorId,
        fechaDesde: fDesde,
        fechaHasta: fHasta,
        totalVendido: new Prisma.Decimal(preview.totalVendido),
        comisionShop: new Prisma.Decimal(preview.comisionShop),
        totalARendir: new Prisma.Decimal(preview.totalARendir),
        monedaLiquidacion,
        cotizacionUsd,
        totalARendirUsd,
        detalleItems: preview.items as object,
        notas: notas ?? null,
      },
      include: { proveedor: true },
    });

    return NextResponse.json(rendicion, { status: 201 });
  } catch (error) {
    console.error("Error creando rendición:", error);
    return NextResponse.json(
      { error: "Error al crear rendición" },
      { status: 500 }
    );
  }
}
