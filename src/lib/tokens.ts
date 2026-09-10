import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { TokenTipo } from "@prisma/client";

// Vigencia de cada tipo de token (en milisegundos)
export const TTL_INVITACION = 72 * 60 * 60 * 1000; // 72 horas
export const TTL_RESET = 60 * 60 * 1000; // 1 hora

/** Hashea el token con SHA-256 (lo que se guarda en la BD). */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Genera un token de un solo uso para un usuario, invalidando los tokens
 * previos sin usar del mismo tipo. Devuelve el token EN CRUDO (para el link);
 * en la BD solo queda el hash.
 */
export async function crearPasswordToken(
  userId: string,
  tipo: TokenTipo
): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const ttl = tipo === "INVITACION" ? TTL_INVITACION : TTL_RESET;
  const expires = new Date(Date.now() + ttl);

  // Invalidar tokens anteriores del mismo tipo que sigan pendientes.
  await prisma.passwordToken.deleteMany({
    where: { userId, tipo, usedAt: null },
  });

  await prisma.passwordToken.create({
    data: { userId, tokenHash, tipo, expires },
  });

  return raw;
}

export interface TokenValido {
  id: string;
  userId: string;
  tipo: TokenTipo;
}

/**
 * Verifica un token en crudo: existe, no fue usado y no expiró.
 * No lo marca como usado (eso lo hace consumirToken tras setear la clave).
 */
export async function verificarToken(raw: string): Promise<TokenValido | null> {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const registro = await prisma.passwordToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, tipo: true, usedAt: true, expires: true },
  });
  if (!registro) return null;
  if (registro.usedAt) return null;
  if (registro.expires.getTime() < Date.now()) return null;
  return { id: registro.id, userId: registro.userId, tipo: registro.tipo };
}

/** Marca un token como usado. */
export async function marcarUsado(id: string): Promise<void> {
  await prisma.passwordToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
