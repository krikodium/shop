import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { crearPasswordToken } from "@/lib/tokens";
import { enviarInvitacion, getBaseUrl } from "@/lib/mailer";

const invitarSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "VENDEDOR", "VIEWER"]).default("VENDEDOR"),
  horarioEntrada: z.string().optional().nullable(),
  horarioSalida: z.string().optional().nullable(),
  diasTrabajo: z.string().optional().nullable(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  horarioEntrada: true,
  horarioSalida: true,
  diasTrabajo: true,
  createdAt: true,
} as const;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede invitar usuarios" }, { status: 403 });
    }

    const body = await request.json();
    const data = invitarSchema.parse(body);

    const existente = await prisma.user.findUnique({ where: { email: data.email } });
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    // Usuario sin contraseña: no puede loguear hasta definirla vía el mail.
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        password: null,
        role: data.role,
        horarioEntrada: data.horarioEntrada ?? null,
        horarioSalida: data.horarioSalida ?? null,
        diasTrabajo: data.diasTrabajo ?? null,
      },
      select: userSelect,
    });

    const raw = await crearPasswordToken(user.id, "INVITACION");
    const link = `${getBaseUrl()}/set-password?token=${raw}`;

    try {
      await enviarInvitacion(user.email, user.name, link);
    } catch (mailError) {
      console.error("Error enviando invitación:", mailError);
      // El usuario queda creado; el admin puede reenviar la invitación.
      return NextResponse.json(
        {
          user,
          emailEnviado: false,
          error:
            "El usuario se creó pero no se pudo enviar el mail. Revisá la config SMTP y reenviá la invitación.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ user, emailEnviado: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error invitando usuario:", error);
    return NextResponse.json({ error: "Error al invitar usuario" }, { status: 500 });
  }
}
