"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Proveedor, Producto } from "@prisma/client";

interface LineaItem {
  productoId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default function NuevaCompraPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [items, setItems] = useState<LineaItem[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [notas, setNotas] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/proveedores").then((r) => r.json()),
      fetch("/api/productos").then((r) => r.json()),
    ]).then(([provs, prods]) => {
      setProveedores(Array.isArray(provs) ? provs : []);
      setProductos(Array.isArray(prods) ? prods : prods?.productos ?? []);
    });
  }, []);

  const agregarItem = () => {
    if (!productoSeleccionado) return;
    const p = productos.find((x) => x.id === productoSeleccionado);
    if (!p) return;
    const precio = precioUnitario > 0 ? precioUnitario : Number(p.precioCompra ?? 0);
    const cant = cantidad > 0 ? cantidad : 1;
    const sub = cant * precio;

    const existente = items.find((i) => i.productoId === p.id);
    if (existente) {
      setItems((prev) =>
        prev.map((i) =>
          i.productoId === p.id
            ? {
                ...i,
                cantidad: i.cantidad + cant,
                precioUnitario: precio,
                subtotal: (i.cantidad + cant) * precio,
              }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productoId: p.id,
          productoNombre: p.nombre,
          productoSku: p.sku,
          cantidad: cant,
          precioUnitario: precio,
          subtotal: sub,
        },
      ]);
    }
    setProductoSeleccionado("");
    setCantidad(1);
    setPrecioUnitario(0);
  };

  const quitarItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const crearOrden = async () => {
    if (!proveedorId || items.length === 0) {
      setError("Seleccioná proveedor y agregá al menos un producto");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          items: items.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          })),
          notas: notas || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Error");
      }
      const orden = await res.json();
      router.push(`/compras/${orden.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/compras">
        <Button variant="ghost">← Órdenes</Button>
      </Link>
      <h1 className="text-2xl font-bold">Nueva orden de compra</h1>

      <Card>
        <CardHeader>
          <CardTitle>Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={proveedorId} onValueChange={setProveedorId}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Seleccionar proveedor" />
            </SelectTrigger>
            <SelectContent>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar producto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm">Producto</label>
            <Select value={productoSeleccionado} onValueChange={(v) => {
              setProductoSeleccionado(v);
              const p = productos.find((x) => x.id === v);
              if (p) setPrecioUnitario(Number(p.precioCompra ?? 0));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-sm">Cantidad</label>
            <Input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-sm">P. unitario</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
            />
          </div>
          <Button onClick={agregarItem}>Agregar</Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Producto</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">P. unit.</th>
                  <th className="py-2 text-right">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.productoId} className="border-b">
                    <td className="py-2">{i.productoNombre}</td>
                    <td className="py-2 text-right">{i.cantidad}</td>
                    <td className="py-2 text-right">
                      ${i.precioUnitario.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      ${i.subtotal.toFixed(2)}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => quitarItem(i.productoId)}
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-between">
              <div>
                <label className="mb-1 block text-sm">Notas</label>
                <Input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Opcional"
                  className="max-w-md"
                />
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
                <Button
                  className="mt-2"
                  onClick={crearOrden}
                  disabled={isLoading}
                >
                  {isLoading ? "Creando…" : "Crear orden"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}
