"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClienteForm, clienteToFormValues } from "@/components/forms/ClienteForm";
import type { ClienteFormValues } from "@/lib/validaciones/clienteSchema";
import type { Cliente, Venta } from "@prisma/client";

interface ClienteConVentas extends Cliente {
  ventas: Venta[];
}

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [cliente, setCliente] = useState<ClienteConVentas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clientes/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrado");
        return res.json();
      })
      .then(setCliente)
      .catch(() => setCliente(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: ClienteFormValues) => {
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al actualizar");
    }
    const updated = await res.json();
    setCliente((prev) => (prev ? { ...prev, ...updated, ventas: prev.ventas } : prev));
    router.refresh();
  };

  const formatMoney = (n: number | string) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(num);
  };

  const formatDate = (d: string | Date) => {
    return new Date(d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!cliente) {
    return (
      <div className="space-y-4">
        <p>Cliente no encontrado.</p>
        <Link href="/clientes">
          <Button variant="outline">Volver a clientes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/clientes">
          <Button variant="ghost">← Clientes</Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h1 className="mb-6 text-2xl font-bold">{cliente.nombre}</h1>
          <ClienteForm
            defaultValues={clienteToFormValues(cliente)}
            onSubmit={handleSubmit}
            variant="full"
          />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Resumen</h2>
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Compras</span>
              <span>{cliente.cantidadCompras}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total comprado</span>
              <span>{formatMoney(Number(cliente.totalCompras))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket promedio</span>
              <span>{formatMoney(Number(cliente.ticketPromedio))}</span>
            </div>
            {cliente.ultimaCompra && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última compra</span>
                <span>{formatDate(cliente.ultimaCompra)}</span>
              </div>
            )}
          </div>

          {cliente.ventas.length > 0 && (
            <>
              <h2 className="mb-4 mt-8 text-lg font-semibold">Últimas ventas</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cliente.ventas.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link
                          href={`/ventas/${v.id}`}
                          className="text-primary hover:underline"
                        >
                          {v.numeroVenta}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(v.fecha)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(v.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
