import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const accion = body.accion as string;

    const caja = await prisma.cajaChica.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: { movimientos: true },
    });

    if (!caja) {
      return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    }

    if (accion === "cerrar") {
      if (caja.estado === "CERRADA") {
        return NextResponse.json({ error: "La caja ya está cerrada" }, { status: 400 });
      }

      const totalIngresos = caja.movimientos
        .filter((m) => m.tipo === "INGRESO")
        .reduce((s, m) => s + Number(m.monto), 0);
      const totalEgresos = caja.movimientos
        .filter((m) => m.tipo === "EGRESO")
        .reduce((s, m) => s + Number(m.monto), 0);
      const saldoFinal =
        Number(caja.montoInicial) + totalIngresos - totalEgresos;

      const cerrada = await prisma.cajaChica.update({
        where: { id },
        data: {
          estado: "CERRADA",
          fechaCierre: new Date(),
        },
      });
      return NextResponse.json({
        ...cerrada,
        saldoFinal,
        totalIngresos,
        totalEgresos,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error cerrando caja:", error);
    return NextResponse.json(
      { error: "Error al cerrar caja" },
      { status: 500 }
    );
  }
}
