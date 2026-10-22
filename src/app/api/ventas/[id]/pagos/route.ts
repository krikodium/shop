import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ErrorPagoVenta, registrarPagoVenta } from "@/lib/registrarPagoVenta";
import { saldoPendiente, totalPagado } from "@/lib/calculadores/pagosVenta";

import { pagoSchema } from "@/lib/validaciones/ventaSchema";

/** Historial de cobros de una venta, con su saldo. */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // VIEWER es "solo lectura": no puede saldar una venta.
  if (session.user.role === "VIEWER") {
    return NextResponse.json(
      { error: "Tu usuario es de solo lectura: no puede registrar cobros." },
      { status: 403 },
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
      { status: 400 },
    );
  }

  try {
    const resultado = await registrarPagoVenta({
      ventaId: id,
      claveIdempotencia: parsed.data.claveIdempotencia,
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
    return NextResponse.json(
      { error: "No se pudo registrar el cobro" },
      { status: 500 },
    );
  }
}
