import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    const mes = searchParams.get("mes"); // YYYY-MM
    const ano = searchParams.get("ano");

    let fechaDesde: Date;
    let fechaHasta: Date;

    if (mes && ano) {
      const year = parseInt(ano, 10);
      const month = parseInt(mes, 10);
      fechaDesde = new Date(year, month - 1, 1);
      fechaHasta = new Date(year, month, 0);
    } else {
      const now = new Date();
      fechaDesde = new Date(now.getFullYear(), now.getMonth(), 1);
      fechaHasta = new Date();
    }

    const vendedores = await prisma.user.findMany({
      where: { role: "VENDEDOR" },
      select: {
        id: true,
        name: true,
        email: true,
        horarioEntrada: true,
        horarioSalida: true,
        diasTrabajo: true,
      },
    });

    const stats = await Promise.all(
      vendedores.map(async (v) => {
        const jornadas = await prisma.jornadaLaboral.findMany({
          where: {
            userId: v.id,
            fecha: { gte: fechaDesde, lte: fechaHasta },
          },
          orderBy: { fecha: "asc" },
        });

        const ventas = await prisma.venta.count({
          where: {
            usuarioId: v.id,
            fecha: { gte: fechaDesde, lte: fechaHasta },
          },
        });

        const totalVentas = await prisma.venta.aggregate({
          where: {
            usuarioId: v.id,
            fecha: { gte: fechaDesde, lte: fechaHasta },
          },
          _sum: { total: true },
        });

        return {
          id: v.id,
          name: v.name,
          email: v.email,
          horarioEntrada: v.horarioEntrada,
          horarioSalida: v.horarioSalida,
          diasTrabajo: v.diasTrabajo,
          diasTrabajados: jornadas.length,
          cantidadVentas: ventas,
          totalVentas: Number(totalVentas._sum.total ?? 0),
        };
      })
    );

    return NextResponse.json({
      fechaDesde,
      fechaHasta,
      vendedores: stats,
    });
  } catch (error) {
    console.error("Error estadísticas vendedores:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
