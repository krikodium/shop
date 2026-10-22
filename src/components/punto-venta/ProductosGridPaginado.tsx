"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Info, Package, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SelectorVistaCatalogo,
  VISTAS_CATALOGO,
  esVistaCatalogo,
  type VistaCatalogo,
} from "@/components/punto-venta/SelectorVistaCatalogo";
import { usePreferenciaLocal } from "@/hooks/use-preferencia-local";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import type { ProductoConProveedor } from "@/types";
import { calcularCostosItemVenta } from "@/lib/calculadores/ventasCalculator";
import type { ItemVentaInput } from "@/types";

const CLAVE_VISTA = "punto-venta:vista-catalogo";

function precioCatalogo(p: ProductoConProveedor): string {
  const usd = (p as ProductoConProveedor & { precioVentaUsd?: unknown }).precioVentaUsd;
  if (usd != null && Number(usd) > 0 && Number(p.precioVenta) === 0) {
    return formatUSD(Number(usd));
  }
  return formatARS(Number(p.precioVenta));
}

function descripcionLimpia(desc?: string | null): string {
  if (!desc) return "";
  const idx = desc.indexOf("IMPORTACION_HC_SHA256:");
  return (idx >= 0 ? desc.slice(0, idx) : desc).trim();
}

interface ProductosGridPaginadoProps {
  onAgregar: (item: ItemVentaInput) => void;
  /** Cantidad ya cargada en la venta, por productoId. Solo para mostrarla. */
  enCarrito?: ReadonlyMap<string, number>;
  /** Permite seleccionar productos sin stock físico (para Pedidos por encargo). */
  permitirSinStock?: boolean;
}

type EstadoStock = "sin" | "bajo" | "ok";

function estadoStock(p: ProductoConProveedor): EstadoStock {
  if (p.stockActual <= 0) return "sin";
  if (p.stockActual <= p.stockMinimo) return "bajo";
  return "ok";
}

const TEXTO_STOCK: Record<EstadoStock, string> = {
  sin: "Sin stock",
  bajo: "Stock bajo",
  ok: "Disponible",
};

/** El color va solo en la cifra de stock. */
const TONO_STOCK: Record<EstadoStock, string> = {
  sin: "text-num-negative",
  bajo: "text-num-warning",
  ok: "text-foreground",
};

