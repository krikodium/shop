import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getInicioMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

function getInicioDia() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
}

function getFinDia() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
}

export async function GET() {
  try {
    const inicioMes = getInicioMes();
    const inicioDia = getInicioDia();
    const finDia = getFinDia();

    // Ventas del mes
    const ventasMes = await prisma.venta.findMany({
      where: { fecha: { gte: inicioMes } },
      select: {
        total: true,
        gananciaBruta: true,
        metodoPago: true,
        fecha: true,
      },
    });

    const totalVentasMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
    const totalGananciaMes = ventasMes.reduce((s, v) => s + Number(v.gananciaBruta), 0);
    const cantidadVentasMes = ventasMes.length;

    // Ventas de hoy
    const ventasHoy = ventasMes.filter(
      (v) => v.fecha >= inicioDia && v.fecha <= finDia
    );
    const totalVentasHoy = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
    const cantidadVentasHoy = ventasHoy.length;

    // Ventas por día (últimos 14 días, incluyendo hoy)
    const hoy = new Date();
    const inicioRango = new Date(hoy);
    inicioRango.setDate(inicioRango.getDate() - 13);
    inicioRango.setHours(0, 0, 0, 0);

    // Traer TODAS las ventas recientes (sin filtrar por fecha en query para evitar problemas de timezone)
    const ventasParaGrafico = await prisma.venta.findMany({
      orderBy: { fecha: "desc" },
      take: 500,
      select: { fecha: true, total: true },
    });

    /** Formato YYYY-MM-DD en hora local */
    const toLocalDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    // 14 días: desde inicioRango hasta hoy (inclusive)
    const diasMap: Record<string, { total: number; cantidad: number }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(inicioRango);
      d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      diasMap[key] = { total: 0, cantidad: 0 };
    }

    // Agregar ventas a cada día (usar fecha en hora local del servidor)
    for (const v of ventasParaGrafico) {
      const fechaVenta = new Date(v.fecha);
      const key = toLocalDateKey(fechaVenta);
      if (diasMap[key] !== undefined) {
        diasMap[key].total += Number(v.total);
        diasMap[key].cantidad += 1;
      }
    }

    const ventasUltimos14Dias = Object.entries(diasMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, data]) => ({
        fecha,
        label: new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
        }),
        total: data.total,
        cantidad: data.cantidad,
      }));

    // Por método de pago (mes)
    const porMetodoPago = ventasMes.reduce(
      (acc, v) => {
        const metodo = v.metodoPago;
        if (!acc[metodo]) acc[metodo] = { total: 0, cantidad: 0 };
        acc[metodo].total += Number(v.total);
        acc[metodo].cantidad += 1;
        return acc;
      },
      {} as Record<string, { total: number; cantidad: number }>
    );

    const METODOS_LABEL: Record<string, string> = {
      EFECTIVO: "Efectivo",
      TARJETA_DEBITO: "Tarjeta débito",
      TARJETA_CREDITO: "Tarjeta crédito",
      TRANSFERENCIA: "Transferencia",
      MERCADOPAGO: "Mercado Pago",
      MULTIPLE: "Múltiple",
    };

    const metodoPagoChart = Object.entries(porMetodoPago).map(([metodo, data]) => ({
      name: METODOS_LABEL[metodo] ?? metodo,
      value: data.total,
      cantidad: data.cantidad,
    }));

    // Productos bajo stock
    const productosBajoStock = await prisma.producto.findMany({
      where: { activo: true },
      select: {
        id: true,
        sku: true,
        nombre: true,
        stockActual: true,
        stockMinimo: true,
      },
    }).then((list) =>
      list.filter((p) => p.stockActual <= p.stockMinimo)
    );

    // Últimas ventas
    const ultimasVentas = await prisma.venta.findMany({
      take: 5,
      orderBy: { fecha: "desc" },
      select: {
        id: true,
        numeroVenta: true,
        fecha: true,
        total: true,
      },
    });

    // Deuda consignación (suma de ventas con items en consignación)
    const ventasConConsignacion = await prisma.venta.findMany({
      where: {
        items: { some: { esConsignacion: true } },
      },
      select: { deudaConsignacion: true },
    });
    const totalDeudaConsignacion = ventasConConsignacion.reduce(
      (s, v) => s + Number(v.deudaConsignacion ?? 0),
      0
    );

    // Resumen inventario
    const [totalProductos, productosActivos] = await Promise.all([
      prisma.producto.count(),
      prisma.producto.count({ where: { activo: true } }),
    ]);

    return NextResponse.json({
      resumen: {
        totalVentasMes,
        totalGananciaMes,
        cantidadVentasMes,
        totalVentasHoy,
        cantidadVentasHoy,
        totalDeudaConsignacion,
        totalProductos,
        productosActivos,
        productosBajoStock: productosBajoStock.length,
      },
      ventasUltimos14Dias,
      metodoPagoChart,
      productosBajoStock: productosBajoStock.slice(0, 5),
      ultimasVentas,
    });
  } catch (error) {
    console.error("Error dashboard:", error);
    return NextResponse.json(
      { error: "Error al cargar dashboard" },
      { status: 500 }
    );
  }
}
