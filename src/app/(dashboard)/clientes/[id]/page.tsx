"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClienteForm, clienteToFormValues } from "@/components/forms/ClienteForm";
import { formatARS } from "@/lib/formatCurrency";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";
import type { ClienteFormValues } from "@/lib/validaciones/clienteSchema";
import type { Cliente, Venta } from "@prisma/client";

interface ClienteConVentas extends Cliente {
  ventas: Venta[];
}

const formatFecha = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatFechaHora = (d: string | Date) =>
  new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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

  // El error se tira con su mensaje y el formulario lo avisa (notificar.error).
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
    notificar.ok("Cliente actualizado");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 border-b pb-5">
          <div className="h-3 w-28 animate-skeleton-shimmer rounded" />
          <div className="h-8 w-52 animate-skeleton-shimmer rounded-md" />
        </div>
        <div className="h-20 animate-skeleton-shimmer rounded-xl" />
        <div className="h-64 animate-skeleton-shimmer rounded-lg" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <EmptyState
        titulo="Cliente no encontrado"
        descripcion="Puede haber sido eliminado o el enlace ya no es válido."
        accion={
          <Button asChild variant="outline">
            <Link href="/clientes">Volver a clientes</Link>
          </Button>
        }
      />
    );
  }

  const contacto = [cliente.telefono, cliente.email].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/clientes">← Clientes</Link>
      </Button>

      <PageHeader
        overline="Operación · Cliente"
        title={cliente.nombre}
        description={contacto || undefined}
      />

      {/* Cifras que ya vienen calculadas en el registro del cliente: acá solo se muestran. */}
      <Resumen
        items={[
          { label: "Total de compras", valor: formatARS(Number(cliente.totalCompras)) },
          { label: "Compras", valor: cliente.cantidadCompras },
          { label: "Ticket promedio", valor: formatARS(Number(cliente.ticketPromedio)) },
          {
            label: "Última compra",
            valor: cliente.ultimaCompra ? formatFecha(cliente.ultimaCompra) : "—",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <ClienteForm
            defaultValues={clienteToFormValues(cliente)}
            onSubmit={handleSubmit}
            variant="full"
          />
        </div>

        <Panel className="min-w-0 lg:col-span-3">
          <PanelHeader
            title="Historial de compras"
            descripcion={cliente.ventas.length > 0 ? "Las 20 más recientes" : undefined}
          />
          {cliente.ventas.length === 0 ? (
            <PanelBody>
              <EmptyState
                icono={Receipt}
                titulo="Todavía no compró nada"
                descripcion="Las ventas que se registren a su nombre van a aparecer acá."
              />
            </PanelBody>
          ) : (
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
                  <TableRow key={v.id} className={v.anulada ? "text-muted-foreground" : undefined}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/ventas/${v.id}`}
                          className={cn(
                            "rounded-sm font-mono font-medium tabular-nums underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            v.anulada && "line-through"
                          )}
                        >
                          {v.numeroVenta}
                        </Link>
                        {v.anulada && <Badge variant="outline">Anulada</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{formatFechaHora(v.fecha)}</TableCell>
                    <TableCell
                      className={cn("text-right font-mono tabular-nums", v.anulada && "line-through")}
                    >
                      {formatARS(Number(v.total))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
