import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

function escapeCsv(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV de ventas del período (columnas ARS + USD cuando existan en BD).
 * GET /api/reportes/export?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const fechaDesde = desde ? new Date(desde + "T00:00:00.000") : null;
  const fechaHasta = hasta ? new Date(hasta + "T23:59:59.999") : null;

  const where: Prisma.VentaWhereInput = { anulada: false };
  if (fechaDesde || fechaHasta) {
    where.fecha = {
      ...(fechaDesde ? { gte: fechaDesde } : {}),
      ...(fechaHasta ? { lte: fechaHasta } : {}),
    };
  }

  type Fila = {
    numeroVenta: string;
    fecha: Date;
    total: unknown;
    metodoPago: string;
    metodoPagoSecundario: string | null;
    usdPago1: unknown;
    usdPago2: unknown;
    cotizacionUsd: unknown;
  };

  let rows: Fila[];
  try {
    rows = await prisma.venta.findMany({
      where,
      orderBy: { fecha: "desc" },
      select: {
        numeroVenta: true,
        fecha: true,
        total: true,
        metodoPago: true,
        metodoPagoSecundario: true,
        usdPago1: true,
        usdPago2: true,
        cotizacionUsd: true,
      },
    });
  } catch {
    const basic = await prisma.venta.findMany({
      where,
      orderBy: { fecha: "desc" },
      select: {
        numeroVenta: true,
        fecha: true,
        total: true,
        metodoPago: true,
      },
    });
    rows = basic.map((r) => ({
      ...r,
      metodoPagoSecundario: null,
      usdPago1: null,
      usdPago2: null,
      cotizacionUsd: null,
    }));
  }

  const header = [
    "numeroVenta",
    "fecha",
    "totalARS",
    "metodoPago",
    "metodoPagoSecundario",
    "usdPago1",
    "usdPago2",
    "cotizacionUsd",
    "usdTotal",
    "pagoDividido",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    const u1 = r.usdPago1 != null ? Number(r.usdPago1) : 0;
    const u2 = r.usdPago2 != null ? Number(r.usdPago2) : 0;
    const usdTotal = u1 + u2;
    const line = [
      escapeCsv(r.numeroVenta),
      escapeCsv(new Date(r.fecha).toISOString()),
      escapeCsv(Number(r.total).toFixed(2)),
      escapeCsv(r.metodoPago),
      escapeCsv(r.metodoPagoSecundario ?? ""),
      escapeCsv(u1 || ""),
      escapeCsv(u2 || ""),
      escapeCsv(r.cotizacionUsd != null ? Number(r.cotizacionUsd) : ""),
      escapeCsv(usdTotal || ""),
      escapeCsv(r.metodoPagoSecundario ? "si" : "no"),
    ].join(",");
    lines.push(line);
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const name = `ventas_${desde ?? "inicio"}_${hasta ?? "fin"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
