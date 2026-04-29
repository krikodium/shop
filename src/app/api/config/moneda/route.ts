import { NextResponse } from "next/server";

/** Monedas soportadas en el POS (la cotización USD se ingresa en cada venta o rendición, no hay TC global). */
export async function GET() {
  return NextResponse.json({
    monedas: ["ARS", "USD"] as const,
  });
}
