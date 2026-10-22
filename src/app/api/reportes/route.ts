import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, MetodoPago } from "@prisma/client";
import { z } from "zod";
import { inicioDiaNegocio, siguienteDia } from "@/lib/fechasNegocio";
import { dinero, resumenCobros, resumenVentas, sumarImportes } from "@/lib/resumenFinanciero";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Fecha inválida");
const consulta = z.object({
  tipo: z.enum(["ventas", "inventario", "rentabilidad"]), desde: fecha.optional(), hasta: fecha.optional(),
  metodoPago: z.enum(MetodoPago).optional(), proveedorId: z.string().max(100).optional(),
  categoriaId: z.string().max(100).optional(), comparar: z.enum(["true", "false"]).optional(),
}).refine(v => !v.desde || !v.hasta || v.desde <= v.hasta, "El rango de fechas es inválido");

function comparativa(actual: string, anterior: string) {
  const a = new Prisma.Decimal(actual), b = new Prisma.Decimal(anterior);
  return { actual: a.toNumber(), anterior: b.toNumber(), delta: a.minus(b).toNumber(),
    deltaPct: b.isZero() ? null : a.minus(b).div(b).mul(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber() };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    for (const key of ["metodoPago", "proveedorId", "categoriaId"]) if (params[key] === "__all__") delete params[key];
    const validacion = consulta.safeParse(params);
    if (!validacion.success) return NextResponse.json({ error: "Filtros inválidos" }, { status: 400 });
    const filtros = validacion.data;
    if (filtros.tipo === "inventario") {
      const productos = await prisma.producto.findMany({ where: { activo: true,
        ...(filtros.proveedorId ? { proveedorId: filtros.proveedorId } : {}),
        ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
      } });
      return NextResponse.json({ cantidadProductos: productos.length,
        valorInventarioCompra: dinero(sumarImportes(productos.map(p => new Prisma.Decimal(p.precioCompra ?? 0).mul(p.stockActual)))).toFixed(2),
        valorInventarioVenta: dinero(sumarImportes(productos.map(p => p.precioVenta.mul(p.stockActual)))).toFixed(2),
        productosBajoStock: productos.filter(p => p.stockActual <= p.stockMinimo).map(p => ({ id: p.id, nombre: p.nombre,
          sku: p.sku, stockActual: p.stockActual, stockMinimo: p.stockMinimo })), comparativa: null,
      });
    }

    const items: Prisma.ItemVentaWhereInput = {
      ...(filtros.proveedorId ? { OR: [{ proveedorId: filtros.proveedorId }, { producto: { proveedorId: filtros.proveedorId } }] } : {}),
      ...(filtros.categoriaId ? { producto: { categoriaId: filtros.categoriaId } } : {}),
    };
    const base: Prisma.VentaWhereInput = { anulada: false,
      ...(filtros.metodoPago ? { pagos: { some: { metodoPago: filtros.metodoPago } } } : {}),
      ...(filtros.proveedorId || filtros.categoriaId ? { items: { some: items } } : {}),
    };
    const rango = {
      ...(filtros.desde ? { gte: inicioDiaNegocio(filtros.desde) } : {}),
      ...(filtros.hasta ? { lt: inicioDiaNegocio(siguienteDia(filtros.hasta)) } : {}),
    };
    const where: Prisma.VentaWhereInput = { ...base, fecha: rango };
    const [ventas, cobros] = await Promise.all([
      prisma.venta.findMany({ where, include: { pagos: true, items: { include: { producto: { select: { proveedorId: true } } } } } }),
      prisma.pagoVenta.findMany({ where: { fecha: rango, venta: { ...base, pagos: undefined },
        ...(filtros.metodoPago ? { metodoPago: filtros.metodoPago } : {}),
      } }),
    ]);
    const resumen = resumenVentas(ventas), resumenPagos = resumenCobros(cobros);
    const totalCosto = dinero(sumarImportes(ventas.map(v => v.costoTotal)));
    const total = new Prisma.Decimal(resumen.totalVentas), ganancia = new Prisma.Decimal(resumen.totalGanancia);
    const margen = total.isZero() ? new Prisma.Decimal(0) : ganancia.div(total).mul(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const porProducto: Record<string, { nombre: string; sku: string; cantidad: number; venta: Prisma.Decimal; costo: Prisma.Decimal }> = {};
    const porProveedor: Record<string, Prisma.Decimal> = {};
    for (const v of ventas) for (const item of v.items) {
      const p = porProducto[item.productoId] ?? { nombre: item.productoNombre, sku: item.productoSku, cantidad: 0,
        venta: new Prisma.Decimal(0), costo: new Prisma.Decimal(0) };
      p.cantidad += item.cantidad; p.venta = p.venta.plus(item.subtotal); p.costo = p.costo.plus(item.costoTotal);
      porProducto[item.productoId] = p;
      const proveedor = item.proveedorId ?? item.producto.proveedorId ?? "SIN_PROVEEDOR";
      porProveedor[proveedor] = (porProveedor[proveedor] ?? new Prisma.Decimal(0)).plus(item.subtotal);
    }
    const productos = Object.values(porProducto).map(p => ({ nombre: p.nombre, sku: p.sku, cantidad: p.cantidad,
      venta: dinero(p.venta).toFixed(2), costo: dinero(p.costo).toFixed(2), ganancia: dinero(p.venta.minus(p.costo)).toFixed(2) }));
    const ordenar = (campo: "venta" | "ganancia") => [...productos].sort((a, b) => new Prisma.Decimal(b[campo]).cmp(a[campo]));
    let comparacion = null;
    if (filtros.comparar === "true" && filtros.desde && filtros.hasta) {
      const inicio = inicioDiaNegocio(filtros.desde), fin = inicioDiaNegocio(siguienteDia(filtros.hasta));
      const anteriores = await prisma.venta.findMany({ where: { ...base, fecha: { gte: new Date(inicio.getTime() - (fin.getTime() - inicio.getTime())), lt: inicio } }, include: { pagos: true } });
      const anterior = resumenVentas(anteriores), costoAnterior = sumarImportes(anteriores.map(v => v.costoTotal));
      const margenAnterior = new Prisma.Decimal(anterior.totalVentas).isZero() ? new Prisma.Decimal(0) : new Prisma.Decimal(anterior.totalGanancia).div(anterior.totalVentas).mul(100);
      comparacion = { totalVentas: comparativa(resumen.totalVentas, anterior.totalVentas),
        totalGanancia: comparativa(resumen.totalGanancia, anterior.totalGanancia), totalCosto: comparativa(totalCosto.toFixed(2), costoAnterior.toFixed(2)),
        margenPromedio: comparativa(margen.toFixed(2), margenAnterior.toFixed(2)), margenPorcentaje: comparativa(margen.toFixed(2), margenAnterior.toFixed(2)) };
    }
    return NextResponse.json({ ...resumen, alcance: "Ventas completas que contienen los productos filtrados, incluidos todos sus ítems y cobros", totalCobradoPeriodo: resumenPagos.totalCobrado,
      totalCosto: totalCosto.toFixed(2), margenPromedio: margen.toNumber(), margenPorcentaje: margen.toNumber(),
      porMetodoPago: resumenPagos.porMetodo,
      usd: { totalUsdRecibido: resumenPagos.totalUsd, ventasConUsd: resumenPagos.cantidadConUsd,
        equivalenteArsDesdeUsd: dinero(sumarImportes(cobros.filter(p => p.montoUsd != null).map(p => p.montoArs))).toFixed(2) },
      porProducto: ordenar("ganancia"), rankings: { topProductosPorVenta: ordenar("venta").slice(0, 10),
        topProductosPorGanancia: ordenar("ganancia").slice(0, 10), topProveedores: Object.entries(porProveedor)
          .sort(([, a], [, b]) => b.cmp(a)).slice(0, 10).map(([proveedorId, venta]) => ({ proveedorId, venta: dinero(venta).toFixed(2) })) },
      comparativa: comparacion,
    });
  } catch (error) {
    console.error("Error en reportes:", error);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}
