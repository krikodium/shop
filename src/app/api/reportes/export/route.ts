import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MetodoPago, Prisma } from "@prisma/client";
import { GET as obtenerReporte } from "@/app/api/reportes/route";
import { inicioDiaNegocio, siguienteDia } from "@/lib/fechasNegocio";
import { dinero, resumenVentas, sumarImportes } from "@/lib/resumenFinanciero";

function csv(valor: unknown) {
  const texto = valor == null ? "" : String(valor);
  // El archivo puede abrirse en Excel: evitar fórmulas desde datos de clientas/notas.
  const seguro = /^\s*[=+@-]/.test(texto) || /^[\t\r\n]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const validacionUrl = new URL(url); validacionUrl.searchParams.set("tipo", "ventas");
  const validacion = await obtenerReporte(new Request(validacionUrl, { headers: request.headers }));
  if (!validacion.ok) return validacion;
  const desde = url.searchParams.get("desde"), hasta = url.searchParams.get("hasta");
  const metodo = url.searchParams.get("metodoPago"), proveedorId = url.searchParams.get("proveedorId"), categoriaId = url.searchParams.get("categoriaId");
  const where: Prisma.VentaWhereInput = { anulada: false, fecha: {
    ...(desde ? { gte: inicioDiaNegocio(desde) } : {}), ...(hasta ? { lt: inicioDiaNegocio(siguienteDia(hasta)) } : {}),
  }, ...(metodo && metodo !== "__all__" ? { pagos: { some: { metodoPago: metodo as MetodoPago } } } : {}) };
  const filtroItems: Prisma.ItemVentaWhereInput = {
    ...(proveedorId && proveedorId !== "__all__" ? { OR: [{ proveedorId }, { producto: { proveedorId } }] } : {}),
    ...(categoriaId && categoriaId !== "__all__" ? { producto: { categoriaId } } : {}),
  };
  if (Object.keys(filtroItems).length) where.items = { some: filtroItems };
  const ventas = await prisma.venta.findMany({ where, orderBy: { fecha: "desc" }, include: { pagos: true, cliente: { select: { nombre: true } } } });
  const filas = [["numeroVenta", "fechaVenta", "clienta", "vendidoARS", "cobradoAcumuladoARS", "saldoARS", "estadoPago", "usdRecibidosAcumulados", "alcance"].map(csv).join(",")];
  for (const v of ventas) {
    const resumen = resumenVentas([v]);
    filas.push([v.numeroVenta, v.fecha.toISOString(), v.cliente?.nombre ?? v.clienteNombre,
      v.total.toFixed(2), resumen.totalCobradoVentas, resumen.saldoPendiente, v.estadoPago,
      dinero(sumarImportes(v.pagos.map(p => p.montoUsd ?? 0))).toFixed(2),
      "Venta completa; cobrado acumulado incluye pagos posteriores al período de venta",
    ].map(csv).join(","));
  }
  return new NextResponse("\uFEFF" + filas.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="ventas_${desde ?? "inicio"}_${hasta ?? "fin"}.csv"` } });
}
