"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { formatARS } from "@/lib/formatCurrency";
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
import {
  SelectorProductoProveedor,
  type ProductoProveedor,
} from "@/components/compras/SelectorProductoProveedor";
import { Reveal } from "@/components/ui/reveal";
import type { Proveedor } from "@prisma/client";

const claseLabel = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

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
  const [proveedorId, setProveedorId] = useState("");
  const [items, setItems] = useState<LineaItem[]>([]);
  const [productoElegido, setProductoElegido] = useState<ProductoProveedor | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Cambio de proveedor con ítems ya cargados: se confirma, nunca se borra solo. */
  const [proveedorPendiente, setProveedorPendiente] = useState<string | null>(null);

  const [modalNuevoProveedorOpen, setModalNuevoProveedorOpen] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("");
  const [nuevoProveedorTelefono, setNuevoProveedorTelefono] = useState("");
  const [errorProveedor, setErrorProveedor] = useState<string | null>(null);

  const [modalNuevoProductoOpen, setModalNuevoProductoOpen] = useState(false);
  const [nuevoSku, setNuevoSku] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecioCompra, setNuevoPrecioCompra] = useState(0);
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState(0);
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  /** Fuerza al selector a recargar la lista del proveedor tras crear un producto. */
  const [versionProductos, setVersionProductos] = useState(0);

  const loadProveedores = () =>
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((provs) => setProveedores(Array.isArray(provs) ? provs : []));

  const { run: crearProveedor, loading: guardandoProveedor } = useAsyncAction(async () => {
    const nombre = nuevoProveedorNombre.trim();
    if (!nombre) {
      setErrorProveedor("El nombre es obligatorio");
      notificar.error("El nombre es obligatorio");
      return;
    }
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
      // Un proveedor recién creado no tiene ítems previos que pisar.
      setProveedorId(proveedor.id);
      setProductoElegido(null);
      notificar.ok("Proveedor creado y asignado");
      setModalNuevoProveedorOpen(false);
      setNuevoProveedorNombre("");
      setNuevoProveedorTelefono("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear proveedor";
      setErrorProveedor(msg);
      notificar.error(msg);
    }
  });

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((provs) => setProveedores(Array.isArray(provs) ? provs : []))
      .catch(() => setProveedores([]));
  }, []);

  const proveedorNombre = proveedores.find((p) => p.id === proveedorId)?.nombre;
  const proveedorPendienteNombre = proveedores.find((p) => p.id === proveedorPendiente)?.nombre;

  const pedirCambioDeProveedor = (nuevoId: string) => {
    if (nuevoId === proveedorId) return;
    if (items.length > 0) {
      setProveedorPendiente(nuevoId);
      return;
    }
    setProveedorId(nuevoId);
    setProductoElegido(null);
    setPrecioUnitario(0);
    setCantidad(1);
  };

  const confirmarCambioDeProveedor = () => {
    if (!proveedorPendiente) return;
    setProveedorId(proveedorPendiente);
    setItems([]);
    setProductoElegido(null);
    setPrecioUnitario(0);
    setCantidad(1);
    setProveedorPendiente(null);
    notificar.info("Orden vaciada: los ítems eran de otro proveedor");
  };

  const elegirProducto = (producto: ProductoProveedor) => {
    setProductoElegido(producto);
    setPrecioUnitario(Number(producto.precioCompra ?? 0));
  };

  const agregarItem = () => {
    const p = productoElegido;
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
    setProductoElegido(null);
    setCantidad(1);
    setPrecioUnitario(0);
  };

  const quitarItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const { run: crearYAgregarProducto, loading: guardandoNuevo } = useAsyncAction(async () => {
    const sku = nuevoSku.trim();
    const nombre = nuevoNombre.trim();
    if (!proveedorId) {
      notificar.error("Elegí primero el proveedor");
      return;
    }
    if (!sku || !nombre) {
      notificar.error("SKU y nombre son obligatorios");
      return;
    }
    if (nuevoPrecioCompra <= 0) {
      notificar.error("El precio de compra es obligatorio para la orden");
      return;
    }
    if (nuevoPrecioVenta <= 0) {
      notificar.error("El precio de venta es obligatorio");
      return;
    }
    try {
      // El SKU es único a nivel catálogo, no por proveedor: se consulta sin
      // filtrar por proveedor para avisar antes de que falle el alta.
      const existentes = await fetch(`/api/productos?q=${encodeURIComponent(sku)}&limit=50`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const lista = Array.isArray(existentes) ? existentes : (existentes?.productos ?? []);
      if (
        Array.isArray(lista) &&
        lista.some((p: { sku?: string }) => (p.sku ?? "").toLowerCase() === sku.toLowerCase())
      ) {
        notificar.error("Ya existe un producto con ese SKU");
        return;
      }

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
      setVersionProductos((v) => v + 1);
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
      notificar.ok("Producto creado y agregado a la orden");
      setModalNuevoProductoOpen(false);
      setNuevoSku("");
      setNuevoNombre("");
      setNuevoPrecioCompra(0);
      setNuevoPrecioVenta(0);
      setNuevaCantidad(1);
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error al crear producto");
    }
  });

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const { run: crearOrden, loading: isLoading } = useAsyncAction(async () => {
    if (!proveedorId || items.length === 0) {
      setError("Seleccioná proveedor y agregá al menos un producto");
      return;
    }
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
    }
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/compras">← Compras</Link>
      </Button>

      <PageHeader
        overline="Mercadería · Compras"
        title="Nueva orden de compra"
        description="Elegí el proveedor, cargá los productos y confirmá la orden."
      />

      <Panel>
        <PanelHeader
          title="Proveedor"
          descripcion="Define qué productos se pueden cargar en esta orden."
        />
        <PanelBody className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={proveedorId} onValueChange={pedirCambioDeProveedor}>
            <SelectTrigger className="h-10 w-full sm:max-w-xs" aria-label="Proveedor">
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
              <Button type="button" variant="outline" className="h-10">
                Nuevo proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nuevo proveedor</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Nombre obligatorio. Teléfono opcional.
                </p>
              </DialogHeader>
              <div className="grid gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nuevo-proveedor-nombre">Nombre *</Label>
                  <Input
                    id="nuevo-proveedor-nombre"
                    placeholder="Nombre del proveedor"
                    value={nuevoProveedorNombre}
                    onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nuevo-proveedor-telefono">Teléfono</Label>
                  <Input
                    id="nuevo-proveedor-telefono"
                    placeholder="Teléfono"
                    type="tel"
                    value={nuevoProveedorTelefono}
                    onChange={(e) => setNuevoProveedorTelefono(e.target.value)}
                    className="h-10"
                  />
                </div>
                {errorProveedor && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorProveedor}
                  </p>
                )}
                <Button
                  onClick={() => void crearProveedor()}
                  loading={guardandoProveedor}
                  loadingText="Guardando…"
                  className="w-full"
                >
                  Crear y asignar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PanelBody>
      </Panel>

      <AlertDialog
        open={proveedorPendiente !== null}
        onOpenChange={(open) => {
          if (!open) setProveedorPendiente(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar de proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              La orden ya tiene {items.length} {items.length === 1 ? "ítem" : "ítems"} de{" "}
              {proveedorNombre ?? "el proveedor actual"}. Una orden de compra es de un solo
              proveedor, así que pasar a {proveedorPendienteNombre ?? "otro proveedor"} implica
              vaciarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar {proveedorNombre ?? "el actual"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarCambioDeProveedor();
              }}
            >
              Vaciar y cambiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Panel>
        <PanelHeader
          title="Agregar producto"
          acciones={
            <Dialog open={modalNuevoProductoOpen} onOpenChange={setModalNuevoProductoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!proveedorId}>
                  Nuevo producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear producto y agregar a la orden</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="nuevo-sku">SKU *</Label>
                    <Input
                      id="nuevo-sku"
                      value={nuevoSku}
                      onChange={(e) => setNuevoSku(e.target.value)}
                      placeholder="Ej: PROD-001"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nuevo-nombre">Nombre *</Label>
                    <Input
                      id="nuevo-nombre"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Nombre del producto"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="nuevo-precio-compra">Precio compra *</Label>
                      <CurrencyInput
                        id="nuevo-precio-compra"
                        value={nuevoPrecioCompra}
                        onChange={(v) => setNuevoPrecioCompra(v ?? 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nuevo-precio-venta">Precio venta *</Label>
                      <CurrencyInput
                        id="nuevo-precio-venta"
                        value={nuevoPrecioVenta}
                        onChange={(v) => setNuevoPrecioVenta(v ?? 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nueva-cantidad">Cantidad</Label>
                    <Input
                      id="nueva-cantidad"
                      type="number"
                      min={1}
                      value={nuevaCantidad}
                      onChange={(e) => setNuevaCantidad(parseInt(e.target.value, 10) || 1)}
                      className="font-mono tabular-nums"
                    />
                  </div>
                  {proveedorNombre && (
                    <p className="text-sm text-muted-foreground">
                      Se asignará a {proveedorNombre}, el proveedor de esta orden.
                    </p>
                  )}
                  <Button
                    onClick={() => void crearYAgregarProducto()}
                    loading={guardandoNuevo}
                    loadingText="Guardando…"
                  >
                    Crear y agregar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />
        <PanelBody className="space-y-4">
          <SelectorProductoProveedor
            key={`${proveedorId}-${versionProductos}`}
            proveedorId={proveedorId}
            proveedorNombre={proveedorNombre}
            productoSeleccionadoId={productoElegido?.id ?? ""}
            onElegir={elegirProducto}
          />

          {productoElegido && (
            <Reveal className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <div className="min-w-[180px] flex-1 space-y-1.5">
                <span className={claseLabel}>Elegido</span>
                <p className="truncate text-sm font-medium">{productoElegido.nombre}</p>
                <p className="font-mono text-xs text-muted-foreground">{productoElegido.sku}</p>
              </div>
              <div className="w-24 space-y-1.5">
                <Label htmlFor="compra-cantidad" className={claseLabel}>
                  Cantidad
                </Label>
                <Input
                  id="compra-cantidad"
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
                  className="h-10 font-mono tabular-nums"
                />
              </div>
              <div className="w-36 space-y-1.5">
                <Label htmlFor="compra-precio" className={claseLabel}>
                  P. unitario
                </Label>
                <CurrencyInput
                  id="compra-precio"
                  value={precioUnitario}
                  onChange={(v) => setPrecioUnitario(v ?? 0)}
                  placeholder="0"
                />
              </div>
              <Button variant="outline" onClick={agregarItem} className="h-10 w-full sm:w-auto">
                Agregar a la orden
              </Button>
            </Reveal>
          )}
        </PanelBody>
      </Panel>

      {items.length > 0 && (
        <Panel>
          <PanelHeader title="Items" descripcion={`${items.length} productos en la orden`} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">P. unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-[1%]">
                  <span className="sr-only">Quitar</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i, indice) => (
                <Reveal as={TableRow} key={i.productoId} indice={indice}>
                  <TableCell>
                    <p className="font-medium">{i.productoNombre}</p>
                    <p className="font-mono text-xs text-muted-foreground">{i.productoSku}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{i.cantidad}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatARS(i.precioUnitario)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {formatARS(i.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => quitarItem(i.productoId)}
                      aria-label={`Quitar ${i.productoNombre}`}
                    >
                      Quitar
                    </Button>
                  </TableCell>
                </Reveal>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div className="w-full space-y-1.5 sm:max-w-md">
              <Label htmlFor="compra-notas" className={claseLabel}>
                Notas
              </Label>
              <Input
                id="compra-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Opcional"
                className="h-10"
              />
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-sm text-muted-foreground">
                Total{" "}
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {formatARS(total)}
                </span>
              </p>
              <Button
                onClick={() => void crearOrden()}
                loading={isLoading}
                loadingText="Creando…"
              >
                Crear orden
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
