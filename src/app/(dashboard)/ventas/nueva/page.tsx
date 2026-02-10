"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProductosGridPaginado } from "@/components/punto-venta/ProductosGridPaginado";
import { CarritoVenta } from "@/components/punto-venta/CarritoVenta";
import { calcularTotalesVenta } from "@/lib/calculadores/ventasCalculator";
import type { ItemVentaInput } from "@/types";

export default function NuevaVentaPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemVentaInput[]>([]);
  const [descuento, setDescuento] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totales = calcularTotalesVenta(items, descuento);

  const agregarProducto = useCallback((item: ItemVentaInput) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.productoId === item.productoId);
      if (existente) {
        const nuevaCantidad = existente.cantidad + item.cantidad;
        const precioUnit = existente.precioUnitario;
        const costoUnit = existente.costoUnitario;
        const deudaUnit = existente.esConsignacion && existente.deudaProveedor
          ? existente.deudaProveedor / existente.cantidad
          : 0;
        return prev.map((i) =>
          i.productoId === item.productoId
            ? {
                ...i,
                cantidad: nuevaCantidad,
                subtotal: precioUnit * nuevaCantidad,
                costoTotal: costoUnit * nuevaCantidad,
                deudaProveedor: existente.esConsignacion
                  ? deudaUnit * nuevaCantidad
                  : null,
              }
            : i
        );
      }
      return [...prev, item];
    });
    setError(null);
  }, []);

  const cambiarCantidad = useCallback((index: number, cantidad: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || cantidad < 1) return prev;
      const precioUnit = item.precioUnitario;
      const costoUnit = item.costoUnitario;
      const deudaUnit = item.esConsignacion && item.deudaProveedor
        ? item.deudaProveedor / item.cantidad
        : 0;
      const nuevo = [...prev];
      nuevo[index] = {
        ...item,
        cantidad,
        subtotal: precioUnit * cantidad,
        costoTotal: costoUnit * cantidad,
        deudaProveedor: item.esConsignacion ? deudaUnit * cantidad : null,
      };
      return nuevo;
    });
  }, []);

  const quitarItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const procesarVenta = useCallback(
    async (opts: { metodoPago: string; clienteId?: string | null; clienteNombre?: string }) => {
      if (items.length === 0) {
        setError("Agregá al menos un producto");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ventas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            descuento,
            metodoPago: opts.metodoPago,
            clienteId: opts.clienteId ?? null,
            clienteNombre: opts.clienteNombre ?? undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Error al procesar la venta");
        }

        const venta = await res.json();
        router.push(`/ventas/${venta.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al procesar");
      } finally {
        setIsLoading(false);
      }
    },
    [items, descuento, router]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Nueva venta</h1>

      {/* Mobile: carrito fijo abajo, productos arriba */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="min-h-0 lg:col-span-2">
          <ProductosGridPaginado onAgregar={agregarProducto} />
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <CarritoVenta
            items={items}
            totales={totales}
            descuento={descuento}
            onDescuentoChange={setDescuento}
            onCantidadChange={cambiarCantidad}
            onQuitar={quitarItem}
            onProcesar={procesarVenta}
            isLoading={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
