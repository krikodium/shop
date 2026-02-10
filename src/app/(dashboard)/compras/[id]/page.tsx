"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setRecibiendo(false);
    }
  };

  const cancelar = async () => {
    if (!orden || !confirm("¿Cancelar esta orden?")) return;
    try {
      const res = await fetch(`/api/compras/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CANCELADO" }),
      });
      if (!res.ok) throw new Error("Error");
      const updated = await res.json();
      setOrden({ ...updated, total: Number(updated.total ?? 0) });
    } catch {
      alert("Error al cancelar");
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
    <div className="space-y-6">
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
              <Button variant="outline" onClick={cancelar}>
                Cancelar orden
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
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
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Producto</th>
                <th className="py-2 text-right">Pedido</th>
                <th className="py-2 text-right">Recibido</th>
                <th className="py-2 text-right">P. unit.</th>
                <th className="py-2 text-right">Subtotal</th>
                {puedeRecibir && (
                  <th className="py-2 text-right">Recibir ahora</th>
                )}
              </tr>
            </thead>
            <tbody>
              {orden.items.map((item) => {
                const pendiente = item.cantidad - item.cantidadRecibida;
                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      {item.producto?.nombre} ({item.producto?.sku})
                    </td>
                    <td className="py-2 text-right">{item.cantidad}</td>
                    <td className="py-2 text-right">
                      {item.cantidadRecibida}
                      {pendiente > 0 && (
                        <span className="ml-1 text-amber-600">
                          (pend: {pendiente})
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      ${Number(item.precioUnitario).toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      ${Number(item.subtotal).toFixed(2)}
                    </td>
                    {puedeRecibir && pendiente > 0 && (
                      <td className="py-2">
                        <Input
                          type="number"
                          min={0}
                          max={pendiente}
                          className="w-20 text-right"
                          value={cantidadesRecibir[item.id] ?? 0}
                          onChange={(e) =>
                            setCantidadesRecibir((prev) => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 font-bold">Total: ${orden.total.toFixed(2)}</p>
          {orden.estado === "RECIBIDO" && orden.fechaRecepcion && (
            <p className="mt-2 text-sm text-muted-foreground">
              Recibida el {new Date(orden.fechaRecepcion).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
