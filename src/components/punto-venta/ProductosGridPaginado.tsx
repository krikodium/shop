"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductoConProveedor } from "@/types";
import { calcularCostosItemVenta } from "@/lib/calculadores/ventasCalculator";
import type { ItemVentaInput } from "@/types";

const POR_PAGINA = 10;

interface ProductosGridPaginadoProps {
  onAgregar: (item: ItemVentaInput) => void;
}

export function ProductosGridPaginado({ onAgregar }: ProductosGridPaginadoProps) {
  const [query, setQuery] = useState("");
  const [productos, setProductos] = useState<ProductoConProveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nombre o SKU..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        className="text-sm"
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : productos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin productos
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {productos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAgregar(p)}
                disabled={p.stockActual <= 0}
                className="flex flex-col items-stretch rounded border bg-card p-2 text-left transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate text-xs font-medium" title={p.nombre}>
                  {p.nombre}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {p.sku}
                </span>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold">
                    ${Number(p.precioVenta).toFixed(0)}
                  </span>
                  {p.enConsignacion && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      C
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Stock: {p.stockActual}
                </span>
              </button>
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-xs text-muted-foreground">
                {total} producto{total !== 1 ? "s" : ""} • Pág. {page} / {totalPaginas}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas}
                >
                  →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
