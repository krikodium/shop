import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { crearPasswordToken } from "@/lib/tokens";
import { enviarReset, getBaseUrl } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

// Respuesta genérica: nunca revela si el email existe (evita enumeración).
const RESPUESTA_OK = {
  ok: true,
  message:
    "Si el email corresponde a una cuenta, te enviamos un enlace para restablecer la contraseña.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    // Aunque el email sea inválido, respondemos igual (genérico).
    if (!parsed.success) {
      return NextResponse.json(RESPUESTA_OK);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      try {
        const raw = await crearPasswordToken(user.id, "RESET");
        const link = `${getBaseUrl()}/set-password?token=${raw}`;
        await enviarReset(user.email, user.name, link);
      } catch (mailError) {
        // Logueamos pero no cambiamos la respuesta genérica.
        console.error("Error enviando reset:", mailError);
      }
    }

    return NextResponse.json(RESPUESTA_OK);
  } catch (error) {
    console.error("Error en forgot-password:", error);
    // Mantener respuesta genérica incluso ante error interno.
    return NextResponse.json(RESPUESTA_OK);
  }
}
