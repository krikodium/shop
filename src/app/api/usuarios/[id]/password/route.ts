import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72),
});

/**
 * Un administrador define una contraseña nueva para otro usuario.
 * Cierra las sesiones abiertas de ese usuario (passwordChangedAt).
 * La contraseña propia se cambia por /api/usuarios/cambiar-password.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo un administrador puede cambiar contraseñas" },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Para cambiar tu propia contraseña usá tu menú de usuario" },
        { status: 400 }
      );
    }

    const { password } = schema.parse(await req.json());

    const destino = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!destino) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date() },
    });

    console.info(`[audit] contraseña de ${id} cambiada por admin ${session.user.id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    console.error("Error cambiando contraseña de usuario:", error);
    return NextResponse.json({ error: "Error al cambiar la contraseña" }, { status: 500 });
  }
}
