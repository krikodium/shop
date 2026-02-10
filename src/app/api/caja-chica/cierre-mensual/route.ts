import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Resumen de cajas cerradas en un período (para cierre mensual).
 * Parámetros: mes, ano (YYYY-MM)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");

    if (!mes || !ano) {
      return NextResponse.json(
        { error: "Parámetros mes y ano requeridos (YYYY-MM)" },
        { status: 400 }
      );
    }

    const year = parseInt(ano, 10);
    const month = parseInt(mes, 10);
    const fechaDesde = new Date(year, month - 1, 1);
    const fechaHasta = new Date(year, month, 0, 23, 59, 59);

    const isAdmin = session.user.role === "ADMIN";
    const whereUser = isAdmin ? {} : { userId: session.user.id };

    const cajas = await prisma.cajaChica.findMany({
      where: {
        ...whereUser,
        estado: "CERRADA",
        fechaCierre: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        movimientos: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { fechaCierre: "desc" },
    });

    const resumen = cajas.map((c) => {
      const ingresos = c.movimientos
        .filter((m) => m.tipo === "INGRESO")
        .reduce((s, m) => s + Number(m.monto), 0);
      const egresos = c.movimientos
        .filter((m) => m.tipo === "EGRESO")
        .reduce((s, m) => s + Number(m.monto), 0);
      const saldoFinal = Number(c.montoInicial) + ingresos - egresos;
      return {
        id: c.id,
        user: c.user.name,
        fechaApertura: c.fechaApertura,
        fechaCierre: c.fechaCierre,
        montoInicial: Number(c.montoInicial),
        totalIngresos: ingresos,
        totalEgresos: egresos,
        saldoFinal,
      };
    });

    const totalIngresos = resumen.reduce((s, r) => s + r.totalIngresos, 0);
    const totalEgresos = resumen.reduce((s, r) => s + r.totalEgresos, 0);
    const totalMontoInicial = resumen.reduce((s, r) => s + r.montoInicial, 0);

    return NextResponse.json({
      mes: `${ano}-${mes}`,
      periodo: { fechaDesde, fechaHasta },
      cajas: resumen,
      totales: {
        montoInicial: totalMontoInicial,
        totalIngresos,
        totalEgresos,
        saldoFinal: totalMontoInicial + totalIngresos - totalEgresos,
      },
    });
  } catch (error) {
    console.error("Error cierre mensual:", error);
    return NextResponse.json(
      { error: "Error al obtener cierre mensual" },
      { status: 500 }
    );
  }
}
