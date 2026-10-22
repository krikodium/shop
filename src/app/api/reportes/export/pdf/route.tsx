import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { GET as obtenerReporte } from "@/app/api/reportes/route";
import { ReportesPDF } from "@/components/pdf/ReportesPDF";
import { METODO_PAGO_LABEL } from "@/lib/constants";

/** PDF y pantalla comparten cálculos, permisos y fechas comerciales. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ventasUrl = new URL(url); ventasUrl.searchParams.set("tipo", "ventas");
  const inventarioUrl = new URL(url); inventarioUrl.searchParams.set("tipo", "inventario");
  const [ventasRes, inventarioRes] = await Promise.all([
    obtenerReporte(new Request(ventasUrl, { headers: request.headers })),
    obtenerReporte(new Request(inventarioUrl, { headers: request.headers })),
  ]);
  if (!ventasRes.ok) return ventasRes;
  if (!inventarioRes.ok) return inventarioRes;
  const ventas = await ventasRes.json(), inventario = await inventarioRes.json();
  const proveedorId = url.searchParams.get("proveedorId"), categoriaId = url.searchParams.get("categoriaId");
  const [proveedor, categoria] = await Promise.all([
    proveedorId && proveedorId !== "__all__" ? prisma.proveedor.findUnique({ where: { id: proveedorId }, select: { nombre: true } }) : null,
    categoriaId && categoriaId !== "__all__" ? prisma.categoria.findUnique({ where: { id: categoriaId }, select: { nombre: true } }) : null,
  ]);
  const desde = url.searchParams.get("desde") ?? "inicio", hasta = url.searchParams.get("hasta") ?? "hoy";
  const metodo = url.searchParams.get("metodoPago");
  const ranking = (filas: { nombre: string; sku: string; venta: string; ganancia: string }[], campo: "venta" | "ganancia") =>
    filas.map(p => ({ nombre: p.nombre, sku: p.sku, valor: Number(p[campo]) }));
  const buffer = await renderToBuffer(<ReportesPDF periodo={{ desde, hasta }}
    filtros={{ metodoPago: metodo && metodo !== "__all__" ? METODO_PAGO_LABEL[metodo] ?? metodo : null, proveedor: proveedor?.nombre, categoria: categoria?.nombre }}
    ventas={{ totalVentas: Number(ventas.totalVentas), cantidadVentas: ventas.cantidadVentas,
      totalGanancia: Number(ventas.totalGanancia), margenPromedio: ventas.margenPromedio,
      totalCobradoPeriodo: Number(ventas.totalCobradoPeriodo), saldoPendiente: Number(ventas.saldoPendiente),
      topPorVenta: ranking(ventas.rankings.topProductosPorVenta, "venta"), topPorGanancia: ranking(ventas.rankings.topProductosPorGanancia, "ganancia") }}
    inventario={{ cantidadProductos: inventario.cantidadProductos, valorInventarioCompra: Number(inventario.valorInventarioCompra),
      valorInventarioVenta: Number(inventario.valorInventarioVenta), cantidadBajoStock: inventario.productosBajoStock.length }}
    rentabilidad={{ totalVentas: Number(ventas.totalVentas), totalCosto: Number(ventas.totalCosto),
      totalGanancia: Number(ventas.totalGanancia), margenPorcentaje: ventas.margenPorcentaje }} />);
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="reporte_${desde}_${hasta}.pdf"` } });
}
