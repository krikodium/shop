import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  actual: z.string().min(1, "Ingresá tu contraseña actual"),
  nueva: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
});

/**
 * Cambio de contraseña propio (cualquier rol).
 * Requiere la contraseña actual: no permite cambiar la de otro usuario.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { actual, nueva } = schema.parse(body);

    // Siempre sobre el usuario de la sesión, nunca sobre un id del body.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });
    if (!user?.password) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene contraseña definida. Pedile una al administrador." },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(actual, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta" },
        { status: 400 }
      );
    }

    if (actual === nueva) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser distinta de la actual" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(nueva, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    console.error("Error cambiando contraseña:", error);
    return NextResponse.json({ error: "Error al cambiar la contraseña" }, { status: 500 });
  }
}
