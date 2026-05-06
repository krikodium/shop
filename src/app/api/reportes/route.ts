import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ventaFindManySafe } from "@/lib/ventaFindManySafe";

type RangoFechas = {
  desde: Date | null;
  hasta: Date | null;
};

type FiltrosReporte = {
  metodoPago: string | null;
  proveedorId: string | null;
  categoriaId: string | null;
};

function getPreviousRange(rango: RangoFechas): RangoFechas | null {
  if (!rango.desde || !rango.hasta) return null;
  const msDia = 24 * 60 * 60 * 1000;
  const duracionMs = rango.hasta.getTime() - rango.desde.getTime();
  const desdeAnterior = new Date(rango.desde.getTime() - duracionMs - msDia);
  const hastaAnterior = new Date(rango.desde.getTime() - msDia);
  return {
    desde: new Date(desdeAnterior.toISOString().slice(0, 10) + "T00:00:00.000"),
    hasta: new Date(hastaAnterior.toISOString().slice(0, 10) + "T23:59:59.999"),
  };
}

function buildVentaWhere(
  rango: RangoFechas,
  filtros: FiltrosReporte
): Prisma.VentaWhereInput {
  const where: Prisma.VentaWhereInput = { anulada: false };
  if (rango.desde || rango.hasta) {
    where.fecha = {
      ...(rango.desde ? { gte: rango.desde } : {}),
      ...(rango.hasta ? { lte: rango.hasta } : {}),
    };
  }
  if (filtros.metodoPago) {
    where.OR = [
      { metodoPago: filtros.metodoPago as Prisma.MetodoPago },
      { metodoPagoSecundario: filtros.metodoPago as Prisma.MetodoPago },
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
    where.items = {
      some: {
        AND: andItems,
      },
    };
  }
  return where;
}

function delta(actual: number, anterior: number) {
  const d = actual - anterior;
  const pct = anterior !== 0 ? (d / anterior) * 100 : null;
  return { actual, anterior, delta: d, deltaPct: pct };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo"); // ventas | inventario | rentabilidad
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const metodoPago = searchParams.get("metodoPago");
    const proveedorId = searchParams.get("proveedorId");
    const categoriaId = searchParams.get("categoriaId");
    const comparar = searchParams.get("comparar") === "true";

    const rango: RangoFechas = {
      desde: desde ? new Date(desde + "T00:00:00.000") : null,
      hasta: hasta ? new Date(hasta + "T23:59:59.999") : null,
    };
    const filtros: FiltrosReporte = {
      metodoPago: metodoPago && metodoPago !== "__all__" ? metodoPago : null,
      proveedorId: proveedorId && proveedorId !== "__all__" ? proveedorId : null,
      categoriaId: categoriaId && categoriaId !== "__all__" ? categoriaId : null,
    };

    if (tipo === "ventas") {
      const where = buildVentaWhere(rango, filtros);

      type VentaRepFila = {
        total: unknown;
        subtotal: unknown;
        descuento: unknown;
        costoTotal: unknown;
        gananciaBruta: unknown;
        margenPorcentaje: unknown;
        metodoPago: string;
        metodoPagoSecundario: string | null;
        montoPago1Ars: unknown;
        montoPago2Ars: unknown;
        usdPago1: unknown;
        usdPago2: unknown;
        cotizacionUsd: unknown;
        fecha: Date;
      };
      type VentaRepBasica = Omit<
        VentaRepFila,
        | "metodoPagoSecundario"
        | "montoPago1Ars"
        | "montoPago2Ars"
        | "usdPago1"
        | "usdPago2"
        | "cotizacionUsd"
      >;

      const ventas = await ventaFindManySafe<VentaRepFila, VentaRepBasica>(prisma, {
        where,
        selectFull: {
          total: true,
          subtotal: true,
          descuento: true,
          costoTotal: true,
          gananciaBruta: true,
          margenPorcentaje: true,
          metodoPago: true,
          metodoPagoSecundario: true,
          montoPago1Ars: true,
          montoPago2Ars: true,
          usdPago1: true,
          usdPago2: true,
          cotizacionUsd: true,
          fecha: true,
        },
        selectBasic: {
          total: true,
          subtotal: true,
          descuento: true,
          costoTotal: true,
          gananciaBruta: true,
          margenPorcentaje: true,
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
            cotizacionUsd: null,
          })),
      });

      const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
      const totalCosto = ventas.reduce((s, v) => s + Number(v.costoTotal), 0);
      const totalGanancia = ventas.reduce((s, v) => s + Number(v.gananciaBruta), 0);
      const margenProm = ventas.length > 0
        ? ventas.reduce((s, v) => s + Number(v.margenPorcentaje), 0) / ventas.length
        : 0;

      const porMetodoPago = ventas.reduce(
        (acc, v) => {
          const total = Number(v.total);
          const sec = v.metodoPagoSecundario;
          const m1 = v.montoPago1Ars != null ? Number(v.montoPago1Ars) : null;
          const m2 = v.montoPago2Ars != null ? Number(v.montoPago2Ars) : null;
          if (sec && m1 != null && m2 != null) {
            const add = (metodo: string, monto: number, cuentaVenta: boolean) => {
              if (!acc[metodo]) acc[metodo] = { cantidad: 0, total: 0 };
              acc[metodo].total += monto;
              if (cuentaVenta) acc[metodo].cantidad += 1;
            };
            add(v.metodoPago, m1, true);
            add(sec, m2, false);
          } else {
            const metodo = v.metodoPago;
            if (!acc[metodo]) acc[metodo] = { cantidad: 0, total: 0 };
            acc[metodo].cantidad += 1;
            acc[metodo].total += total;
          }
          return acc;
        },
        {} as Record<string, { cantidad: number; total: number }>
      );

      let totalUsdRecibido = 0;
      let equivalenteArsDesdeUsd = 0;
      let ventasConUsd = 0;
      for (const v of ventas) {
        const u1 = v.usdPago1 != null ? Number(v.usdPago1) : 0;
        const u2 = v.usdPago2 != null ? Number(v.usdPago2) : 0;
        const sumUsd = u1 + u2;
        if (sumUsd > 0) {
          ventasConUsd += 1;
          totalUsdRecibido += sumUsd;
          const cot = v.cotizacionUsd != null ? Number(v.cotizacionUsd) : 0;
          if (cot > 0) equivalenteArsDesdeUsd += sumUsd * cot;
        }
      }

      const itemsRanking = await prisma.itemVenta.findMany({
        where: { venta: where },
        select: {
          productoId: true,
          productoNombre: true,
          productoSku: true,
          subtotal: true,
          costoTotal: true,
          cantidad: true,
          proveedorId: true,
          producto: {
            select: {
              proveedorId: true,
            },
          },
        },
      });

      const topProductosMap: Record<
        string,
        { nombre: string; sku: string; cantidad: number; venta: number; ganancia: number }
      > = {};
      const topProveedoresMap: Record<string, { proveedorId: string; venta: number }> = {};

      for (const item of itemsRanking) {
        if (!topProductosMap[item.productoId]) {
          topProductosMap[item.productoId] = {
            nombre: item.productoNombre,
            sku: item.productoSku,
            cantidad: 0,
            venta: 0,
            ganancia: 0,
          };
        }
        topProductosMap[item.productoId].cantidad += item.cantidad;
        topProductosMap[item.productoId].venta += Number(item.subtotal);
        topProductosMap[item.productoId].ganancia +=
          Number(item.subtotal) - Number(item.costoTotal);

        const pid = item.proveedorId ?? item.producto?.proveedorId ?? "SIN_PROVEEDOR";
        if (!topProveedoresMap[pid]) {
          topProveedoresMap[pid] = { proveedorId: pid, venta: 0 };
        }
        topProveedoresMap[pid].venta += Number(item.subtotal);
      }

      const topProductosPorVenta = Object.values(topProductosMap)
        .sort((a, b) => b.venta - a.venta)
        .slice(0, 10);
      const topProductosPorGanancia = Object.values(topProductosMap)
        .sort((a, b) => b.ganancia - a.ganancia)
        .slice(0, 10);
      const topProveedores = Object.values(topProveedoresMap)
        .sort((a, b) => b.venta - a.venta)
        .slice(0, 10);

      let comparativa = null;
      if (comparar) {
        const rangoAnterior = getPreviousRange(rango);
        if (rangoAnterior) {
          const whereAnterior = buildVentaWhere(rangoAnterior, filtros);
          const ventasAnterior = await ventaFindManySafe<VentaRepFila, VentaRepBasica>(prisma, {
            where: whereAnterior,
            selectFull: {
              total: true,
              subtotal: true,
              descuento: true,
              costoTotal: true,
              gananciaBruta: true,
              margenPorcentaje: true,
              metodoPago: true,
              metodoPagoSecundario: true,
              montoPago1Ars: true,
              montoPago2Ars: true,
              usdPago1: true,
              usdPago2: true,
              cotizacionUsd: true,
              fecha: true,
            },
            selectBasic: {
              total: true,
              subtotal: true,
              descuento: true,
              costoTotal: true,
              gananciaBruta: true,
              margenPorcentaje: true,
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
                cotizacionUsd: null,
              })),
          });
          const totalVentasAnterior = ventasAnterior.reduce((s, v) => s + Number(v.total), 0);
          const totalGananciaAnterior = ventasAnterior.reduce(
            (s, v) => s + Number(v.gananciaBruta),
            0
          );
          const margenAnterior =
            ventasAnterior.length > 0
              ? ventasAnterior.reduce((s, v) => s + Number(v.margenPorcentaje), 0) /
                ventasAnterior.length
              : 0;
          comparativa = {
            totalVentas: delta(totalVentas, totalVentasAnterior),
            totalGanancia: delta(totalGanancia, totalGananciaAnterior),
            margenPromedio: delta(margenProm, margenAnterior),
          };
        }
      }

      return NextResponse.json({
        totalVentas,
        cantidadVentas: ventas.length,
        totalCosto,
        totalGanancia,
        margenPromedio: margenProm,
        porMetodoPago,
        usd: {
          totalUsdRecibido,
          ventasConUsd,
          /** Suma de (USD × cotización) por venta donde hubo USD y cotización guardada */
          equivalenteArsDesdeUsd,
        },
        rankings: {
          topProductosPorVenta,
          topProductosPorGanancia,
          topProveedores,
        },
        comparativa,
      });
    }

    if (tipo === "inventario") {
      const productos = await prisma.producto.findMany({
        where: {
          activo: true,
          ...(filtros.proveedorId ? { proveedorId: filtros.proveedorId } : {}),
          ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
        },
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
        comparativa: null,
      });
    }

    if (tipo === "rentabilidad") {
      const where = buildVentaWhere(rango, filtros);

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

      let comparativa = null;
      if (comparar) {
        const rangoAnterior = getPreviousRange(rango);
        if (rangoAnterior) {
          const whereAnterior = buildVentaWhere(rangoAnterior, filtros);
          const ventasAnterior = await prisma.venta.findMany({
            where: whereAnterior,
            include: { items: true },
          });
          const totalVentasAnterior = ventasAnterior.reduce((s, v) => s + Number(v.total), 0);
          const totalCostoAnterior = ventasAnterior.reduce((s, v) => s + Number(v.costoTotal), 0);
          const totalGananciaAnterior = ventasAnterior.reduce(
            (s, v) => s + Number(v.gananciaBruta),
            0
          );
          const margenAnterior =
            totalVentasAnterior > 0
              ? (totalGananciaAnterior / totalVentasAnterior) * 100
              : 0;
          comparativa = {
            totalVentas: delta(totalVentas, totalVentasAnterior),
            totalCosto: delta(totalCosto, totalCostoAnterior),
            totalGanancia: delta(totalGanancia, totalGananciaAnterior),
            margenPorcentaje: delta(margenPorc, margenAnterior),
          };
        }
      }

      return NextResponse.json({
        totalVentas,
        totalCosto,
        totalGanancia,
        margenPorcentaje: margenPorc,
        porProducto: Object.values(porProducto).sort((a, b) => b.ganancia - a.ganancia),
        rankings: {
          topProductosPorGanancia: Object.values(porProducto)
            .sort((a, b) => b.ganancia - a.ganancia)
            .slice(0, 10),
          topProductosPorVenta: Object.values(porProducto)
            .sort((a, b) => b.venta - a.venta)
            .slice(0, 10),
        },
        comparativa,
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
