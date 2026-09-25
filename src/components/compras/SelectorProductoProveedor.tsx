"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

export interface ParteProveedor {
  id: string;
  parteNombre: string;
  proveedorId: string;
}

export interface ProductoProveedor {
  id: string;
  nombre: string;
  sku: string;
  /** Costo de referencia ya cargado en el producto. No se recalcula acá. */
  precioCompra: number | null;
  /** Proveedor principal del producto, si tiene. */
  proveedorId: string | null;
  /** Partes del proveedor filtrado (las devuelve la API cuando hay filtro). */
  partesProveedor: ParteProveedor[];
}

const claseLabel = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

function normalizar(raw: unknown): ProductoProveedor[] {
  const lista = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { productos?: unknown })?.productos)
      ? ((raw as { productos: unknown[] }).productos)
      : [];

  return lista.map((item) => {
    const p = item as Record<string, unknown>;
    const partes = Array.isArray(p.partesProveedor) ? p.partesProveedor : [];
    return {
      id: String(p.id ?? ""),
      nombre: String(p.nombre ?? ""),
      sku: String(p.sku ?? ""),
      precioCompra: p.precioCompra == null ? null : Number(p.precioCompra),
      proveedorId: p.proveedorId == null ? null : String(p.proveedorId),
      partesProveedor: partes.map((parte) => {
        const x = parte as Record<string, unknown>;
        return {
          id: String(x.id ?? ""),
          parteNombre: String(x.parteNombre ?? ""),
          proveedorId: String(x.proveedorId ?? ""),
        };
      }),
    };
  });
}

/** Filas fantasma con la forma real de la lista, en vez de un "Cargando…". */
function FilasSkeleton() {
  return (
    <ul
      className="divide-y divide-border"
      aria-busy="true"
      aria-label="Cargando productos del proveedor"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-4 w-48 max-w-full animate-skeleton-shimmer rounded" />
            <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
          </div>
          <div className="h-4 w-20 animate-skeleton-shimmer rounded" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Buscador de productos acotado a un proveedor.
 *
 * Sin proveedor elegido queda deshabilitado: el dueño pidió explícitamente que
 * no se puedan cargar productos de otro proveedor en la orden equivocada.
 *
 * El componente se monta con `key={proveedorId}`: al cambiar de proveedor se
 * remonta y el estado interno (búsqueda y lista) arranca limpio.
 */
export function SelectorProductoProveedor({
  proveedorId,
  proveedorNombre,
  productoSeleccionadoId,
  onElegir,
}: {
  proveedorId: string;
  proveedorNombre?: string;
  productoSeleccionadoId: string;
  onElegir: (producto: ProductoProveedor) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [productos, setProductos] = useState<ProductoProveedor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Distingue "el proveedor no tiene nada" de "la búsqueda no matcheó". */
  const [tieneAlguno, setTieneAlguno] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    if (!proveedorId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ proveedorId });
    if (busquedaDebounced) params.set("q", busquedaDebounced);

    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null;
        setCargando(true);
        setError(null);
        return fetch(`/api/productos?${params.toString()}`, { signal: controller.signal });
      })
      .then((res) => {
        if (!res) return null;
        if (!res.ok) throw new Error("No se pudieron cargar los productos del proveedor");
        return res.json();
      })
      .then((payload) => {
        if (!payload) return;
        const filas = normalizar(payload);
        setProductos(filas);
        if (!busquedaDebounced) setTieneAlguno(filas.length > 0);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setProductos([]);
        setError(err instanceof Error ? err.message : "Error al cargar productos");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [proveedorId, busquedaDebounced]);

  const sinProveedor = !proveedorId;
  const proveedorVacio = useMemo(
    () => !sinProveedor && !cargando && !error && !tieneAlguno,
    [sinProveedor, cargando, error, tieneAlguno]
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="compra-buscar-producto" className={claseLabel}>
          Producto
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="compra-buscar-producto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={sinProveedor}
            aria-describedby="compra-buscar-producto-ayuda"
            placeholder={
              sinProveedor
                ? "Elegí primero el proveedor"
                : "Buscar por nombre o SKU del proveedor"
            }
            className="h-10 w-full pl-9"
          />
        </div>
        <p id="compra-buscar-producto-ayuda" className="text-xs text-muted-foreground">
          {sinProveedor
            ? "Elegí primero el proveedor: la orden solo puede llevar productos suyos."
            : `Solo productos de ${proveedorNombre ?? "este proveedor"}, incluidos los que tienen alguna parte suya.`}
        </p>
      </div>

      {!sinProveedor && (
        <div className="overflow-hidden rounded-lg border border-border">
          {cargando && productos.length === 0 ? (
            <FilasSkeleton />
          ) : error ? (
            <p role="alert" className="px-4 py-6 text-sm text-destructive sm:px-5">
              {error}
            </p>
          ) : proveedorVacio ? (
            <div className="p-3">
              <EmptyState
                icono={PackageSearch}
                titulo="Este proveedor no tiene productos cargados"
                descripcion="Cargá un producto y asignáselo para poder comprarle."
                accion={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/productos/nuevo">Cargar producto</Link>
                  </Button>
                }
              />
            </div>
          ) : productos.length === 0 ? (
            <div className="p-3">
              <EmptyState
                titulo="Sin resultados"
                descripcion={`Ningún producto de este proveedor coincide con “${busquedaDebounced}”.`}
              />
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {productos.map((p, indice) => {
                const porParte = p.proveedorId !== proveedorId && p.partesProveedor.length > 0;
                const seleccionado = p.id === productoSeleccionadoId;
                return (
                  <Reveal as="li" key={p.id} indice={indice}>
                    <button
                      type="button"
                      onClick={() => onElegir(p)}
                      aria-pressed={seleccionado}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5",
                        seleccionado && "bg-accent"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{p.nombre}</span>
                          {porParte &&
                            p.partesProveedor.map((parte) => (
                              <Badge key={parte.id} variant="outline">
                                Parte · {parte.parteNombre}
                              </Badge>
                            ))}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                        {p.precioCompra != null ? formatARS(p.precioCompra) : "—"}
                      </span>
                    </button>
                  </Reveal>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
