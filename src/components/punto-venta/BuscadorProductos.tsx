"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import type { ProductoConProveedor } from "@/types";
import { calcularCostosItemVenta } from "@/lib/calculadores/ventasCalculator";
import type { ItemVentaInput } from "@/types";

interface BuscadorProductosProps {
  onAgregar: (item: ItemVentaInput, cantidad?: number) => void;
}

export function BuscadorProductos({ onAgregar }: BuscadorProductosProps) {
  const [query, setQuery] = useState("");
  const [productos, setProductos] = useState<ProductoConProveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setProductos([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
      setAbierto(true);
    } catch {
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, buscar]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAgregar = (p: ProductoConProveedor, cantidad = 1) => {
    const costos = calcularCostosItemVenta(p, cantidad);
    const precioVenta = Number(p.precioVenta);
    const subtotal = precioVenta * cantidad;

    onAgregar({
      productoId: p.id,
      productoNombre: p.nombre,
      productoSku: p.sku,
      cantidad,
      precioUnitario: precioVenta,
      subtotal,
      costoUnitario: costos.costoUnitario,
      costoTotal: costos.costoTotal,
      esConsignacion: costos.esConsignacion,
      deudaProveedor: costos.deudaProveedor || null,
      comisionShop: costos.comisionShop || null,
      proveedorId: costos.proveedorId,
    });
    setQuery("");
    setProductos([]);
    setAbierto(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Buscar por nombre o SKU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setAbierto(true)}
        className="text-base"
        autoFocus
      />
      {loading && (
        <p className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Buscando...
        </p>
      )}
      {abierto && productos.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {productos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-accent"
                onClick={() => handleAgregar(p)}
              >
                <div>
                  <span className="font-medium">{p.nombre}</span>
                  <span className="ml-2 text-muted-foreground">({p.sku})</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">${Number(p.precioVenta).toFixed(2)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Stock: {p.stockActual}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierto && query.length >= 2 && !loading && productos.length === 0 && (
        <p className="absolute left-0 top-full mt-1 text-sm text-muted-foreground">
          Sin resultados
        </p>
      )}
    </div>
  );
}
