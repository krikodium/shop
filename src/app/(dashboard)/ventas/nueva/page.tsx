"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProductosGridPaginado } from "@/components/punto-venta/ProductosGridPaginado";
import { CarritoVenta } from "@/components/punto-venta/CarritoVenta";
import { GuiaCargaVenta } from "@/components/punto-venta/GuiaCargaVenta";
import { PageHeader } from "@/components/ui/page-header";
import { notificar } from "@/lib/notificar";
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
        notificar.error("Agregá al menos un producto");
        return;
      }

      setIsLoading(true);

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
        notificar.ok("Venta registrada correctamente");
        router.push(`/ventas/${venta.id}`);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar";
        notificar.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [items, enviarVenta, router]
  );

  const confirmarIgnorarStock = useCallback(async () => {
    if (!pendingSale) return;
    setIsLoading(true);
    setShowStockDialog(false);
    setExceededItems([]);
    setPendingSale(null);
    try {
      const venta = await enviarVenta(pendingSale, true);
      notificar.ok("Venta registrada correctamente");
      router.push(`/ventas/${venta.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar";
      notificar.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [pendingSale, enviarVenta, router]);

  // Cantidad ya cargada por producto, solo para marcarla en el catálogo.
  const enCarrito = useMemo(
    () => new Map(items.map((i) => [i.productoId, i.cantidad])),
    [items]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        overline="Operación · Punto de venta"
        title="Nueva venta"
        description="Buscá en el catálogo, armá la venta a la derecha y confirmá el cobro."
      />

      <GuiaCargaVenta carritoVacio={items.length === 0} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          <ProductosGridPaginado onAgregar={agregarProducto} enCarrito={enCarrito} />
        </div>

        <aside
          aria-label="Venta en curso"
          className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto"
        >
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
        </aside>
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
          <ul className="divide-y divide-border border-y border-border text-sm">
            {exceededItems.map((e, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 truncate font-medium">{e.productoNombre}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  pedido <span className="text-num-negative">{e.cantidad}</span> · stock {e.stockActual}
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
