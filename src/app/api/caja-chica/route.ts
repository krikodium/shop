import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const movimientoSchema = z.object({
  tipo: z.enum(["INGRESO", "EGRESO"]),
  monto: z.number().positive(),
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  concepto: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const cajaId = searchParams.get("cajaId");
    const todas = searchParams.get("todas") === "true";

    const isAdmin = session.user.role === "ADMIN";

    if (todas && isAdmin) {
      const cajas = await prisma.cajaChica.findMany({
        include: {
          movimientos: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { fechaApertura: "desc" },
        take: 100,
      });
      return NextResponse.json(cajas);
    }

    const targetUserId = userId && isAdmin ? userId : session.user.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    if (cajaId) {
      const caja = await prisma.cajaChica.findFirst({
        where: {
          id: cajaId,
          userId: isAdmin ? undefined : targetUserId,
        },
        include: {
          movimientos: { orderBy: { fecha: "desc" } },
          user: { select: { name: true, email: true } },
        },
      });
      if (!caja) {
        return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
      }
      return NextResponse.json(caja);
    }

    const cajas = await prisma.cajaChica.findMany({
      where: { userId: targetUserId },
      include: {
        movimientos: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { fechaApertura: "desc" },
      take: 50,
    });
    return NextResponse.json(cajas);
  } catch (error) {
    console.error("Error listando caja chica:", error);
    return NextResponse.json(
      { error: "Error al listar caja chica" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const accion = body.accion as string;

    if (accion === "abrir") {
      const montoInicial = Number(body.montoInicial ?? 0);
      const montoInicialUsd = Number(body.montoInicialUsd ?? 0);
      if (montoInicial < 0 || montoInicialUsd < 0) {
        return NextResponse.json(
          { error: "Los montos iniciales deben ser positivos" },
          { status: 400 }
        );
      }
      if (montoInicial === 0 && montoInicialUsd === 0) {
        return NextResponse.json(
          { error: "Ingresá al menos un monto inicial (ARS o USD)" },
          { status: 400 }
        );
      }

      const cajaAbierta = await prisma.cajaChica.findFirst({
        where: {
          userId: session.user.id,
          estado: "ABIERTA",
        },
      });
      if (cajaAbierta) {
        return NextResponse.json(
          { error: "Ya tenés una caja abierta. Cerrala primero." },
          { status: 400 }
        );
      }

      const caja = await prisma.cajaChica.create({
        data: {
          userId: session.user.id,
          montoInicial,
          montoInicialUsd: montoInicialUsd || undefined,
          estado: "ABIERTA",
        },
      });
      return NextResponse.json(caja, { status: 201 });
    }

    if (accion === "movimiento") {
      const data = movimientoSchema.parse(body);
      const cajaId = body.cajaId as string;
      if (!cajaId) {
        return NextResponse.json({ error: "cajaId requerido" }, { status: 400 });
      }

      const caja = await prisma.cajaChica.findFirst({
        where: {
          id: cajaId,
          userId: session.user.id,
          estado: "ABIERTA",
        },
      });
      if (!caja) {
        return NextResponse.json({ error: "Caja no encontrada o cerrada" }, { status: 404 });
      }

      const mov = await prisma.movimientoCaja.create({
        data: {
          cajaId,
          tipo: data.tipo,
          monto: Math.abs(data.monto),
          moneda: data.moneda ?? "ARS",
          concepto: data.concepto ?? null,
        },
      });
      return NextResponse.json(mov, { status: 201 });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error caja chica:", error);
    return NextResponse.json(
      { error: "Error al procesar" },
      { status: 500 }
    );
  }
}
