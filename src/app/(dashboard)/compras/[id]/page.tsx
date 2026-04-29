"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export default function OrdenDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [cantidadesRecibir, setCantidadesRecibir] = useState<Record<string, number>>({});
  const [recibiendo, setRecibiendo] = useState(false);

  useEffect(() => {
    fetch(`/api/compras/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrada");
        return res.json();
      })
      .then((o) => {
        setOrden({ ...o, total: Number(o.total ?? 0) });
        const inicial: Record<string, number> = {};
        (o.items || []).forEach((i: ItemOrden) => {
          inicial[i.id] = Math.max(0, i.cantidad - i.cantidadRecibida);
        });
        setCantidadesRecibir(inicial);
      })
      .catch(() => setOrden(null))
      .finally(() => setLoading(false));
  }, [id]);

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
      setOrden({ ...updated, total: Number(updated.total ?? 0) });
      const nuevoInicial: Record<string, number> = {};
      (updated.items || []).forEach((i: ItemOrden) => {
        const pendiente = i.cantidad - i.cantidadRecibida;
        nuevoInicial[i.id] = Math.max(0, pendiente);
      });
      setCantidadesRecibir(nuevoInicial);
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
      setOrden({ ...updated, total: Number(updated.total ?? 0) });
      toast.success("Orden cancelada");
    } catch {
      toast.error("Error al cancelar la orden");
    }
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
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

  const puedeRecibir = orden.estado !== "RECIBIDO" && orden.estado !== "CANCELADO";
  const hayAlgoQueRecibir = Object.values(cantidadesRecibir).some((c) => c > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
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

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{orden.numeroOrden}</h1>
        <p className="text-muted-foreground">
          {orden.proveedor?.nombre} •{" "}
          {new Date(orden.fecha).toLocaleDateString()}
        </p>
        <Badge className="mt-2">{orden.estado}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-4 text-left font-medium">Producto</th>
                  <th className="px-4 py-4 text-right font-medium">Pedido</th>
                  <th className="px-4 py-4 text-right font-medium">Recibido</th>
                  <th className="px-4 py-4 text-right font-medium">P. unit.</th>
                  <th className="px-4 py-4 text-right font-medium">Subtotal</th>
                  {puedeRecibir && (
                    <th className="px-4 py-4 text-right font-medium">Recibir ahora</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {orden.items.map((item) => {
                  const pendiente = item.cantidad - item.cantidadRecibida;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-4">
                        {item.producto?.nombre} ({item.producto?.sku})
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums">{item.cantidad}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        {item.cantidadRecibida}
                        {pendiente > 0 && (
                          <span className="ml-1 text-amber-600">
                            (pend: {pendiente})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        ${Number(item.precioUnitario).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        ${Number(item.subtotal).toFixed(2)}
                      </td>
                    {puedeRecibir && (
                      <td className="px-4 py-4">
                        {pendiente > 0 ? (
                          <Input
                            type="number"
                            min={0}
                            max={pendiente}
                            className="w-24 min-h-10 text-right tabular-nums"
                            value={cantidadesRecibir[item.id] ?? 0}
                            onChange={(e) =>
                              setCantidadesRecibir((prev) => ({
                                ...prev,
                                [item.id]: parseInt(e.target.value, 10) || 0,
                              }))
                            }
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                      </td>
                    )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 space-y-1 border-t pt-6">
            <p className="text-lg font-bold">Total: ${orden.total.toFixed(2)}</p>
            {orden.estado === "RECIBIDO" && orden.fechaRecepcion && (
              <p className="text-sm text-muted-foreground">
                Recibida el {new Date(orden.fechaRecepcion).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
