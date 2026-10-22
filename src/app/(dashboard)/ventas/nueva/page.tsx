"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ProductosGridPaginado } from "@/components/punto-venta/ProductosGridPaginado";
import { CarritoVenta } from "@/components/punto-venta/CarritoVenta";
import { GuiaCargaVenta } from "@/components/punto-venta/GuiaCargaVenta";
import { PageHeader } from "@/components/ui/page-header";
import { notificar } from "@/lib/notificar";
import { useAsyncAction } from "@/hooks/use-async-action";
import {
  escala,
  importe,
  porcentajeCentavos,
} from "@/components/punto-venta/dinero-venta";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ItemVentaInput, OpcionesProcesarVenta } from "@/types";

type ExcedidoStock = {
  productoNombre: string;
  cantidad: number;
  stockActual: number;
};

export default function NuevaVentaPage() {
  const router = useRouter();
  const operacion = useRef<{ huella: string; clave: string } | null>(null);
  const [items, setItems] = useState<ItemVentaInput[]>([]);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [exceededItems, setExceededItems] = useState<ExcedidoStock[]>([]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, i) => s + escala(i.precioUnitario) * BigInt(i.cantidad),
        BigInt(0),
      ),
    [items],
  );
  const descuentoMonto = porcentajeCentavos(subtotal, descuentoPorcentaje);
  const totalCentavos = subtotal - descuentoMonto;
  const costoCentavos = items.reduce(
    (s, i) => s + escala(i.costoUnitario.toFixed(2)) * BigInt(i.cantidad),
    BigInt(0),
  );
  const deudaCentavos = items.reduce(
    (s, i) =>
      s +
      (i.esConsignacion
        ? escala((i.deudaProveedor ?? 0).toFixed(2))
        : BigInt(0)),
    BigInt(0),
  );
  // Number se utiliza solo para adaptar cifras ya calculadas al componente visual existente.
  const totales = {
    subtotal: Number(importe(subtotal)),
    total: Number(importe(totalCentavos)),
    costoTotal: Number(importe(costoCentavos)),
    deudaConsignacion: Number(importe(deudaCentavos)),
    gananciaBruta: Number(importe(totalCentavos - costoCentavos)),
    margenPorcentaje:
      totalCentavos > BigInt(0)
        ? Number(
            ((totalCentavos - costoCentavos) * BigInt(10000)) / totalCentavos,
          ) / 100
        : 0,
  };

  const agregarProducto = useCallback((item: ItemVentaInput) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.productoId === item.productoId);
      if (existente) {
        const nuevaCantidad = existente.cantidad + item.cantidad;
        const precioUnit = existente.precioUnitario;
        const costoUnit = existente.costoUnitario;
        return prev.map((i) =>
          i.productoId === item.productoId
            ? {
                ...i,
                cantidad: nuevaCantidad,
                subtotal: Number(
                  importe(escala(precioUnit) * BigInt(nuevaCantidad)),
                ),
                costoTotal: Number(
                  importe(escala(costoUnit.toFixed(2)) * BigInt(nuevaCantidad)),
                ),
                deudaProveedor: existente.esConsignacion
                  ? Number(
                      importe(
                        porcentajeCentavos(
                          escala(precioUnit) * BigInt(nuevaCantidad),
                          100 - (existente.comisionShop ?? 30),
                        ),
                      ),
                    )
                  : null,
              }
            : i,
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
      const nuevo = [...prev];
      nuevo[index] = {
        ...item,
        cantidad,
        subtotal: Number(importe(escala(precioUnit) * BigInt(cantidad))),
        costoTotal: Number(
          importe(escala(costoUnit.toFixed(2)) * BigInt(cantidad)),
        ),
        deudaProveedor: item.esConsignacion
          ? Number(
              importe(
                porcentajeCentavos(
                  escala(precioUnit) * BigInt(cantidad),
                  100 - (item.comisionShop ?? 30),
                ),
              ),
            )
          : null,
      };
      return nuevo;
    });
  }, []);

  const quitarItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const [opcionesPendientes, setOpcionesPendientes] =
    useState<OpcionesProcesarVenta | null>(null);

  const enviarVenta = useCallback(
    async (opts: OpcionesProcesarVenta, ignorarStock = false) => {
      const contenido = {
        items: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
          modalidad: "INMEDIATA",
        })),
        descuento: importe(descuentoMonto),
        totalEsperado: importe(totalCentavos),
        metodoPago: opts.metodoPago,
        clienteId: opts.clienteId ?? null,
        clienteNombre: opts.clienteNombre ?? undefined,
        ...(ignorarStock ? { ignorarStock: true } : {}),
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
      };
      const huella = JSON.stringify(contenido);
      if (operacion.current?.huella !== huella)
        operacion.current = { huella, clave: crypto.randomUUID() };
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contenido,
          claveIdempotencia: operacion.current.clave,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al procesar la venta");
      }
      const venta = await res.json();
      operacion.current = null;
      return venta;
    },
    [items, descuentoMonto, totalCentavos],
  );

  const { run: procesarVenta, loading: isLoading } = useAsyncAction(
    async (opts: OpcionesProcesarVenta) => {
      if (items.length === 0) {
        notificar.error("Agregá al menos un producto");
        return;
      }

      try {
        const ids = items.map((i) => i.productoId);
        const stocksRes = await fetch(`/api/productos?ids=${ids.join(",")}`);
        if (!stocksRes.ok) throw new Error("No se pudo verificar el stock");
        const stocks: { id: string; nombre: string; stockActual: number }[] =
          await stocksRes.json();
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
          setOpcionesPendientes(opts);
          setShowStockDialog(true);
          return;
        }

        const venta = await enviarVenta(opts, false);
        notificar.ok("Venta registrada correctamente");
        router.push(`/ventas/${venta.id}`);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar";
        notificar.error(msg);
      }
    },
  );

  const { run: confirmarVentaSinStock, loading: confirmandoSinStock } =
    useAsyncAction(async () => {
      if (!opcionesPendientes) return;
      try {
        const venta = await enviarVenta(opcionesPendientes, true);
        setShowStockDialog(false);
        notificar.ok("Venta registrada correctamente");
        router.push(`/ventas/${venta.id}`);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar";
        notificar.error(msg);
      }
    });

  // Cantidad ya cargada por producto, solo para marcarla en el catálogo.
  const enCarrito = useMemo(
    () => new Map(items.map((i) => [i.productoId, i.cantidad])),
    [items],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        overline="Operación · Registro de venta"
        title="Registro de venta"
        description="Buscá en el catálogo, armá la venta a la derecha y confirmá el cobro."
      >
        <Button asChild variant="outline">
          <Link href="/pedidos/nuevo">Nuevo pedido con seña</Link>
        </Button>
      </PageHeader>

      <GuiaCargaVenta carritoVacio={items.length === 0} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          <ProductosGridPaginado
            onAgregar={agregarProducto}
            enCarrito={enCarrito}
          />
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
            isLoading={isLoading || confirmandoSinStock}
          />
        </aside>
      </div>

      <AlertDialog
        open={showStockDialog}
        onOpenChange={(open) => {
          setShowStockDialog(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Producto sin stock cargado</AlertDialogTitle>
            <AlertDialogDescription>
              La cantidad en el carrito supera el stock que figura en el
              sistema. Si faltó actualizar el stock, podés registrar la venta
              igual o pasarla a pedido por encargo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="divide-y divide-border border-y border-border text-sm">
            {exceededItems.map((e, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate font-medium">
                  {e.productoNombre}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  venta <span className="text-num-negative">{e.cantidad}</span>{" "}
                  · stock cargado {e.stockActual}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Ajustar cantidades</AlertDialogCancel>
            <Button asChild variant="outline">
              <Link href="/pedidos/nuevo">Crear pedido por encargo</Link>
            </Button>
            <Button
              type="button"
              onClick={() => void confirmarVentaSinStock()}
              loading={confirmandoSinStock}
              loadingText="Registrando…"
            >
              Registrar venta igual
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
