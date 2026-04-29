import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  itemsDeudaPendiente,
  validarCreacionRendicion,
} from "@/lib/consignacionHelpers";

export interface RestriccionRendicion {
  permitido: boolean;
  motivo: string | null;
  esUltimaSemana: boolean;
  diasParaUltimaSemana: number;
  rendicionExistenteEnMes: {
    id: string;
    numeroRendicion: string;
    fechaRendicion: string;
  } | null;
}

export interface DeudaProveedor {
  proveedorId: string;
  proveedorNombre: string;
  deudaPendiente: number;
  totalVendidoPeriodo: number;
  ultimaRendicion: { fechaHasta: string; totalARendir: number } | null;
  restriccionRendicion: RestriccionRendicion;
}

/**
 * GET /api/consignacion/deudas
 * Devuelve la deuda pendiente por cada proveedor de consignación.
 * Solo cuenta ventas que NO fueron incluidas en ninguna rendición previa.
 */
export async function GET() {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { tipoProveedor: "CONSIGNACION" },
      include: {
        rendiciones: {
          orderBy: { fechaHasta: "desc" },
          take: 1,
        },
      },
    });

    const deudas: DeudaProveedor[] = [];

    for (const prov of proveedores) {
      const ultimaRendicion = prov.rendiciones[0] ?? null;
      const [items, validacion] = await Promise.all([
        itemsDeudaPendiente(prov.id),
        validarCreacionRendicion(prov.id),
      ]);

      const deudaPendiente = items.reduce(
        (sum, i) => sum + Number(i.deudaProveedor ?? 0),
        0
      );
      const totalVendidoPeriodo = items.reduce(
        (sum, i) => sum + Number(i.subtotal),
        0
      );

      deudas.push({
        proveedorId: prov.id,
        proveedorNombre: prov.nombre,
        deudaPendiente,
        totalVendidoPeriodo,
        ultimaRendicion: ultimaRendicion
          ? {
              fechaHasta: ultimaRendicion.fechaHasta.toISOString(),
              totalARendir: Number(ultimaRendicion.totalARendir),
            }
          : null,
        restriccionRendicion: {
          permitido: validacion.permitido,
          motivo: validacion.motivo,
          esUltimaSemana: validacion.esUltimaSemana,
          diasParaUltimaSemana: validacion.diasParaUltimaSemana,
          rendicionExistenteEnMes: validacion.rendicionExistenteEnMes
            ? {
                id: validacion.rendicionExistenteEnMes.id,
                numeroRendicion: validacion.rendicionExistenteEnMes.numeroRendicion,
                fechaRendicion: validacion.rendicionExistenteEnMes.fechaRendicion.toISOString(),
              }
            : null,
        },
      });
    }

    return NextResponse.json(deudas);
  } catch (error) {
    console.error("Error obteniendo deudas:", error);
    return NextResponse.json(
      { error: "Error al obtener deudas" },
      { status: 500 }
    );
  }
}
