"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

  const [modalNuevoProveedorOpen, setModalNuevoProveedorOpen] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("");
  const [nuevoProveedorTelefono, setNuevoProveedorTelefono] = useState("");
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [errorProveedor, setErrorProveedor] = useState<string | null>(null);

  const [modalNuevoProductoOpen, setModalNuevoProductoOpen] = useState(false);
  const [nuevoSku, setNuevoSku] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecioCompra, setNuevoPrecioCompra] = useState(0);
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState(0);
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  const loadProductos = () =>
    fetch("/api/productos")
      .then((r) => r.json())
      .then((prods) => setProductos(Array.isArray(prods) ? prods : prods?.productos ?? []));

  const loadProveedores = () =>
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((provs) => setProveedores(Array.isArray(provs) ? provs : []));

  const crearProveedor = async () => {
    const nombre = nuevoProveedorNombre.trim();
    if (!nombre) {
      setErrorProveedor("El nombre es obligatorio");
      toast.error("El nombre es obligatorio");
      return;
    }
    setGuardandoProveedor(true);
    setErrorProveedor(null);
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          telefono: nuevoProveedorTelefono.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al crear proveedor");
      }
      const proveedor = await res.json();
      await loadProveedores();
      setProveedorId(proveedor.id);
      toast.success("Proveedor creado y asignado");
      setModalNuevoProveedorOpen(false);
      setNuevoProveedorNombre("");
      setNuevoProveedorTelefono("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear proveedor";
      setErrorProveedor(msg);
      toast.error(msg);
    } finally {
      setGuardandoProveedor(false);
    }
  };

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

  const crearYAgregarProducto = async () => {
    const sku = nuevoSku.trim();
    const nombre = nuevoNombre.trim();
    if (!sku || !nombre) {
      toast.error("SKU y nombre son obligatorios");
      return;
    }
    if (nuevoPrecioCompra <= 0) {
      toast.error("El precio de compra es obligatorio para la orden");
      return;
    }
    if (nuevoPrecioVenta <= 0) {
      toast.error("El precio de venta es obligatorio");
      return;
    }
    const existeSku = productos.some((p) => p.sku.toLowerCase() === sku.toLowerCase());
    if (existeSku) {
      toast.error("Ya existe un producto con ese SKU");
      return;
    }
    setGuardandoNuevo(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          nombre,
          precioCompra: nuevoPrecioCompra || null,
          precioVenta: nuevoPrecioVenta,
          stockActual: 0,
          stockMinimo: 5,
          proveedorId: proveedorId || null,
          enConsignacion: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al crear producto");
      }
      const producto = await res.json();
      await loadProductos();
      const precio = nuevoPrecioCompra;
      const cant = nuevaCantidad > 0 ? nuevaCantidad : 1;
      const sub = cant * precio;
      setItems((prev) => [
        ...prev,
        {
          productoId: producto.id,
          productoNombre: producto.nombre,
          productoSku: producto.sku,
          cantidad: cant,
          precioUnitario: precio,
          subtotal: sub,
        },
      ]);
      toast.success("Producto creado y agregado a la orden");
      setModalNuevoProductoOpen(false);
      setNuevoSku("");
      setNuevoNombre("");
      setNuevoPrecioCompra(0);
      setNuevoPrecioVenta(0);
      setNuevaCantidad(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear producto");
    } finally {
      setGuardandoNuevo(false);
    }
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
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={proveedorId} onValueChange={setProveedorId}>
            <SelectTrigger className="min-h-10 flex-1 max-w-xs">
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
          <Dialog
            open={modalNuevoProveedorOpen}
            onOpenChange={(open) => {
              setModalNuevoProveedorOpen(open);
              if (!open) setErrorProveedor(null);
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="min-h-10">
                + Nuevo proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[min(95vw,400px)]">
              <DialogHeader>
                <DialogTitle>Nuevo proveedor</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Nombre obligatorio. Teléfono opcional.
                </p>
              </DialogHeader>
              <div className="grid gap-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nuevo-proveedor-nombre">Nombre *</Label>
                  <Input
                    id="nuevo-proveedor-nombre"
                    placeholder="Nombre del proveedor"
                    value={nuevoProveedorNombre}
                    onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevo-proveedor-telefono">Teléfono</Label>
                  <Input
                    id="nuevo-proveedor-telefono"
                    placeholder="Teléfono"
                    type="tel"
                    value={nuevoProveedorTelefono}
                    onChange={(e) => setNuevoProveedorTelefono(e.target.value)}
                    className="min-h-11"
                  />
                </div>
                {errorProveedor && (
                  <p className="text-sm text-destructive">{errorProveedor}</p>
                )}
                <Button
                  onClick={crearProveedor}
                  disabled={guardandoProveedor}
                  className="min-h-11 w-full"
                >
                  {guardandoProveedor ? "Guardando…" : "Crear y asignar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Agregar producto</CardTitle>
          <Dialog open={modalNuevoProductoOpen} onOpenChange={setModalNuevoProductoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                + Nuevo producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear producto y agregar a la orden</DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nuevo-sku">SKU *</Label>
                  <Input
                    id="nuevo-sku"
                    value={nuevoSku}
                    onChange={(e) => setNuevoSku(e.target.value)}
                    placeholder="Ej: PROD-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevo-nombre">Nombre *</Label>
                  <Input
                    id="nuevo-nombre"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-precio-compra">Precio compra *</Label>
                    <CurrencyInput
                      id="nuevo-precio-compra"
                      value={nuevoPrecioCompra}
                      onChange={(v) => setNuevoPrecioCompra(v ?? 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-precio-venta">Precio venta *</Label>
                    <CurrencyInput
                      id="nuevo-precio-venta"
                      value={nuevoPrecioVenta}
                      onChange={(v) => setNuevoPrecioVenta(v ?? 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nueva-cantidad">Cantidad</Label>
                  <Input
                    id="nueva-cantidad"
                    type="number"
                    min={1}
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                {proveedorId && (
                  <p className="text-sm text-muted-foreground">
                    Se asignará al proveedor seleccionado en la orden.
                  </p>
                )}
                <Button
                  onClick={crearYAgregarProducto}
                  disabled={guardandoNuevo}
                >
                  {guardandoNuevo ? "Guardando…" : "Crear y agregar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
          <div className="w-32">
            <label className="mb-1 block text-sm">P. unitario</label>
            <CurrencyInput
              value={precioUnitario}
              onChange={(v) => setPrecioUnitario(v ?? 0)}
              placeholder="0"
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
