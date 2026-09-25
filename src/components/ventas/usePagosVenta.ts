"use client";

/**
 * Lectura del historial de cobros de una venta.
 *
 * Regla de plata: todos los importes viajan y se guardan como `string` tal
 * cual los devuelve la API (`toFixed(2)`). Acá no se suma, no se resta y no se
 * convierte a `number` más que para formatear. El total, lo cobrado y el saldo
 * los calcula el servidor con `Prisma.Decimal`.
 */

import { useCallback, useEffect, useState } from "react";

export type EstadoPago = "PENDIENTE" | "PARCIAL" | "PAGADO";

export interface PagoVentaItem {
  id: string;
  fecha: string;
  /** Importe en pesos, string con dos decimales. */
  montoArs: string;
  metodoPago: string;
  montoUsd: string | null;
  cotizacionUsd: string | null;
  notas: string | null;
  registradoPor: string | null;
}

export interface ResumenPagosVenta {
  total: string;
  totalPagado: string;
  saldoPendiente: string;
  estadoPago: EstadoPago;
  anulada: boolean;
  pagos: PagoVentaItem[];
}

/** Texto en castellano de cada estado. Sin color: el color vive en las cifras. */
export const ESTADO_PAGO_LABEL: Record<string, string> = {
  PENDIENTE: "Sin cobrar",
  PARCIAL: "Cobro parcial",
  PAGADO: "Pagado",
};

/**
 * ¿Queda algo por cobrar? Se decide comparando el string que devuelve la API
 * contra `"0.00"`, nunca pasando el importe por `Number()`.
 */
export function haySaldo(saldo: string | null | undefined): boolean {
  return typeof saldo === "string" && saldo.trim() !== "" && saldo !== "0.00";
}

export interface EstadoHistorialPagos {
  datos: ResumenPagosVenta | null;
  cargando: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
}

export function usePagosVenta(ventaId: string): EstadoHistorialPagos {
  const [datos, setDatos] = useState<ResumenPagosVenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/ventas/${ventaId}/pagos`);
      const data = (await res.json().catch(() => null)) as
        | (ResumenPagosVenta & { error?: string })
        | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "No se pudo cargar el historial de cobros");
      }
      setDatos(data);
      setError(null);
    } catch (e) {
      // Sin datos confiables no se muestra ninguna cifra: preferimos un guion
      // antes que un saldo inventado.
      setDatos(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial de cobros");
    } finally {
      setCargando(false);
    }
  }, [ventaId]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  return { datos, cargando, error, refrescar };
}
