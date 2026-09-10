import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { crearPasswordToken } from "@/lib/tokens";
import { enviarInvitacion, enviarReset, getBaseUrl } from "@/lib/mailer";

/**
 * Reenvía el acceso a un usuario:
 * - Si nunca definió contraseña -> INVITACION
 * - Si ya tiene contraseña       -> RESET
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede reenviar accesos" }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const tipo = user.password ? "RESET" : "INVITACION";
    const raw = await crearPasswordToken(user.id, tipo);
    const link = `${getBaseUrl()}/set-password?token=${raw}`;

    try {
      if (tipo === "INVITACION") {
        await enviarInvitacion(user.email, user.name, link);
      } else {
        await enviarReset(user.email, user.name, link);
      }
    } catch (mailError) {
      console.error("Error reenviando acceso:", mailError);
      return NextResponse.json(
        { error: "No se pudo enviar el mail. Revisá la configuración SMTP." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, tipo });
  } catch (error) {
    console.error("Error reenviando acceso:", error);
    return NextResponse.json({ error: "Error al reenviar acceso" }, { status: 500 });
  }
}
