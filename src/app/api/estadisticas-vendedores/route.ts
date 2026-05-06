import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DOW_LABEL: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

function resolveDateRange(mes: string | null, ano: string | null) {
  if (mes && ano) {
    const year = parseInt(ano, 10);
    const month = parseInt(mes, 10);
    return {
      fechaDesde: new Date(year, month - 1, 1),
      fechaHasta: new Date(year, month, 0),
    };
  }
  const now = new Date();
  return {
    fechaDesde: new Date(now.getFullYear(), now.getMonth(), 1),
    fechaHasta: new Date(),
  };
}

function previousMonthRange(fechaDesde: Date) {
  const y = fechaDesde.getFullYear();
  const m0 = fechaDesde.getMonth();
  const prevDesde = new Date(y, m0 - 1, 1);
  const prevHasta = new Date(y, m0, 0);
  return { prevDesde, prevHasta };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede ver estadísticas" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");
    const vendedorIdParam = searchParams.get("vendedorId");

    const { fechaDesde, fechaHasta } = resolveDateRange(mes, ano);
    const { prevDesde, prevHasta } = previousMonthRange(fechaDesde);

    const vendedoresLista = await prisma.user.findMany({
      where: { role: "VENDEDOR" },
      select: {
        id: true,
        name: true,
        email: true,
        horarioEntrada: true,
        horarioSalida: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    const vendedoresDisponibles = vendedoresLista.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
    }));

    if (vendedoresLista.length === 0) {
      return NextResponse.json({
        fechaDesde,
        fechaHasta,
        vendedorId: null,
        vendedor: null,
        vendedoresDisponibles: [],
        resumen: {
          totalMonto: 0,
          cantidadVentas: 0,
          ticketPromedio: 0,
          margenPorcentaje: 0,
        },
        comparacionMesAnterior: null,
        ventasPorDia: [],
        ventasPorMetodoPago: [],
        ventasPorDiaSemana: [],
      });
    }

    let targetUserId: string;
    if (vendedorIdParam) {
      const ok = vendedoresLista.some((v) => v.id === vendedorIdParam);
      if (!ok) {
        return NextResponse.json({ error: "Vendedor no válido" }, { status: 400 });
      }
      targetUserId = vendedorIdParam;
    } else {
      targetUserId = vendedoresLista[0].id;
    }

    const vendedorRow = vendedoresLista.find((v) => v.id === targetUserId)!;

    const [
      diasTrabajados,
      ventaPeriodo,
      ventasPorMetodoPagoRows,
      ventasPorDiaRows,
      ventasPorDowRows,
      ventaMesAnterior,
    ] = await Promise.all([
      prisma.jornadaLaboral.count({
        where: {
          userId: targetUserId,
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
      }),
      prisma.venta.aggregate({
        where: {
          usuarioId: targetUserId,
          anulada: false,
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
        _count: { _all: true },
        _sum: { total: true, gananciaBruta: true },
      }),
      prisma.venta.groupBy({
        by: ["metodoPago"],
        where: {
          usuarioId: targetUserId,
          anulada: false,
          fecha: { gte: fechaDesde, lte: fechaHasta },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ dia: Date; total: unknown; cnt: unknown }>>(
        Prisma.sql`
          SELECT ("fecha" AT TIME ZONE 'UTC')::date AS dia,
                 SUM("total")::double precision AS total,
                 COUNT(*)::int AS cnt
          FROM "Venta"
          WHERE "anulada" = false
            AND "fecha" >= ${fechaDesde}
            AND "fecha" <= ${fechaHasta}
            AND "usuarioId" = ${targetUserId}
          GROUP BY 1
          ORDER BY 1
        `
      ),
      prisma.$queryRaw<Array<{ isodow: unknown; total: unknown; cnt: unknown }>>(
        Prisma.sql`
          SELECT EXTRACT(ISODOW FROM ("fecha" AT TIME ZONE 'UTC'))::int AS isodow,
                 SUM("total")::double precision AS total,
                 COUNT(*)::int AS cnt
          FROM "Venta"
          WHERE "anulada" = false
            AND "fecha" >= ${fechaDesde}
            AND "fecha" <= ${fechaHasta}
            AND "usuarioId" = ${targetUserId}
          GROUP BY 1
          ORDER BY 1
        `
      ),
      prisma.venta.aggregate({
        where: {
          usuarioId: targetUserId,
          anulada: false,
          fecha: { gte: prevDesde, lte: prevHasta },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const cantidadVentas = ventaPeriodo._count._all;
    const totalVentas = Number(ventaPeriodo._sum.total ?? 0);
    const gananciaBruta = Number(ventaPeriodo._sum.gananciaBruta ?? 0);
    const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;
    const margenPorcentaje =
      totalVentas > 0 ? Math.round((gananciaBruta / totalVentas) * 10000) / 100 : 0;

    const prevTotal = Number(ventaMesAnterior._sum.total ?? 0);
    const prevCantidad = ventaMesAnterior._count._all;
    let variacionMontoPct: number | null = null;
    if (prevTotal > 0) {
      variacionMontoPct = Math.round(((totalVentas - prevTotal) / prevTotal) * 10000) / 100;
    } else if (totalVentas > 0) {
      variacionMontoPct = null;
    }

    const ventasPorDia = ventasPorDiaRows.map((r) => ({
      fecha:
        r.dia instanceof Date ? r.dia.toISOString().slice(0, 10) : String(r.dia),
      total: Number(r.total),
      cantidad: Number(r.cnt),
    }));

    const ventasPorMetodoPago = ventasPorMetodoPagoRows.map((row) => ({
      metodoPago: row.metodoPago,
      total: Number(row._sum.total ?? 0),
      cantidad: row._count._all,
    }));

    const byDow = new Map<number, { total: number; cantidad: number }>();
    for (const row of ventasPorDowRows) {
      const d = Number(row.isodow);
      if (d >= 1 && d <= 7) {
        byDow.set(d, {
          total: Number(row.total),
          cantidad: Number(row.cnt),
        });
      }
    }
    const ventasPorDiaSemana = [1, 2, 3, 4, 5, 6, 7].map((isodow) => ({
      isodow,
      label: DOW_LABEL[isodow],
      total: byDow.get(isodow)?.total ?? 0,
      cantidad: byDow.get(isodow)?.cantidad ?? 0,
    }));

    return NextResponse.json({
      fechaDesde,
      fechaHasta,
      vendedorId: targetUserId,
      vendedor: {
        id: vendedorRow.id,
        name: vendedorRow.name,
        email: vendedorRow.email,
        horarioEntrada: vendedorRow.horarioEntrada,
        horarioSalida: vendedorRow.horarioSalida,
        diasTrabajados,
        cantidadVentas,
        totalVentas,
        gananciaBruta,
      },
      vendedoresDisponibles,
      resumen: {
        totalMonto: totalVentas,
        cantidadVentas,
        ticketPromedio,
        margenPorcentaje,
      },
      comparacionMesAnterior: {
        totalMonto: prevTotal,
        cantidadVentas: prevCantidad,
        variacionMontoPct,
      },
      ventasPorDia,
      ventasPorMetodoPago,
      ventasPorDiaSemana,
    });
  } catch (error) {
    console.error("Error estadísticas vendedores:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
