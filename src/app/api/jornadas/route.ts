import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  fecha: z.string(),
  horaEntrada: z.string().optional(),
  horaSalida: z.string().optional(),
  notas: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const isAdmin = session.user.role === "ADMIN";
    const targetUserId = userId && isAdmin ? userId : session.user.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    const jornadas = await prisma.jornadaLaboral.findMany({
      where: {
        userId: targetUserId,
        ...(fechaDesde || fechaHasta
          ? {
              fecha: {
                ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
                ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
              },
            }
          : {}),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { fecha: "desc" },
      take: 100,
    });
    return NextResponse.json(jornadas);
  } catch (error) {
    console.error("Error listando jornadas:", error);
    return NextResponse.json(
      { error: "Error al listar jornadas" },
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
    const data = createSchema.parse(body);

    const isAdmin = session.user.role === "ADMIN";
    const targetUserId = (body.userId as string | undefined) && isAdmin ? body.userId : session.user.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    const jornada = await prisma.jornadaLaboral.create({
      data: {
        userId: targetUserId,
        fecha: new Date(data.fecha),
        horaEntrada: data.horaEntrada ?? null,
        horaSalida: data.horaSalida ?? null,
        notas: data.notas ?? null,
      },
    });
    return NextResponse.json(jornada, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creando jornada:", error);
    return NextResponse.json(
      { error: "Error al crear jornada" },
      { status: 500 }
    );
  }
}
