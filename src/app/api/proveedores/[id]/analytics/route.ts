import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itemsDeudaPendiente } from "@/lib/consignacionHelpers";

/**
 * GET /api/proveedores/[id]/analytics
 * Devuelve estadísticas detalladas del proveedor: productos, ventas, deuda, rendiciones.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proveedorId } = await params;

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true, nombre: true, tipoProveedor: true },
    });

    if (!proveedor) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const esConsignacion = proveedor.tipoProveedor === "CONSIGNACION";

    // Productos del proveedor (en nuestro dominio/inventario)
    const productos = await prisma.producto.findMany({
      where: { proveedorId },
      select: {
        id: true,
        sku: true,
        nombre: true,
        stockActual: true,
        stockMinimo: true,
        precioVenta: true,
        precioCompra: true,
        enConsignacion: true,
        activo: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    const valorInventario = productos.reduce(
      (s, p) => s + Number(p.precioVenta ?? 0) * p.stockActual,
      0
    );
    const valorInventarioCosto = productos.reduce(
      (s, p) => s + Number(p.precioCompra ?? 0) * p.stockActual,
      0
    );

    // Ventas: items vendidos de este proveedor (ItemVenta con proveedorId)
    const itemsVenta = await prisma.itemVenta.findMany({
      where: {
        proveedorId,
        venta: { anulada: false },
      },
      select: {
        subtotal: true,
        deudaProveedor: true,
        esConsignacion: true,
        venta: {
          select: {
            id: true,
            numeroVenta: true,
            fecha: true,
            total: true,
          },
        },
      },
    });

    const totalVendido = itemsVenta.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
    const cantidadVentas = [...new Set(itemsVenta.map((i) => i.venta.id))].length;

    // Deuda pendiente (solo consignación)
    let deudaPendiente = 0;
    if (esConsignacion) {
      const itemsPendientes = await itemsDeudaPendiente(proveedorId);
      deudaPendiente = itemsPendientes.reduce(
        (s, i) => s + Number(i.deudaProveedor ?? 0),
        0
      );
    }

    // Rendiciones
    const rendiciones = await prisma.rendicion.findMany({
      where: { proveedorId },
      select: {
        id: true,
        numeroRendicion: true,
        fechaDesde: true,
        fechaHasta: true,
        fechaRendicion: true,
        totalVendido: true,
        totalARendir: true,
        comisionShop: true,
        estado: true,
      },
      orderBy: { fechaRendicion: "desc" },
      take: 10,
    });

    const totalRendido = await prisma.rendicion.aggregate({
      where: { proveedorId },
      _sum: { totalARendir: true },
    });
    const sumaTotalRendido = Number(totalRendido._sum.totalARendir ?? 0);

    const totalVendidoEnRendiciones = await prisma.rendicion.aggregate({
      where: { proveedorId },
      _sum: { totalVendido: true },
    });
    const sumaTotalVendidoRendido = Number(totalVendidoEnRendiciones._sum.totalVendido ?? 0);

    // Órdenes de compra
    const ordenesCompra = await prisma.ordenCompra.findMany({
      where: { proveedorId },
      select: {
        id: true,
        numeroOrden: true,
        fecha: true,
        total: true,
      },
      orderBy: { fecha: "desc" },
      take: 10,
    });

    const totalCompras = await prisma.ordenCompra.aggregate({
      where: { proveedorId },
      _sum: { total: true },
    });
    const sumaTotalCompras = Number(totalCompras._sum.total ?? 0);

    // Últimas ventas con productos de este proveedor (agrupadas por venta)
    const ventasRecientes = await prisma.venta.findMany({
      where: {
        anulada: false,
        items: { some: { proveedorId } },
      },
      select: {
        id: true,
        numeroVenta: true,
        fecha: true,
        total: true,
        items: {
          where: { proveedorId },
          select: {
            productoNombre: true,
            cantidad: true,
            subtotal: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
      take: 8,
    });

    return NextResponse.json({
      proveedor: {
        id: proveedor.id,
        nombre: proveedor.nombre,
        tipoProveedor: proveedor.tipoProveedor,
      },
      productos: {
        lista: productos.map((p) => ({
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          stockActual: p.stockActual,
          stockMinimo: p.stockMinimo,
          precioVenta: Number(p.precioVenta),
          precioCompra: p.precioCompra != null ? Number(p.precioCompra) : null,
          enConsignacion: p.enConsignacion,
          activo: p.activo,
          categoria: p.categoria?.nombre ?? null,
        })),
        cantidad: productos.length,
        cantidadActivos: productos.filter((p) => p.activo).length,
        valorInventario,
        valorInventarioCosto,
      },
      ventas: {
        totalVendido,
        cantidadVentas,
      },
      consignacion: esConsignacion
        ? {
            deudaPendiente,
            totalRendido: sumaTotalRendido,
            totalVendidoRendido: sumaTotalVendidoRendido,
            rendiciones: rendiciones.map((r) => ({
              id: r.id,
              numeroRendicion: r.numeroRendicion,
              fechaDesde: r.fechaDesde.toISOString(),
              fechaHasta: r.fechaHasta.toISOString(),
              fechaRendicion: r.fechaRendicion.toISOString(),
              totalVendido: Number(r.totalVendido),
              totalARendir: Number(r.totalARendir),
              comisionShop: Number(r.comisionShop),
              estado: r.estado,
            })),
          }
        : null,
      compras: {
        totalCompras: sumaTotalCompras,
        cantidadOrdenes: await prisma.ordenCompra.count({ where: { proveedorId } }),
        ultimas: ordenesCompra.map((o) => ({
          id: o.id,
          numeroOrden: o.numeroOrden,
          fecha: o.fecha.toISOString(),
          total: Number(o.total),
        })),
      },
      ventasRecientes: ventasRecientes.map((v) => ({
        id: v.id,
        numeroVenta: v.numeroVenta,
        fecha: v.fecha.toISOString(),
        total: Number(v.total),
        itemsProveedor: v.items.map((i) => ({
          productoNombre: i.productoNombre,
          cantidad: i.cantidad,
          subtotal: Number(i.subtotal),
        })),
        subtotalProveedor: v.items.reduce((s, i) => s + Number(i.subtotal), 0),
      })),
    });
  } catch (error) {
    console.error("Error obteniendo analytics proveedor:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