export function ProductosGridPaginado({
  onAgregar,
  enCarrito,
  permitirSinStock = false,
}: ProductosGridPaginadoProps) {
  const [query, setQuery] = useState("");
  const [soloConStock, setSoloConStock] = useState(!permitirSinStock);
  const [productos, setProductos] = useState<ProductoConProveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detalleProducto, setDetalleProducto] = useState<ProductoConProveedor | null>(null);
  const [vistaGuardada, setVistaGuardada] = usePreferenciaLocal<VistaCatalogo>(
    CLAVE_VISTA,
    "fotos"
  );
  // Lo guardado puede venir de una versión vieja o estar adulterado.
  const vista: VistaCatalogo = esVistaCatalogo(vistaGuardada) ? vistaGuardada : "fotos";
  const porPagina = VISTAS_CATALOGO.find((v) => v.id === vista)?.porPagina ?? 12;

  // Descarta respuestas que llegan después de una búsqueda más nueva.
  const ultimaConsulta = useRef(0);

  const cargar = useCallback(
    async (q: string, p: number, limite: number, filtrarConStock: boolean) => {
      const consulta = ++ultimaConsulta.current;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("limit", String(limite));
        if (q && q.length >= 1) params.set("q", q);
        if (filtrarConStock) params.set("conStock", "true");
        const res = await fetch(`/api/productos?${params}`);
        const data = await res.json();
        if (consulta !== ultimaConsulta.current) return;
        if (data.productos && typeof data.total === "number") {
          setProductos(data.productos);
          setTotal(data.total);
        } else {
          setProductos(Array.isArray(data) ? data : []);
          setTotal(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        if (consulta !== ultimaConsulta.current) return;
        setProductos([]);
        setTotal(0);
      } finally {
        if (consulta === ultimaConsulta.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    cargar(query, page, porPagina, soloConStock);
  }, [query, page, porPagina, soloConStock, cargar]);

  const totalPaginas = Math.ceil(total / porPagina);

  const cambiarVista = (nueva: VistaCatalogo) => {
    setVistaGuardada(nueva);
    // Cambia el tamaño de página: la página actual deja de tener sentido.
    setPage(1);
  };

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

  /**
   * Enter en el buscador: si el texto es exactamente el SKU de un producto
   * listado (o hay un único resultado), lo agrega y limpia la búsqueda.
   * Pensado para cargar rápido por código o con lector.
   */
  const alPresionarEnBuscador = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || loading) return;
    const texto = query.trim().toLowerCase();
    if (!texto) return;
    const exacto = productos.find((p) => p.sku.toLowerCase() === texto);
    const candidato = exacto ?? (productos.length === 1 ? productos[0] : undefined);
    if (!candidato) return;
    e.preventDefault();
    handleAgregar(candidato);
    setQuery("");
    setPage(1);
  };

  const desde = total === 0 ? 0 : (page - 1) * porPagina + 1;
  const hasta = Math.min(page * porPagina, total);

  return (
    <Panel>
      <PanelHeader
        title="Catálogo"
        descripcion={
          loading && total === 0
            ? "Cargando productos…"
            : `${total} producto${total !== 1 ? "s" : ""}${query.trim() ? " para la búsqueda" : soloConStock ? " con stock" : " activos"}`
        }
        acciones={<SelectorVistaCatalogo valor={vista} onCambiar={cambiarVista} />}
      />

      <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <Label htmlFor="pv-buscar" className="sr-only">
          Buscar producto por nombre o SKU
        </Label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="pv-buscar"
            type="search"
            autoComplete="off"
            placeholder="Buscar por nombre o SKU…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={alPresionarEnBuscador}
            className="h-10 pl-9 text-sm"
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={soloConStock}
          onClick={() => {
            setSoloConStock((prev) => !prev);
            setPage(1);
          }}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
            soloConStock
              ? "border-foreground bg-accent text-foreground"
              : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          title={
            soloConStock
              ? "Mostrando solo productos con stock disponible. Clic para incluir sin stock."
              : "Mostrando todos los productos (incluye sin stock). Clic para ocultar sin stock."
          }
        >
          <span
            className={cn(
              "size-2 rounded-full transition-colors",
              soloConStock ? "bg-foreground" : "bg-muted-foreground/40",
            )}
          />
          <span>{soloConStock ? "Ocultando sin stock" : "Incluyendo sin stock"}</span>
        </button>
      </div>

      <div aria-busy={loading || undefined}>
        {loading && productos.length === 0 ? (
          <EsqueletoCatalogo vista={vista} />
        ) : productos.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              className="py-8"
              titulo="Sin productos"
              descripcion={
                query.trim()
                  ? soloConStock
                    ? `No hay coincidencias con stock para “${query.trim()}”. Si faltó actualizar el stock, podés mostrar también los productos sin stock.`
                    : `No hay coincidencias para “${query.trim()}”. Probá con parte del nombre o el SKU.`
                  : soloConStock
                    ? "No hay productos con stock cargado en este momento."
                    : "No hay productos activos para vender."
              }
              accion={
                soloConStock ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSoloConStock(false);
                      setPage(1);
                    }}
                  >
                    Mostrar también sin stock
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className={cn("transition-opacity", loading && "opacity-60")}>
            {vista === "fotos" && (
              <VistaFotos
                productos={productos}
                enCarrito={enCarrito}
                permitirSinStock={true}
                onAgregar={handleAgregar}
                onDetalle={setDetalleProducto}
              />
            )}
            {vista === "lista" && (
              <VistaLista
                productos={productos}
                enCarrito={enCarrito}
                permitirSinStock={true}
                onAgregar={handleAgregar}
                onDetalle={setDetalleProducto}
              />
            )}
            {vista === "compacta" && (
              <VistaCompacta
                productos={productos}
                enCarrito={enCarrito}
                permitirSinStock={true}
                onAgregar={handleAgregar}
              />
            )}
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:px-5">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {desde}–{hasta} de {total} · pág. {page}/{totalPaginas}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              disabled={page >= totalPaginas}
              aria-label="Página siguiente"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <DetalleProducto
        producto={detalleProducto}
        permitirSinStock={true}
        onCerrar={() => setDetalleProducto(null)}
        onAgregar={(p) => {
          handleAgregar(p);
          setDetalleProducto(null);
        }}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------------ */
/* Vistas                                                                    */
/* ------------------------------------------------------------------------ */

interface VistaProps {
  productos: ProductoConProveedor[];
  enCarrito?: ReadonlyMap<string, number>;
  permitirSinStock?: boolean;
  onAgregar: (p: ProductoConProveedor) => void;
  onDetalle?: (p: ProductoConProveedor) => void;
}

function EnLaVenta({ cantidad }: { cantidad?: number }) {
  if (!cantidad) return null;
  return (
    <span className="font-mono text-[11px] tabular-nums text-foreground">
      {cantidad} en la venta
    </span>
  );
}

function VistaFotos({
  productos,
  enCarrito,
  permitirSinStock,
  onAgregar,
  onDetalle,
}: VistaProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 2xl:grid-cols-4">
      {productos.map((p) => {
        const estado = estadoStock(p);
        const cantidad = enCarrito?.get(p.id);
        return (
          <li
            key={p.id}
            className={cn(
              "group flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-border-strong",
              cantidad && "border-foreground/40"
            )}
          >
            <button
              type="button"
              onClick={() => onAgregar(p)}
              disabled={!permitirSinStock && estado === "sin"}
              aria-label={`Agregar ${p.nombre}, ${precioCatalogo(p)}`}
              className="flex flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
                {p.imagenUrl ? (
                  // Las fotos conservan su color real: nada de filtros ni grises.
                  <img
                    src={p.imagenUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    <Package className="size-5 text-muted-foreground" aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col gap-1 p-2.5">
                <span className="line-clamp-2 text-sm font-medium leading-snug" title={p.nombre}>
                  {p.nombre}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                <span className="mt-auto flex items-baseline justify-between gap-2 pt-1">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {precioCatalogo(p)}
                  </span>
                  <span className={cn("font-mono text-[11px] tabular-nums", TONO_STOCK[estado])}>
                    {estado === "sin"
                      ? permitirSinStock
                        ? "por encargo"
                        : "sin stock"
                      : `${p.stockActual} u.`}
                  </span>
                </span>
              </span>
            </button>
            <div className="flex min-h-8 items-center justify-between gap-2 border-t border-border px-2.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <EnLaVenta cantidad={cantidad} />
                {!cantidad && p.enConsignacion && (
                  <span className="text-[11px] text-muted-foreground">Consignación</span>
                )}
              </span>
              {onDetalle && (
                <button
                  type="button"
                  onClick={() => onDetalle(p)}
                  className="-mr-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Ver detalle de ${p.nombre}`}
                >
                  Detalle
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function VistaLista({
  productos,
  enCarrito,
  permitirSinStock,
  onAgregar,
  onDetalle,
}: VistaProps) {
  return (
    <div>
      <div
        className="hidden grid-cols-[minmax(0,1fr)_5.5rem_7.5rem_2.25rem] gap-3 border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:grid sm:px-5"
        aria-hidden="true"
      >
        <span>Producto</span>
        <span className="text-right">Stock</span>
        <span className="text-right">Precio</span>
        <span />
      </div>
      <ul className="divide-y divide-border">
        {productos.map((p) => {
          const estado = estadoStock(p);
          const cantidad = enCarrito?.get(p.id);
          return (
            <li key={p.id} className="flex items-stretch">
              <button
                type="button"
                onClick={() => onAgregar(p)}
                disabled={!permitirSinStock && estado === "sin"}
                aria-label={`Agregar ${p.nombre}, ${precioCatalogo(p)}`}
                className="grid min-h-12 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:grid-cols-[minmax(0,1fr)_5.5rem_7.5rem] sm:pl-5 touch-manipulation"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.nombre}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground">
                    <span>{p.sku}</span>
                    {p.enConsignacion && <span className="font-sans">· Consignación</span>}
                    {cantidad ? (
                      <span className="text-foreground">· {cantidad} en la venta</span>
                    ) : null}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden text-right font-mono text-xs tabular-nums sm:block",
                    TONO_STOCK[estado]
                  )}
                >
                  {estado === "sin"
                    ? permitirSinStock
                      ? "por encargo"
                      : "sin stock"
                    : `${p.stockActual} u.`}
                </span>
                <span className="text-right font-mono text-sm font-semibold tabular-nums">
                  {precioCatalogo(p)}
                  <span
                    className={cn(
                      "block text-[11px] font-normal sm:hidden",
                      TONO_STOCK[estado]
                    )}
                  >
                    {estado === "sin"
                      ? permitirSinStock
                        ? "por encargo"
                        : "sin stock"
                      : `${p.stockActual} u.`}
                  </span>
                </span>
              </button>
              {onDetalle && (
                <button
                  type="button"
                  onClick={() => onDetalle(p)}
                  aria-label={`Ver detalle de ${p.nombre}`}
                  className="flex w-9 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:mr-2"
                >
                  <Info className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VistaCompacta({
  productos,
  enCarrito,
  permitirSinStock,
  onAgregar,
}: VistaProps) {
  return (
    <ul className="divide-y divide-border">
      {productos.map((p) => {
        const estado = estadoStock(p);
        const cantidad = enCarrito?.get(p.id);
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onAgregar(p)}
              disabled={!permitirSinStock && estado === "sin"}
              title={`${p.nombre} · ${TEXTO_STOCK[estado]}`}
              aria-label={`Agregar ${p.sku} ${p.nombre}, ${precioCatalogo(p)}`}
              className="grid min-h-9 w-full grid-cols-[6.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-1 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 touch-manipulation"
            >
              <span className="truncate font-mono text-muted-foreground">{p.sku}</span>
              <span className="truncate">
                {cantidad ? (
                  <span className="mr-1.5 font-mono tabular-nums text-foreground">×{cantidad}</span>
                ) : null}
                {p.nombre}
              </span>
              <span className={cn("text-right font-mono tabular-nums", TONO_STOCK[estado])}>
                {estado === "sin" ? "0" : p.stockActual}
              </span>
              <span className="min-w-[5.5rem] text-right font-mono font-semibold tabular-nums">
                {precioCatalogo(p)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EsqueletoCatalogo({ vista }: { vista: VistaCatalogo }) {
  if (vista === "fotos") {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-border">
            <div className="aspect-[4/3] animate-skeleton-shimmer" />
            <div className="space-y-2 p-2.5">
              <div className="h-4 w-3/4 animate-skeleton-shimmer rounded" />
              <div className="h-3 w-1/3 animate-skeleton-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  const filas = vista === "lista" ? 8 : 12;
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: filas }).map((_, i) => (
        <div
          key={i}
          className={cn("flex items-center gap-3 px-4 sm:px-5", vista === "lista" ? "h-12" : "h-9")}
        >
          <div className="h-3.5 w-1/2 animate-skeleton-shimmer rounded" />
          <div className="ml-auto h-3.5 w-16 animate-skeleton-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Detalle                                                                   */
/* ------------------------------------------------------------------------ */

function FilaDato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function DetalleProducto({
  producto,
  permitirSinStock,
  onCerrar,
  onAgregar,
}: {
  producto: ProductoConProveedor | null;
  permitirSinStock?: boolean;
  onCerrar: () => void;
  onAgregar: (p: ProductoConProveedor) => void;
}) {
  const estado = producto ? estadoStock(producto) : "ok";
  return (
    <Dialog open={producto != null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(94vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]"
      >
        {producto && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Detalle del producto
              </span>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar">
                  <X aria-hidden="true" />
                </Button>
              </DialogClose>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4 sm:px-5">
              {producto.imagenUrl && (
                <div className="mb-4 aspect-[5/2] w-full overflow-hidden rounded-md border border-border bg-muted">
                  <img src={producto.imagenUrl} alt="" className="size-full object-cover" />
                </div>
              )}
              <DialogHeader className="m-0 space-y-0 p-0 text-left">
                <DialogTitle className="text-balance text-left text-base font-semibold leading-snug">
                  {producto.nombre}
                </DialogTitle>
                <DialogDescription asChild>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <span>{producto.sku}</span>
                    {producto.enConsignacion && (
                      <Badge variant="outline" className="font-sans text-[10px] font-normal">
                        Consignación
                      </Badge>
                    )}
                  </p>
                </DialogDescription>
              </DialogHeader>

              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {descripcionLimpia(producto.descripcion) || "Sin descripción."}
              </p>

              <dl className="mt-4 divide-y divide-border border-y border-border text-[13px]">
                <FilaDato label="Precio de venta">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {precioCatalogo(producto)}
                  </span>
                </FilaDato>
                {!producto.enConsignacion && producto.precioCompra != null && (
                  <FilaDato label="Precio de compra">
                    <span className="font-mono tabular-nums">
                      {formatARS(Number(producto.precioCompra))}
                    </span>
                  </FilaDato>
                )}
                {producto.enConsignacion && producto.comisionConsignacion != null && (
                  <FilaDato label="Comisión shop">
                    <span className="font-mono tabular-nums">
                      {Number(producto.comisionConsignacion).toFixed(1)}%
                    </span>
                  </FilaDato>
                )}
                <FilaDato label="Stock">
                  <span className="text-muted-foreground">{TEXTO_STOCK[estado]} · </span>
                  <span className={cn("font-mono tabular-nums", TONO_STOCK[estado])}>
                    {producto.stockActual} u.
                  </span>
                </FilaDato>
                {producto.categoria?.nombre && (
                  <FilaDato label="Categoría">{producto.categoria.nombre}</FilaDato>
                )}
                {producto.proveedor?.nombre && (
                  <FilaDato label="Proveedor">
                    <span className="break-words">{producto.proveedor.nombre}</span>
                  </FilaDato>
                )}
              </dl>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="outline" className="h-10" onClick={onCerrar}>
                Cerrar
              </Button>
              <Button
                type="button"
                className="h-10"
                disabled={!permitirSinStock && estado === "sin"}
                onClick={() => onAgregar(producto)}
              >
                Agregar a la venta
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
