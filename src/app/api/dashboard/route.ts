import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { totalDeudaConsignacionPendiente } from "@/lib/consignacionHelpers";
import { ventaFindManySafe } from "@/lib/ventaFindManySafe";

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

    type VentaMesFila = {
      total: unknown;
      gananciaBruta: unknown;
      metodoPago: string;
      metodoPagoSecundario: string | null;
      montoPago1Ars: unknown;
      montoPago2Ars: unknown;
      usdPago1: unknown;
      usdPago2: unknown;
      fecha: Date;
    };
    type VentaMesBasica = Pick<
      VentaMesFila,
      "total" | "gananciaBruta" | "metodoPago" | "fecha"
    >;

    const ventasMes = await ventaFindManySafe<VentaMesFila, VentaMesBasica>(prisma, {
      where: { fecha: { gte: inicioMes }, anulada: false },
      selectFull: {
        total: true,
        gananciaBruta: true,
        metodoPago: true,
        metodoPagoSecundario: true,
        montoPago1Ars: true,
        montoPago2Ars: true,
        usdPago1: true,
        usdPago2: true,
        fecha: true,
      },
      selectBasic: {
        total: true,
        gananciaBruta: true,
        metodoPago: true,
        fecha: true,
      },
      mapBasic: (rows) =>
        rows.map((v) => ({
          ...v,
          metodoPagoSecundario: null,
          montoPago1Ars: null,
          montoPago2Ars: null,
          usdPago1: null,
          usdPago2: null,
        })),
    });

    const totalVentasMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
    const totalGananciaMes = ventasMes.reduce((s, v) => s + Number(v.gananciaBruta), 0);
    const cantidadVentasMes = ventasMes.length;

    const sumaUsdVenta = (v: VentaMesFila) =>
      (v.usdPago1 != null ? Number(v.usdPago1) : 0) +
      (v.usdPago2 != null ? Number(v.usdPago2) : 0);

    const totalUsdRecibidoMes = ventasMes.reduce((s, v) => s + sumaUsdVenta(v), 0);
    const ventasConUsdMes = ventasMes.filter((v) => sumaUsdVenta(v) > 0).length;

    // Ventas de hoy
    const ventasHoy = ventasMes.filter(
      (v) => v.fecha >= inicioDia && v.fecha <= finDia
    );
    const totalVentasHoy = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
    const cantidadVentasHoy = ventasHoy.length;
    const totalUsdRecibidoHoy = ventasHoy.reduce((s, v) => s + sumaUsdVenta(v), 0);
    const ventasConUsdHoy = ventasHoy.filter((v) => sumaUsdVenta(v) > 0).length;

    // Ventas por día (últimos 14 días, incluyendo hoy)
    const hoy = new Date();
    const inicioRango = new Date(hoy);
    inicioRango.setDate(inicioRango.getDate() - 13);
    inicioRango.setHours(0, 0, 0, 0);

    // Traer TODAS las ventas recientes (sin filtrar por fecha en query para evitar problemas de timezone)
    const ventasParaGrafico = await prisma.venta.findMany({
      where: { anulada: false },
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

    // Por método de pago (mes): si hay pago dividido, reparte montos entre métodos
    const porMetodoPago = ventasMes.reduce(
      (acc, v) => {
        const total = Number(v.total);
        const sec = v.metodoPagoSecundario;
        const m1 = v.montoPago1Ars != null ? Number(v.montoPago1Ars) : null;
        const m2 = v.montoPago2Ars != null ? Number(v.montoPago2Ars) : null;
        if (sec && m1 != null && m2 != null) {
          const add = (metodo: string, monto: number, cuentaVenta: boolean) => {
            if (!acc[metodo]) acc[metodo] = { total: 0, cantidad: 0 };
            acc[metodo].total += monto;
            if (cuentaVenta) acc[metodo].cantidad += 1;
          };
          add(v.metodoPago, m1, true);
          add(sec, m2, false);
        } else {
          const metodo = v.metodoPago;
          if (!acc[metodo]) acc[metodo] = { total: 0, cantidad: 0 };
          acc[metodo].total += total;
          acc[metodo].cantidad += 1;
        }
        return acc;
      },
      {} as Record<string, { total: number; cantidad: number }>
    );

    const metodoPagoChart = Object.entries(porMetodoPago).map(([metodo, data]) => ({
      name: METODO_PAGO_LABEL[metodo] ?? metodo,
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
    let ultimasVentasJson: Array<{
      id: string;
      numeroVenta: string;
      fecha: Date;
      total: unknown;
      tieneUsd: boolean;
      pagoDividido: boolean;
    }>;
    try {
      const ultimasVentas = await prisma.venta.findMany({
        where: { anulada: false },
        take: 5,
        orderBy: { fecha: "desc" },
        select: {
          id: true,
          numeroVenta: true,
          fecha: true,
          total: true,
          usdPago1: true,
          usdPago2: true,
          metodoPagoSecundario: true,
        },
      });
      ultimasVentasJson = ultimasVentas.map((v) => ({
        id: v.id,
        numeroVenta: v.numeroVenta,
        fecha: v.fecha,
        total: v.total,
        tieneUsd:
          (v.usdPago1 != null && Number(v.usdPago1) > 0) ||
          (v.usdPago2 != null && Number(v.usdPago2) > 0),
        pagoDividido: Boolean(v.metodoPagoSecundario),
      }));
    } catch {
      const ultimasVentas = await prisma.venta.findMany({
        where: { anulada: false },
        take: 5,
        orderBy: { fecha: "desc" },
        select: {
          id: true,
          numeroVenta: true,
          fecha: true,
          total: true,
        },
      });
      ultimasVentasJson = ultimasVentas.map((v) => ({
        ...v,
        tieneUsd: false,
        pagoDividido: false,
      }));
    }

    // Deuda consignación pendiente (solo items NO rendidos en rendiciones previas)
    const totalDeudaConsignacion = await totalDeudaConsignacionPendiente();

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
        totalUsdRecibidoMes,
        ventasConUsdMes,
        totalUsdRecibidoHoy,
        ventasConUsdHoy,
      },
      ventasUltimos14Dias,
      metodoPagoChart,
      productosBajoStock: productosBajoStock.slice(0, 5),
      ultimasVentas: ultimasVentasJson,
    });
  } catch (error) {
    console.error("Error dashboard:", error);
    return NextResponse.json(
      { error: "Error al cargar dashboard" },
      { status: 500 }
    );
  }
}
