import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "VENDEDOR", "VIEWER"]).default("VENDEDOR"),
  horarioEntrada: z.string().optional().nullable(),
  horarioSalida: z.string().optional().nullable(),
  diasTrabajo: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede listar usuarios" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        horarioEntrada: true,
        horarioSalida: true,
        diasTrabajo: true,
        createdAt: true,
        emailVerified: true,
        password: true,
      },
      orderBy: { name: "asc" },
    });
    // No exponer el hash: derivar solo si tiene contraseña definida.
    const safe = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      horarioEntrada: u.horarioEntrada,
      horarioSalida: u.horarioSalida,
      diasTrabajo: u.diasTrabajo,
      createdAt: u.createdAt,
      emailVerified: u.emailVerified,
      tienePassword: u.password != null,
    }));
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Error listando usuarios:", error);
    return NextResponse.json(
      { error: "Error al listar usuarios" },
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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede crear usuarios" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const existente = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        password: hash,
        role: data.role,
        horarioEntrada: data.horarioEntrada ?? null,
        horarioSalida: data.horarioSalida ?? null,
        diasTrabajo: data.diasTrabajo ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        horarioEntrada: true,
        horarioSalida: true,
        diasTrabajo: true,
        createdAt: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creando usuario:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
