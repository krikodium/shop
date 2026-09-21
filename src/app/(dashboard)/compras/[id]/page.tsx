"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { formatARS } from "@/lib/formatCurrency";
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

/** El estado se lee por texto; todos los badges son outline. */
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  RECIBIDO: "Recibido",
  CANCELADO: "Cancelado",
};

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
  const [dialogCancelarOpen, setDialogCancelarOpen] = useState(false);

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

  const { run: recibir, loading: recibiendo } = useAsyncAction(async () => {
    if (!orden) return;
    const recibirData = Object.entries(cantidadesRecibir)
      .filter(([, cant]) => cant > 0)
      .map(([itemId, cantidadRecibida]) => ({ itemId, cantidadRecibida }));

    if (recibirData.length === 0) return;
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
      notificar.ok("Recepción registrada");
    } catch (err) {
      notificar.error(err instanceof Error ? err.message : "Error");
    }
  });

  const { run: cancelar, loading: cancelando } = useAsyncAction(async () => {
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
      notificar.ok("Orden cancelada");
      setDialogCancelarOpen(false);
    } catch {
      notificar.error("Error al cancelar la orden");
    }
  });

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

  if (loading) return <CompraDetalleSkeleton />;
  if (!orden) {
    return (
      <EmptyState
        titulo="Orden no encontrada"
        descripcion="Puede haber sido eliminada o el enlace ya no es válido."
        accion={
          <Button asChild variant="outline">
            <Link href="/compras">Volver a compras</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/compras">← Compras</Link>
      </Button>

      <PageHeader
        overline={`Mercadería · Orden ${orden.numeroOrden}`}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {orden.proveedor?.nombre || orden.numeroOrden}
            <Badge variant="outline">{ESTADO_LABEL[orden.estado] ?? orden.estado}</Badge>
          </span>
        }
        description={`Emitida el ${new Date(orden.fecha).toLocaleDateString("es-AR")}`}
      >
        {puedeRecibir && (
          <>
            <AlertDialog open={dialogCancelarOpen} onOpenChange={setDialogCancelarOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Cancelar orden</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La orden {orden.numeroOrden} se marcará como cancelada. Esta acción no se puede
                    deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void cancelar();
                    }}
                    disabled={cancelando}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {cancelando && <Spinner className="text-white" />}
                    {cancelando ? "Cancelando…" : "Sí, cancelar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={() => void recibir()}
              disabled={!hayAlgoQueRecibir}
              loading={recibiendo}
              loadingText="Registrando…"
            >
              Registrar recepción
            </Button>
          </>
        )}
      </PageHeader>

      <Resumen
        items={[
          {
            label: "Total orden",
            valor: formatARS(orden.total),
            hint: `${orden.items.length} items`,
          },
          { label: "Unidades pedidas", valor: resumen.totalPedido },
          { label: "Recibidas", valor: resumen.totalRecibido },
          {
            label: "Avance",
            valor: `${resumen.avance}%`,
            hint: (
              <span className="block space-y-1.5">
                <Progress
                  value={resumen.avance}
                  aria-label="Avance de recepción"
                  className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-muted-foreground/60"
                />
                <span className="block">{resumen.pendientes} unidades pendientes</span>
              </span>
            ),
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Recepción de mercadería"
          descripcion="Cargá solo las unidades que ingresan en esta operación."
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead className="text-right">P. unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              {puedeRecibir && <TableHead className="text-right">Recibir ahora</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orden.items.map((item) => {
              const pendiente = item.cantidad - item.cantidadRecibida;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.producto?.nombre}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.producto?.sku}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{item.cantidad}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {item.cantidadRecibida}
                  </TableCell>
                  <TableCell
                    className={
                      pendiente > 0
                        ? "text-right font-mono tabular-nums text-num-warning"
                        : "text-right font-mono tabular-nums text-muted-foreground"
                    }
                  >
                    {Math.max(0, pendiente)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatARS(item.precioUnitario)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatARS(item.subtotal)}
                  </TableCell>
                  {puedeRecibir && (
                    <TableCell className="text-right">
                      {pendiente > 0 ? (
                        <Input
                          type="number"
                          min={0}
                          max={pendiente}
                          aria-label={`Unidades a recibir de ${item.producto?.nombre ?? "este producto"}`}
                          className="ml-auto h-9 w-24 text-right font-mono tabular-nums"
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
        <div className="flex flex-col gap-1 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            Total{" "}
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {formatARS(orden.total)}
            </span>
          </p>
          {orden.estado === "RECIBIDO" && orden.fechaRecepcion && (
            <p className="font-mono text-xs tabular-nums">
              Recibida el {new Date(orden.fechaRecepcion).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
