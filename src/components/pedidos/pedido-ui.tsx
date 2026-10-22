"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS } from "@/lib/formatCurrency";

export type PedidoItem = {
  id: string;
  productoId?: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  modalidad: string;
  seguimientoEstado: string;
  cantidadRecibida: number;
  cantidadEntregada: number;
  especificaciones?: string | null;
  fechaEstimada?: string | null;
};

export type Pedido = {
  id: string;
  ventaId: string;
  fechaPrometida?: string | null;
  responsable?: string | null;
  notas?: string | null;
  updatedAt?: string;
  venta: {
    id: string;
    numeroVenta: string;
    fecha: string;
    subtotal?: string;
    descuento?: string;
    total: string;
    estadoPago: string;
    anulada: boolean;
    clienteNombre?: string | null;
    cliente: {
      id?: string;
      nombre: string;
      telefono?: string | null;
      email?: string | null;
    } | null;
    items: PedidoItem[];
  };
  totalPagado: string;
  saldoPendiente: string;
  eventos: {
    id: string;
    tipo: string;
    itemId?: string | null;
    itemNombre?: string | null;
    notas?: string | null;
    fecha: string;
    cantidad?: number | null;
    usuario?: { nombre: string } | null;
    registradoPor?: string | null;
  }[];
};

export function nombreClientaPedido(p: Pedido): string {
  return (
    p.venta.cliente?.nombre?.trim() ||
    p.venta.clienteNombre?.trim() ||
    "Clienta sin identificar"
  );
}


export const estados: Record<string, string> = {
  PENDIENTE: "Por encargar",
  ENCARGADO: "Encargado",
  EN_FABRICACION: "En fabricación",
  LISTO: "Listo para entregar",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const pasosSeguimiento = [
  { id: "PENDIENTE", label: "Por encargar" },
  { id: "ENCARGADO", label: "Encargado" },
  { id: "EN_FABRICACION", label: "En fabricación" },
  { id: "LISTO", label: "Listo en local" },
  { id: "ENTREGADO", label: "Entregado" },
] as const;

export const estadosPago: Record<string, string> = {
  PENDIENTE: "Sin cobrar",
  PARCIAL: "Seña / parcial",
  PAGADO: "Saldado",
};

export function fecha(valor?: string | null) {
  return valor
    ? new Date(valor).toLocaleDateString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : "Sin definir";
}

export function fechaHora(valor?: string | null) {
  return valor
    ? new Date(valor).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";
}

export function fechaInput(valor?: string | null): string {
  if (!valor) return "";
  return new Date(valor).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// Centavos enteros en la interfaz: la API vuelve a validar y calcular los importes.
export function centavos(valor: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(valor))
    throw new Error("Ingresá un importe con hasta dos decimales.");
  const [entero, decimalPart = ""] = valor.split(".");
  return BigInt(entero) * BigInt(100) + BigInt(decimalPart.padEnd(2, "0"));
}

export function decimal(valor: bigint): string {
  const signo = valor < BigInt(0) ? "-" : "";
  const abs = valor < BigInt(0) ? -valor : valor;
  return `${signo}${abs / BigInt(100)}.${(abs % BigInt(100)).toString().padStart(2, "0")}`;
}

export function dinero(valor: string): string {
  return formatARS(valor);
}

export function demorado(p: Pedido) {
  if (p.venta.anulada || !p.fechaPrometida) return false;
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const prometida = new Date(p.fechaPrometida).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  return (
    prometida < hoy &&
    p.venta.items.some(
      (i) =>
        i.seguimientoEstado !== "ENTREGADO" &&
        i.seguimientoEstado !== "CANCELADO",
    )
  );
}

export function resumenPedido(p: Pedido) {
  const items = p.venta.items;
  const unidadesTotales = items.reduce((acc, i) => acc + i.cantidad, 0);
  const unidadesRecibidas = items.reduce(
    (acc, i) => acc + i.cantidadRecibida,
    0,
  );
  const unidadesEntregadas = items.reduce(
    (acc, i) => acc + i.cantidadEntregada,
    0,
  );
  const unidadesListasParaEntregar = items.reduce(
    (acc, i) => acc + Math.max(0, i.cantidadRecibida - i.cantidadEntregada),
    0,
  );
  const totalNum = Number(p.venta.total) || 0;
  const pagadoNum = Number(p.totalPagado) || 0;
  const porcentajePago =
    totalNum > 0
      ? Math.min(100, Math.round((pagadoNum / totalNum) * 100))
      : 0;
  const porcentajeEntrega =
    unidadesTotales > 0
      ? Math.min(100, Math.round((unidadesEntregadas / unidadesTotales) * 100))
      : 0;
  const finalizado =
    p.venta.anulada ||
    (items.length > 0 &&
      items.every((i) =>
        ["ENTREGADO", "CANCELADO"].includes(i.seguimientoEstado),
      ));

  let estadoGeneral:
    | "CANCELADO"
    | "FINALIZADO"
    | "LISTO"
    | "EN_PROCESO"
    | "POR_ENCARGAR" = "POR_ENCARGAR";
  let etiquetaEstadoGeneral = "Por encargar";

  if (p.venta.anulada || items.every((i) => i.seguimientoEstado === "CANCELADO")) {
    estadoGeneral = "CANCELADO";
    etiquetaEstadoGeneral = "Cancelado";
  } else if (finalizado) {
    estadoGeneral = "FINALIZADO";
    etiquetaEstadoGeneral = "Entregado";
  } else if (unidadesListasParaEntregar > 0) {
    estadoGeneral = "LISTO";
    etiquetaEstadoGeneral =
      unidadesListasParaEntregar === unidadesTotales - unidadesEntregadas
        ? "Listo para entregar"
        : `Entrega parcial lista (${unidadesListasParaEntregar} u.)`;
  } else if (
    items.some((i) =>
      ["ENCARGADO", "EN_FABRICACION"].includes(i.seguimientoEstado),
    )
  ) {
    estadoGeneral = "EN_PROCESO";
    etiquetaEstadoGeneral = "En taller / encargado";
  }

  return {
    unidadesTotales,
    unidadesRecibidas,
    unidadesEntregadas,
    unidadesListasParaEntregar,
    porcentajePago,
    porcentajeEntrega,
    finalizado,
    estadoGeneral,
    etiquetaEstadoGeneral,
    tieneSaldo: p.saldoPendiente !== "0.00" && !p.venta.anulada,
    estaDemorado: demorado(p),
  };
}

export async function api<T>(url: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, opciones);
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok || datos === null)
    throw new Error(datos?.error || "No se pudo completar la operación.");
  return datos as T;
}

export function useConsulta<T>(url: string) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const refrescar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await api<T>(url));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar.");
    } finally {
      setCargando(false);
    }
  }, [url]);
  useEffect(() => {
    void refrescar();
  }, [refrescar]);
  return { datos, error, cargando, refrescar };
}

export function EstadoConsulta({
  error,
  cargando,
  reintentar,
}: {
  error: string | null;
  cargando: boolean;
  reintentar: () => void;
}) {
  if (error)
    return (
      <EmptyState
        titulo="No se pudo cargar"
        descripcion={error}
        accion={
          <Button
            variant="outline"
            loading={cargando}
            loadingText="Cargando…"
            onClick={reintentar}
          >
            Reintentar
          </Button>
        }
      />
    );
  if (cargando)
    return (
      <div className="space-y-3" role="status" aria-label="Cargando pedidos">
        <div className="h-24 animate-skeleton-shimmer rounded-lg" />
        <div className="h-24 animate-skeleton-shimmer rounded-lg" />
      </div>
    );
  return null;
}
