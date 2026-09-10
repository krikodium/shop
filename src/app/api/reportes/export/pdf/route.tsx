import { NextResponse } from "next/server";
import { Prisma, type MetodoPago } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReportesPDF } from "@/components/pdf/ReportesPDF";

type Filtros = {
  metodoPago: string | null;
  proveedorId: string | null;
  categoriaId: string | null;
};

function buildVentaWhere(
  desde: Date | null,
  hasta: Date | null,
  filtros: Filtros
): Prisma.VentaWhereInput {
  const where: Prisma.VentaWhereInput = { anulada: false };
  if (desde || hasta) {
    where.fecha = {
      ...(desde ? { gte: desde } : {}),
      ...(hasta ? { lte: hasta } : {}),
    };
  }
  if (filtros.metodoPago) {
    where.OR = [
      { metodoPago: filtros.metodoPago as MetodoPago },
      { metodoPagoSecundario: filtros.metodoPago as MetodoPago },
    ];
  }
  if (filtros.proveedorId || filtros.categoriaId) {
    const andItems: Prisma.ItemVentaWhereInput[] = [];
    if (filtros.proveedorId) {
      andItems.push({
        OR: [
          { proveedorId: filtros.proveedorId },
          { producto: { proveedorId: filtros.proveedorId } },
        ],
      });
    }
    if (filtros.categoriaId) {
      andItems.push({ producto: { categoriaId: filtros.categoriaId } });
    }
    where.items = { some: { AND: andItems } };
  }
  return where;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desdeParam = searchParams.get("desde");
  const hastaParam = searchParams.get("hasta");
  const metodoPagoParam = searchParams.get("metodoPago");
  const proveedorIdParam = searchParams.get("proveedorId");
  const categoriaIdParam = searchParams.get("categoriaId");

  const desde = desdeParam ? new Date(desdeParam + "T00:00:00.000") : null;
  const hasta = hastaParam ? new Date(hastaParam + "T23:59:59.999") : null;
  const filtros: Filtros = {
    metodoPago:
      metodoPagoParam && metodoPagoParam !== "__all__" ? metodoPagoParam : null,
    proveedorId:
      proveedorIdParam && proveedorIdParam !== "__all__" ? proveedorIdParam : null,
    categoriaId:
      categoriaIdParam && categoriaIdParam !== "__all__" ? categoriaIdParam : null,
  };

  const where = buildVentaWhere(desde, hasta, filtros);

  const ventasRows = await prisma.venta.findMany({
    where,
    select: {
      total: true,
      gananciaBruta: true,
      margenPorcentaje: true,
      costoTotal: true,
    },
  });
  const totalVentas = ventasRows.reduce((s, v) => s + Number(v.total), 0);
  const totalGanancia = ventasRows.reduce((s, v) => s + Number(v.gananciaBruta), 0);
  const totalCosto = ventasRows.reduce((s, v) => s + Number(v.costoTotal), 0);
  const margenPromedio =
    ventasRows.length > 0
      ? ventasRows.reduce((s, v) => s + Number(v.margenPorcentaje), 0) /
        ventasRows.length
      : 0;

  const items = await prisma.itemVenta.findMany({
    where: { venta: where },
    select: {
      productoId: true,
      productoNombre: true,
      productoSku: true,
      subtotal: true,
      costoTotal: true,
      cantidad: true,
    },
  });

  const topVentaMap: Record<string, { nombre: string; sku: string; valor: number }> = {};
  const topGananciaMap: Record<string, { nombre: string; sku: string; valor: number }> = {};
  for (const item of items) {
    if (!topVentaMap[item.productoId]) {
      topVentaMap[item.productoId] = {
        nombre: item.productoNombre,
        sku: item.productoSku,
        valor: 0,
      };
      topGananciaMap[item.productoId] = {
        nombre: item.productoNombre,
        sku: item.productoSku,
        valor: 0,
      };
    }
    topVentaMap[item.productoId].valor += Number(item.subtotal);
    topGananciaMap[item.productoId].valor +=
      Number(item.subtotal) - Number(item.costoTotal);
  }

  const topPorVenta = Object.values(topVentaMap)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
  const topPorGanancia = Object.values(topGananciaMap)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const productosInventario = await prisma.producto.findMany({
    where: {
      activo: true,
      ...(filtros.proveedorId ? { proveedorId: filtros.proveedorId } : {}),
      ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
    },
    select: {
      stockActual: true,
      stockMinimo: true,
      precioCompra: true,
      precioVenta: true,
    },
  });

  let valorInventarioCompra = 0;
  let valorInventarioVenta = 0;
  let cantidadBajoStock = 0;
  for (const p of productosInventario) {
    valorInventarioCompra += Number(p.precioCompra ?? 0) * p.stockActual;
    valorInventarioVenta += Number(p.precioVenta) * p.stockActual;
    if (p.stockActual <= p.stockMinimo) cantidadBajoStock += 1;
  }

  const proveedorNombre = filtros.proveedorId
    ? (await prisma.proveedor.findUnique({
        where: { id: filtros.proveedorId },
        select: { nombre: true },
      }))?.nombre ?? "No encontrado"
    : null;
  const categoriaNombre = filtros.categoriaId
    ? (await prisma.categoria.findUnique({
        where: { id: filtros.categoriaId },
        select: { nombre: true },
      }))?.nombre ?? "No encontrada"
    : null;

  const pdfBuffer = await renderToBuffer(
    <ReportesPDF
      periodo={{
        desde: desdeParam ?? "inicio",
        hasta: hastaParam ?? "hoy",
      }}
      filtros={{
        metodoPago: filtros.metodoPago,
        proveedor: proveedorNombre,
        categoria: categoriaNombre,
      }}
      ventas={{
        totalVentas,
        cantidadVentas: ventasRows.length,
        totalGanancia,
        margenPromedio,
        topPorVenta,
        topPorGanancia,
      }}
      inventario={{
        cantidadProductos: productosInventario.length,
        valorInventarioCompra,
        valorInventarioVenta,
        cantidadBajoStock,
      }}
      rentabilidad={{
        totalVentas,
        totalCosto,
        totalGanancia,
        margenPorcentaje: totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0,
      }}
    />
  );

  const filename = `reporte_${desdeParam ?? "inicio"}_${hastaParam ?? "hoy"}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
