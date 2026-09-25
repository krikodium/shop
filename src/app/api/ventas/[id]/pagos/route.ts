import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ErrorPagoVenta, registrarPagoVenta } from "@/lib/registrarPagoVenta";
import { saldoPendiente, totalPagado } from "@/lib/calculadores/pagosVenta";

const METODOS = [
  "EFECTIVO",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
  "TRANSFERENCIA",
  "MERCADOPAGO",
  "MULTIPLE",
] as const;

/**
 * El importe llega como string para no perder precisión en el JSON: un `number`
 * de JavaScript no puede representar todos los decimales, y esto es plata.
 */
const pagoSchema = z
  .object({
    montoArs: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Importe con hasta dos decimales, sin signo"),
    metodoPago: z.enum(METODOS),
    montoUsd: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/)
      .optional()
      .nullable(),
    cotizacionUsd: z
      .string()
      .trim()
      .regex(/^\d{1,8}(\.\d{1,4})?$/)
      .optional()
      .nullable(),
    notas: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (d) => !(d.montoUsd && Number(d.montoUsd) > 0) || Boolean(d.cotizacionUsd),
    { message: "Indicá la cotización usada cuando el cobro entra en dólares", path: ["cotizacionUsd"] }
  );

/** Historial de cobros de una venta, con su saldo. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const venta = await prisma.venta.findUnique({
    where: { id },
    select: {
      total: true,
      estadoPago: true,
      anulada: true,
      pagos: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          montoArs: true,
          metodoPago: true,
          montoUsd: true,
          cotizacionUsd: true,
          notas: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!venta) {
    return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    total: venta.total.toFixed(2),
    totalPagado: totalPagado(venta.pagos).toFixed(2),
    saldoPendiente: saldoPendiente(venta.total, venta.pagos).toFixed(2),
    estadoPago: venta.estadoPago,
    anulada: venta.anulada,
    pagos: venta.pagos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      montoArs: p.montoArs.toFixed(2),
      metodoPago: p.metodoPago,
      montoUsd: p.montoUsd ? p.montoUsd.toFixed(2) : null,
      cotizacionUsd: p.cotizacionUsd ? p.cotizacionUsd.toFixed(4) : null,
      notas: p.notas,
      registradoPor: p.user?.name ?? p.user?.email ?? null,
    })),
  });
}

/** Registra un cobro nuevo (seña, cuota o saldo). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // VIEWER es "solo lectura": no puede saldar una venta.
  if (session.user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Tu usuario es de solo lectura: no puede registrar cobros." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = pagoSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const resultado = await registrarPagoVenta({
      ventaId: id,
      montoArs: parsed.data.montoArs,
      metodoPago: parsed.data.metodoPago,
      montoUsd: parsed.data.montoUsd ?? null,
      cotizacionUsd: parsed.data.cotizacionUsd ?? null,
      notas: parsed.data.notas ?? null,
      // El usuario sale de la sesión, nunca del cuerpo del request.
      usuarioId: session.user.id,
    });
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorPagoVenta) {
      const status =
        error.codigo === "VENTA_NO_ENCONTRADA"
          ? 404
          : error.codigo === "CONFLICTO"
            ? 409
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Error registrando pago de venta:", error);
    return NextResponse.json({ error: "No se pudo registrar el cobro" }, { status: 500 });
  }
}
