"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CompraDetalleSkeleton } from "../ComprasSkeletons";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

interface ItemOrden {
  id: string;
  cantidad: number;
  cantidadRecibida: number;
  precioUnitario: number;
  subtotal: number;
  producto: { nombre: string; sku: string };
}

interface OrdenDetalle {
  id: string;
  numeroOrden: string;
  fecha: string;
  total: number;
  estado: string;
  fechaRecepcion: string | null;
  proveedor: { nombre: string };
  items: ItemOrden[];
}

function normalizeOrden(raw: OrdenDetalle): OrdenDetalle {
  return {
    ...raw,
    total: Number(raw.total ?? 0),
    items: (raw.items ?? []).map((item) => ({
      ...item,
      cantidad: Number(item.cantidad ?? 0),
      cantidadRecibida: Number(item.cantidadRecibida ?? 0),
      precioUnitario: Number(item.precioUnitario ?? 0),
      subtotal: Number(item.subtotal ?? 0),
    })),
  };
}

function getCantidadesIniciales(items: ItemOrden[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = Math.max(0, item.cantidad - item.cantidadRecibida);
    return acc;
  }, {});
}

export default function OrdenDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [cantidadesRecibir, setCantidadesRecibir] = useState<Record<string, number>>({});
  const [recibiendo, setRecibiendo] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/compras/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrada");
        return res.json();
      })
      .then((o) => {
        const normalized = normalizeOrden(o);
        setOrden(normalized);
        setCantidadesRecibir(getCantidadesIniciales(normalized.items));
      })
      .catch(() => setOrden(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const recibir = async () => {
    if (!orden) return;
    const recibirData = Object.entries(cantidadesRecibir)
      .filter(([, cant]) => cant > 0)
      .map(([itemId, cantidadRecibida]) => ({ itemId, cantidadRecibida }));

    if (recibirData.length === 0) return;
    setRecibiendo(true);
    try {
      const res = await fetch(`/api/compras/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recibir: recibirData }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Error");
      }
      const updated = await res.json();
      const normalized = normalizeOrden(updated);
      setOrden(normalized);
      setCantidadesRecibir(getCantidadesIniciales(normalized.items));
      toast.success("Recepción registrada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setRecibiendo(false);
    }
  };

  const cancelar = async () => {
    if (!orden) return;
    try {
      const res = await fetch(`/api/compras/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CANCELADO" }),
      });
      if (!res.ok) throw new Error("Error");
      const updated = await res.json();
      const normalized = normalizeOrden(updated);
      setOrden(normalized);
      setCantidadesRecibir(getCantidadesIniciales(normalized.items));
      toast.success("Orden cancelada");
    } catch {
      toast.error("Error al cancelar la orden");
    }
  };

  const puedeRecibir = orden?.estado !== "RECIBIDO" && orden?.estado !== "CANCELADO";
  const hayAlgoQueRecibir = Object.values(cantidadesRecibir).some((c) => c > 0);

  const resumen = useMemo(() => {
    const items = orden?.items ?? [];
    const totalPedido = items.reduce((acc, item) => acc + item.cantidad, 0);
    const totalRecibido = items.reduce((acc, item) => acc + item.cantidadRecibida, 0);
    const pendientes = Math.max(0, totalPedido - totalRecibido);
    const avance = totalPedido > 0 ? Math.round((totalRecibido / totalPedido) * 100) : 0;
    return { totalPedido, totalRecibido, pendientes, avance };
  }, [orden]);

  const estadoVariant = (estado: string) =>
    estado === "CANCELADO" ? "destructive" : estado === "PENDIENTE" ? "secondary" : "outline";

  if (loading) return <CompraDetalleSkeleton />;
  if (!orden) {
    return (
      <div className="space-y-4">
        <p>Orden no encontrada.</p>
        <Link href="/compras">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/compras">
          <Button variant="ghost">← Órdenes</Button>
        </Link>
        <div className="flex gap-2">
          {puedeRecibir && (
            <>
              <Button
                onClick={recibir}
                disabled={!hayAlgoQueRecibir || recibiendo}
              >
                {recibiendo ? "..." : "Registrar recepción"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Cancelar orden</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
                    <AlertDialogDescription>
                      La orden {orden.numeroOrden} se marcará como cancelada. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={cancelar}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card/70 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{orden.numeroOrden}</h1>
              <Badge variant={estadoVariant(orden.estado)}>{orden.estado}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {orden.proveedor?.nombre} · {new Date(orden.fecha).toLocaleDateString("es-AR")}
            </p>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3 text-left lg:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total orden
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {currencyFormatter.format(orden.total)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{orden.items.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Unidades pedidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{resumen.totalPedido}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recibidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{resumen.totalRecibido}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{resumen.avance}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {resumen.pendientes} unidades pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recepción de mercadería</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cargá solo las unidades que ingresan en esta operación.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Pedido</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">P. unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  {puedeRecibir && (
                    <TableHead className="text-right">Recibir ahora</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orden.items.map((item) => {
                  const pendiente = item.cantidad - item.cantidadRecibida;
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{item.producto?.nombre}</div>
                        <div className="text-xs text-muted-foreground">{item.producto?.sku}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.cantidad}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.cantidadRecibida}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={pendiente > 0 ? "text-amber-700" : "text-muted-foreground"}>
                          {Math.max(0, pendiente)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currencyFormatter.format(item.precioUnitario)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currencyFormatter.format(item.subtotal)}
                      </TableCell>
                      {puedeRecibir && (
                        <TableCell className="text-right">
                          {pendiente > 0 ? (
                            <Input
                              type="number"
                              min={0}
                              max={pendiente}
                              className="ml-auto min-h-10 w-24 text-right tabular-nums"
                              value={cantidadesRecibir[item.id] ?? 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10) || 0;
                                setCantidadesRecibir((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(Math.max(0, value), pendiente),
                                }));
                              }}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-6 flex flex-col gap-1 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Total:{" "}
              <span className="font-semibold text-foreground">
                {currencyFormatter.format(orden.total)}
              </span>
            </p>
            {orden.estado === "RECIBIDO" && orden.fechaRecepcion && (
              <p>
                Recibida el {new Date(orden.fechaRecepcion).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
