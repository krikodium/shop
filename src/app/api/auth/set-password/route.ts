import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verificarToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);

    const valido = await verificarToken(token);
    if (!valido) {
      return NextResponse.json(
        { error: "El enlace es inválido o expiró. Pedí uno nuevo." },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    // Setear contraseña + marcar token usado en una sola transacción.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: valido.userId },
        data: { password: hash, emailVerified: new Date() },
      }),
      prisma.passwordToken.update({
        where: { id: valido.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    console.error("Error en set-password:", error);
    return NextResponse.json({ error: "Error al definir la contraseña" }, { status: 500 });
  }
}
