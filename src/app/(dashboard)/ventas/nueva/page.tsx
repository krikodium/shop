"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductosGridPaginado } from "@/components/punto-venta/ProductosGridPaginado";
import { CarritoVenta } from "@/components/punto-venta/CarritoVenta";
import { calcularTotalesVenta } from "@/lib/calculadores/ventasCalculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ItemVentaInput, OpcionesProcesarVenta } from "@/types";

type ExcedidoStock = { productoNombre: string; cantidad: number; stockActual: number };

export default function NuevaVentaPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemVentaInput[]>([]);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [exceededItems, setExceededItems] = useState<ExcedidoStock[]>([]);
  const [pendingSale, setPendingSale] = useState<OpcionesProcesarVenta | null>(null);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.subtotal, 0),
    [items]
  );
  const descuentoMonto = subtotal * (descuentoPorcentaje / 100);
  const totales = calcularTotalesVenta(items, descuentoMonto);

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

  const enviarVenta = useCallback(
    async (opts: OpcionesProcesarVenta, ignorarStock = false) => {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          descuento: descuentoMonto,
          metodoPago: opts.metodoPago,
          clienteId: opts.clienteId ?? null,
          clienteNombre: opts.clienteNombre ?? undefined,
          ignorarStock,
          ...(opts.metodoPagoSecundario
            ? {
                metodoPagoSecundario: opts.metodoPagoSecundario,
                montoPago1Ars: opts.montoPago1Ars,
                montoPago2Ars: opts.montoPago2Ars,
                usdPago1: opts.usdPago1 ?? null,
                usdPago2: opts.usdPago2 ?? null,
                cotizacionUsd: opts.cotizacionUsd ?? null,
              }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al procesar la venta");
      }
      return res.json();
    },
    [items, descuentoMonto]
  );

  const procesarVenta = useCallback(
    async (opts: OpcionesProcesarVenta) => {
      if (items.length === 0) {
        setError("Agregá al menos un producto");
        toast.error("Agregá al menos un producto");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const ids = items.map((i) => i.productoId);
        const stocksRes = await fetch(`/api/productos?ids=${ids.join(",")}`);
        if (!stocksRes.ok) throw new Error("No se pudo verificar el stock");
        const stocks: { id: string; nombre: string; stockActual: number }[] = await stocksRes.json();
        const stockMap = new Map(stocks.map((s) => [s.id, s]));

        const excedidos: ExcedidoStock[] = [];
        for (const item of items) {
          const s = stockMap.get(item.productoId);
          if (s && item.cantidad > s.stockActual) {
            excedidos.push({
              productoNombre: item.productoNombre,
              cantidad: item.cantidad,
              stockActual: s.stockActual,
            });
          }
        }

        if (excedidos.length > 0) {
          setExceededItems(excedidos);
          setPendingSale(opts);
          setShowStockDialog(true);
          setIsLoading(false);
          return;
        }

        const venta = await enviarVenta(opts, false);
        toast.success("Venta registrada correctamente");
        router.push(`/ventas/${venta.id}`);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [items, descuentoMonto, enviarVenta, router]
  );

  const confirmarIgnorarStock = useCallback(async () => {
    if (!pendingSale) return;
    setIsLoading(true);
    setShowStockDialog(false);
    setExceededItems([]);
    setPendingSale(null);
    setError(null);
    try {
      const venta = await enviarVenta(pendingSale, true);
      toast.success("Venta registrada correctamente");
      router.push(`/ventas/${venta.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [pendingSale, enviarVenta, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight md:text-xl">Nueva venta</h1>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">Punto de venta — buscá productos y agregalos al carrito</p>
      </div>

      {/* Mobile: un poco más de ancho útil; desktop: carrito ~40% (antes ~33%) */}
      <div className="-mx-1 flex flex-col gap-4 px-1 sm:-mx-2 sm:px-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:px-0">
        <div className="min-h-0 lg:col-span-3">
          <ProductosGridPaginado onAgregar={agregarProducto} />
        </div>

        <div className="min-w-0 lg:col-span-2 lg:sticky lg:top-4 lg:self-start">
          <CarritoVenta
            items={items}
            totales={totales}
            descuento={descuentoPorcentaje}
            onDescuentoChange={setDescuentoPorcentaje}
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

      <AlertDialog
        open={showStockDialog}
        onOpenChange={(open) => {
          setShowStockDialog(open);
          if (!open) setPendingSale(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stock excedido</AlertDialogTitle>
            <AlertDialogDescription>
              La cantidad en el carrito supera el stock disponible de algunos productos.
              ¿Querés continuar igual? (el inventario puede estar desactualizado)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="rounded-md border bg-muted/50 p-3 text-sm">
            {exceededItems.map((e, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="font-medium">{e.productoNombre}</span>
                <span className="text-muted-foreground">
                  pedido: {e.cantidad} · stock: {e.stockActual}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Ajustar cantidades</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarIgnorarStock}>
              Continuar igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
