"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductoConProveedor } from "@/types";
import { calcularCostosItemVenta } from "@/lib/calculadores/ventasCalculator";
import type { ItemVentaInput } from "@/types";
import { Package, Search, Warehouse, X } from "lucide-react";

const POR_PAGINA = 12;

const formatPrecio = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

interface ProductosGridPaginadoProps {
  onAgregar: (item: ItemVentaInput) => void;
}

export function ProductosGridPaginado({ onAgregar }: ProductosGridPaginadoProps) {
  const [query, setQuery] = useState("");
  const [productos, setProductos] = useState<ProductoConProveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detalleProducto, setDetalleProducto] = useState<ProductoConProveedor | null>(null);

  const cargar = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(POR_PAGINA));
      if (q && q.length >= 1) params.set("q", q);
      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      if (data.productos && typeof data.total === "number") {
        setProductos(data.productos);
        setTotal(data.total);
      } else {
        setProductos(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      setProductos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(query, page);
  }, [query, page, cargar]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  const handleAgregar = (p: ProductoConProveedor) => {
    const costos = calcularCostosItemVenta(p, 1);
    const precioVenta = Number(p.precioVenta);
    onAgregar({
      productoId: p.id,
      productoNombre: p.nombre,
      productoSku: p.sku,
      cantidad: 1,
      precioUnitario: precioVenta,
      subtotal: precioVenta,
      costoUnitario: costos.costoUnitario,
      costoTotal: costos.costoTotal,
      esConsignacion: costos.esConsignacion,
      deudaProveedor: costos.deudaProveedor || null,
      comisionShop: costos.comisionShop || null,
      proveedorId: costos.proveedorId,
    });
  };

  const stockLabel = (p: ProductoConProveedor) => {
    if (p.stockActual <= 0) return { text: "Sin stock", variant: "destructive" as const };
    if (p.stockActual <= p.stockMinimo) return { text: "Stock bajo", variant: "secondary" as const };
    return { text: "Disponible", variant: "outline" as const };
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
          strokeWidth={1.35}
          aria-hidden
        />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="min-h-10 border-border/80 bg-background pl-9 text-sm shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[140px] flex-col rounded-xl border bg-card p-4"
            >
              <div className="h-5 w-48 animate-skeleton-shimmer rounded" />
              <div className="mt-2 h-4 w-24 animate-skeleton-shimmer rounded" />
              <div className="mt-auto h-9 w-40 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 py-16 text-center text-muted-foreground">
          <Package className="mx-auto mb-2 size-10 opacity-40" />
          <p className="font-medium">Sin productos</p>
          <p className="text-sm">Probá otra búsqueda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((p) => {
              const stock = stockLabel(p);
              const precio = Number(p.precioVenta);
              return (
                <div
                  key={p.id}
                  className="group relative flex min-h-[160px] flex-col rounded-xl border border-border/80 bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <button
                    type="button"
                    title="Ver detalle"
                    aria-label="Ver detalle del producto"
                    onClick={() => setDetalleProducto(p)}
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/35 hover:text-primary active:scale-95"
                  >
                    <Search className="size-3.5" strokeWidth={1.35} aria-hidden />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAgregar(p)}
                    disabled={p.stockActual <= 0}
                    className="flex min-h-[160px] flex-1 flex-col p-4 text-left transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 touch-manipulation"
                  >
                    <div className="flex gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.imagenUrl ? (
                          <img
                            src={p.imagenUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground/50">
                            <Package className="size-7" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <h3
                          className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary md:text-[15px]"
                          title={p.nombre}
                        >
                          {p.nombre}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU {p.sku}</p>
                        {p.categoria?.nombre && (
                          <p className="mt-1 truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                            {p.categoria.nombre}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge variant={stock.variant} className="text-[10px] font-normal">
                        <Warehouse className="mr-1 size-3" />
                        {stock.text} · {p.stockActual} u.
                      </Badge>
                      {p.enConsignacion && (
                        <Badge className="bg-amber-500/15 text-[10px] font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-200">
                          Consignación
                        </Badge>
                      )}
                    </div>

                    {p.proveedor?.nombre && (
                      <p className="mt-2 truncate text-[11px] text-muted-foreground" title={p.proveedor.nombre}>
                        {p.proveedor.nombre}
                      </p>
                    )}

                    <div className="mt-auto flex items-end justify-between border-t border-border/60 pt-3">
                      <span className="text-base font-bold tabular-nums tracking-tight text-primary md:text-lg">
                        {formatPrecio(precio)}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground group-hover:text-primary sm:text-[11px]">
                        Agregar →
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <span className="text-sm text-muted-foreground">
                {total} producto{total !== 1 ? "s" : ""} · Pág. {page} / {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="min-h-10 min-w-10 touch-manipulation"
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas}
                  className="min-h-10 min-w-10 touch-manipulation"
                >
                  →
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={detalleProducto != null} onOpenChange={(o) => !o && setDetalleProducto(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(94vh,820px)] flex-col gap-0 overflow-hidden border-border/50 p-0 shadow-xl sm:max-w-[420px]"
        >
          {detalleProducto && (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 bg-background px-4 py-3.5 sm:px-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Detalle
                </span>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Cerrar"
                  >
                    <X className="size-4" strokeWidth={1.5} />
                  </Button>
                </DialogClose>
              </div>

              <div className="shrink-0 px-4 pt-3 sm:px-5">
                <div className="relative aspect-[5/2] w-full max-h-[142px] overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-black/5 dark:ring-white/10 sm:max-h-[158px]">
                  {detalleProducto.imagenUrl ? (
                    <img
                      src={detalleProducto.imagenUrl}
                      alt=""
                      className="size-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground/35">
                      <Package className="size-12" strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
                <DialogHeader className="m-0 shrink-0 space-y-0 p-0 text-left">
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                    <DialogTitle className="text-balance text-left text-base font-semibold leading-snug tracking-tight sm:text-[17px]">
                      {detalleProducto.nombre}
                    </DialogTitle>
                    {detalleProducto.enConsignacion && (
                      <Badge className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[10px] font-medium text-amber-900 dark:text-amber-200">
                        Consignación
                      </Badge>
                    )}
                  </div>
                  <DialogDescription asChild>
                    <p className="mt-2 font-mono text-[11px] leading-none tracking-wide text-muted-foreground">
                      {detalleProducto.sku}
                    </p>
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-3">
                  {detalleProducto.descripcion?.trim() ? (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{detalleProducto.descripcion}</p>
                  ) : (
                    <p className="text-[13px] italic text-muted-foreground/65">Sin descripción</p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                    Datos
                  </p>
                  <dl className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50 bg-muted/15 text-[13px]">
                    <div className="flex items-baseline justify-between gap-4 px-3.5 py-3 sm:px-4">
                      <dt className="shrink-0 text-muted-foreground">Precio venta</dt>
                      <dd className="text-right text-base font-semibold tabular-nums tracking-tight text-primary">
                        {formatPrecio(Number(detalleProducto.precioVenta))}
                      </dd>
                    </div>
                    {!detalleProducto.enConsignacion && detalleProducto.precioCompra != null && (
                      <div className="flex items-baseline justify-between gap-4 px-3.5 py-3 sm:px-4">
                        <dt className="shrink-0 text-muted-foreground">Precio compra</dt>
                        <dd className="text-right tabular-nums text-foreground/90">
                          {formatPrecio(Number(detalleProducto.precioCompra))}
                        </dd>
                      </div>
                    )}
                    {detalleProducto.enConsignacion && detalleProducto.comisionConsignacion != null && (
                      <div className="flex items-baseline justify-between gap-4 px-3.5 py-3 sm:px-4">
                        <dt className="shrink-0 text-muted-foreground">Comisión shop</dt>
                        <dd className="tabular-nums text-right text-foreground/90">
                          {Number(detalleProducto.comisionConsignacion).toFixed(1)}%
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4 px-3.5 py-3 sm:px-4">
                      <dt className="shrink-0 text-muted-foreground">Stock</dt>
                      <dd className="flex shrink-0 justify-end">
                        <Badge
                          variant={stockLabel(detalleProducto).variant}
                          className="border-0 font-medium tabular-nums shadow-none"
                        >
                          {stockLabel(detalleProducto).text} · {detalleProducto.stockActual} u.
                        </Badge>
                      </dd>
                    </div>
                    {detalleProducto.categoria?.nombre && (
                      <div className="flex items-start justify-between gap-4 px-3.5 py-3 sm:px-4">
                        <dt className="shrink-0 pt-px text-muted-foreground">Categoría</dt>
                        <dd className="min-w-0 max-w-[68%] text-right text-[13px] leading-snug text-foreground/90">
                          {detalleProducto.categoria.nombre}
                        </dd>
                      </div>
                    )}
                    {detalleProducto.proveedor?.nombre && (
                      <div className="flex items-start justify-between gap-4 px-3.5 py-3 sm:px-4">
                        <dt className="shrink-0 pt-px text-muted-foreground">Proveedor</dt>
                        <dd className="min-w-0 max-w-[68%] text-right text-[13px] leading-snug break-words text-foreground/90">
                          {detalleProducto.proveedor.nombre}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t border-border/50 bg-muted/20 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-border/60 sm:w-auto sm:min-w-[100px]"
                  onClick={() => setDetalleProducto(null)}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  className="h-10 w-full font-medium sm:w-auto sm:min-w-[160px]"
                  disabled={detalleProducto.stockActual <= 0}
                  onClick={() => {
                    handleAgregar(detalleProducto);
                    setDetalleProducto(null);
                  }}
                >
                  Agregar al carrito
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
