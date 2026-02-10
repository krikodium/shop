import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo"); // ventas | inventario | rentabilidad
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    // Inicio del día y fin del día para incluir todo el rango
    const fechaDesde = desde ? new Date(desde + "T00:00:00.000") : null;
    const fechaHasta = hasta ? new Date(hasta + "T23:59:59.999") : null;

    if (tipo === "ventas") {
      const where: Prisma.VentaWhereInput = {};
      if (fechaDesde || fechaHasta) {
        where.fecha = {
          ...(fechaDesde ? { gte: fechaDesde } : {}),
          ...(fechaHasta ? { lte: fechaHasta } : {}),
        };
      }

      const ventas = await prisma.venta.findMany({
        where,
        select: {
          total: true,
          subtotal: true,
          descuento: true,
          costoTotal: true,
          gananciaBruta: true,
          margenPorcentaje: true,
          metodoPago: true,
          fecha: true,
        },
      });

      const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
      const totalCosto = ventas.reduce((s, v) => s + Number(v.costoTotal), 0);
      const totalGanancia = ventas.reduce((s, v) => s + Number(v.gananciaBruta), 0);
      const margenProm = ventas.length > 0
        ? ventas.reduce((s, v) => s + Number(v.margenPorcentaje), 0) / ventas.length
        : 0;

      const porMetodoPago = ventas.reduce(
        (acc, v) => {
          const metodo = v.metodoPago;
          if (!acc[metodo]) acc[metodo] = { cantidad: 0, total: 0 };
          acc[metodo].cantidad += 1;
          acc[metodo].total += Number(v.total);
          return acc;
        },
        {} as Record<string, { cantidad: number; total: number }>
      );

      return NextResponse.json({
        totalVentas,
        cantidadVentas: ventas.length,
        totalCosto,
        totalGanancia,
        margenPromedio: margenProm,
        porMetodoPago,
      });
    }

    if (tipo === "inventario") {
      const productos = await prisma.producto.findMany({
        where: { activo: true },
        include: { proveedor: true },
      });

      let valorCompra = 0;
      let valorVenta = 0;
      const bajoStock: typeof productos = [];

      for (const p of productos) {
        const costo = Number(p.precioCompra ?? 0);
        const venta = Number(p.precioVenta);
        valorCompra += costo * p.stockActual;
        valorVenta += venta * p.stockActual;
        if (p.stockActual <= p.stockMinimo) {
          bajoStock.push(p);
        }
      }

      return NextResponse.json({
        cantidadProductos: productos.length,
        valorInventarioCompra: valorCompra,
        valorInventarioVenta: valorVenta,
        productosBajoStock: bajoStock.map((p) => ({
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          stockActual: p.stockActual,
          stockMinimo: p.stockMinimo,
        })),
      });
    }

    if (tipo === "rentabilidad") {
      const where: Prisma.VentaWhereInput = {};
      if (fechaDesde || fechaHasta) {
        where.fecha = {
          ...(fechaDesde ? { gte: fechaDesde } : {}),
          ...(fechaHasta ? { lte: fechaHasta } : {}),
        };
      }

      const ventas = await prisma.venta.findMany({
        where,
        include: { items: true },
      });

      const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
      const totalCosto = ventas.reduce((s, v) => s + Number(v.costoTotal), 0);
      const totalGanancia = ventas.reduce((s, v) => s + Number(v.gananciaBruta), 0);
      const margenPorc = totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0;

      // Rentabilidad por producto (agregado de items)
      const porProducto: Record<
        string,
        { nombre: string; sku: string; cantidad: number; venta: number; costo: number; ganancia: number }
      > = {};

      for (const v of ventas) {
        for (const item of v.items) {
          const key = item.productoId;
          if (!porProducto[key]) {
            porProducto[key] = {
              nombre: item.productoNombre,
              sku: item.productoSku,
              cantidad: 0,
              venta: 0,
              costo: 0,
              ganancia: 0,
            };
          }
          porProducto[key].cantidad += item.cantidad;
          porProducto[key].venta += Number(item.subtotal);
          porProducto[key].costo += Number(item.costoTotal);
          porProducto[key].ganancia += Number(item.subtotal) - Number(item.costoTotal);
        }
      }

      return NextResponse.json({
        totalVentas,
        totalCosto,
        totalGanancia,
        margenPorcentaje: margenPorc,
        porProducto: Object.values(porProducto).sort((a, b) => b.ganancia - a.ganancia),
      });
    }

    return NextResponse.json({ error: "Tipo de reporte no válido" }, { status: 400 });
  } catch (error) {
    console.error("Error en reportes:", error);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
