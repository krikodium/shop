"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { GuardarDatosCliente } from "@/components/ventas/GuardarDatosCliente";
import { TicketVenta } from "@/components/ventas/TicketVenta";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { formatARS } from "@/lib/formatCurrency";
import {
  TrendingUp,
  CreditCard,
  Package,
  DollarSign,
} from "lucide-react";

interface VentaDetalle {
  id: string;
  numeroVenta: string;
  fecha: string;
  anulada?: boolean;
  subtotal: number;
  descuento: number;
  total: number;
  costoTotal: number;
  gananciaBruta: number;
  margenPorcentaje: number;
  deudaConsignacion: number;
  metodoPago: string;
  metodoPagoSecundario?: string | null;
  montoPago1Ars?: number | null;
  montoPago2Ars?: number | null;
  usdPago1?: number | null;
  usdPago2?: number | null;
  cotizacionUsd?: number | null;
  items: Array<{
    productoNombre: string;
    productoSku: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    esConsignacion: boolean;
  }>;
  cliente?: { nombre: string; email?: string | null; telefono?: string | null; dni?: string | null } | null;
  clienteNombre?: string | null;
}

export default function VentaDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [venta, setVenta] = useState<VentaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [anulando, setAnulando] = useState(false);
  const [dialogAnularOpen, setDialogAnularOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/ventas/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrada");
        return res.json();
      })
      .then((v) => {
        const num = (x: unknown) => (x != null && x !== "" ? Number(x) : null);
        setVenta({
          ...v,
          subtotal: Number(v.subtotal),
          descuento: Number(v.descuento),
          total: Number(v.total),
          costoTotal: Number(v.costoTotal),
          gananciaBruta: Number(v.gananciaBruta),
          margenPorcentaje: Number(v.margenPorcentaje),
          deudaConsignacion: Number(v.deudaConsignacion),
          metodoPagoSecundario: v.metodoPagoSecundario ?? null,
          montoPago1Ars: num(v.montoPago1Ars),
          montoPago2Ars: num(v.montoPago2Ars),
          usdPago1: num(v.usdPago1),
          usdPago2: num(v.usdPago2),
          cotizacionUsd: num(v.cotizacionUsd),
          items: (v.items || []).map((i: { precioUnitario: unknown; subtotal: unknown }) => ({
            ...i,
            precioUnitario: Number(i.precioUnitario),
            subtotal: Number(i.subtotal),
          })),
        });
      })
      .catch(() => setVenta(null))
      .finally(() => setLoading(false));
  }, [id]);

  const anularVenta = async () => {
    setAnulando(true);
    try {
      const res = await fetch(`/api/ventas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "anular" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al anular");
      toast.success("Venta anulada correctamente");
      setVenta((prev) => (prev ? { ...prev, anulada: true } : prev));
      setDialogAnularOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al anular la venta");
    } finally {
      setAnulando(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-24 animate-skeleton-shimmer rounded" />
            <div className="h-8 w-40 animate-skeleton-shimmer rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 animate-skeleton-shimmer rounded-lg" />
            <div className="h-10 w-32 animate-skeleton-shimmer rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 animate-skeleton-shimmer rounded-lg" />
          <div className="h-40 animate-skeleton-shimmer rounded-lg" />
        </div>
        <div className="h-64 animate-skeleton-shimmer rounded-lg" />
      </div>
    );
  }
  if (!venta) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">Venta no encontrada.</p>
          <Link href="/ventas" className="mt-4 inline-block">
            <Button variant="outline">Volver a ventas</Button>
          </Link>
        </div>
      </div>
    );
  }

  const clienteNombre = venta.cliente?.nombre ?? venta.clienteNombre ?? "Sin cliente";

  const pagoDividido =
    Boolean(venta.metodoPagoSecundario) &&
    venta.montoPago1Ars != null &&
    venta.montoPago2Ars != null;

  return (
    <div className="min-w-0 max-w-full space-y-6 animate-in fade-in duration-300">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/ventas">
            <Button variant="ghost" size="sm" className="mb-1 -ml-2 gap-1.5 text-muted-foreground">
              ← Ventas
            </Button>
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="min-w-0 break-words text-xl font-bold tracking-tight md:text-2xl">
              Venta {venta.numeroVenta}
            </h1>
            {venta.anulada && <Badge variant="destructive">Anulada</Badge>}
          </div>
          <p className="mt-1 break-words text-muted-foreground">
            {new Date(venta.fecha).toLocaleString("es-AR")} · {clienteNombre}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <TicketVenta
            numeroVenta={venta.numeroVenta}
            fecha={venta.fecha}
            clienteNombre={clienteNombre}
            metodoPago={venta.metodoPago}
            items={venta.items}
            subtotal={venta.subtotal}
            descuento={venta.descuento}
            total={venta.total}
            metodoPagoSecundario={venta.metodoPagoSecundario}
            montoPago1Ars={venta.montoPago1Ars}
            montoPago2Ars={venta.montoPago2Ars}
            usdPago1={venta.usdPago1}
            usdPago2={venta.usdPago2}
            cotizacionUsd={venta.cotizacionUsd}
          />
          {isAdmin && !venta.anulada && (
            <AlertDialog open={dialogAnularOpen} onOpenChange={setDialogAnularOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Anular venta</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Anular esta venta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se devolverá el stock de los productos y se revertirán las estadísticas del cliente. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => { e.preventDefault(); anularVenta(); }}
                    disabled={anulando}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {anulando ? "Anulando…" : "Anular venta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Link href="/ventas/nueva">
            <Button>Nueva venta</Button>
          </Link>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div
        className={`grid min-w-0 gap-4 ${venta.deudaConsignacion > 0 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}
      >
        <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <DollarSign className="h-5 w-5 text-primary/70" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{formatARS(venta.total)}</p>
            {venta.descuento > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sub. {formatARS(venta.subtotal)} · Desc. {formatARS(venta.descuento)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500/70" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
              {formatARS(venta.gananciaBruta)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Costo {formatARS(venta.costoTotal)} · Margen {venta.margenPorcentaje.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
            <CreditCard className="h-5 w-5 text-blue-500/70" />
          </CardHeader>
          <CardContent>
            <p className="break-words text-xl font-bold leading-tight sm:text-2xl">
              {METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago}
            </p>
            {pagoDividido && (
              <p className="mt-1 text-xs text-muted-foreground">
                + {METODO_PAGO_LABEL[venta.metodoPagoSecundario ?? ""] ?? venta.metodoPagoSecundario} (dividido)
              </p>
            )}
          </CardContent>
        </Card>

        {venta.deudaConsignacion > 0 && (
          <Card className="overflow-hidden border-l-4 border-l-amber-500 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Consignación</CardTitle>
              <Package className="h-5 w-5 text-amber-500/70" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {formatARS(venta.deudaConsignacion)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Deuda a proveedores</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Pago dividido (detalle, solo si aplica) ──────────────── */}
      {pagoDividido && (
        <Card className="min-w-0 overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex min-w-0 flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="min-w-0 break-words text-base">Detalle pago dividido</CardTitle>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">2 medios</Badge>
          </CardHeader>
          <CardContent>
            {((venta.usdPago1 != null && venta.usdPago1 > 0) ||
              (venta.usdPago2 != null && venta.usdPago2 > 0)) && (
              <p className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Cotización usada:</span>{" "}
                {venta.cotizacionUsd != null
                  ? `1 USD = ${venta.cotizacionUsd.toLocaleString("es-AR", { maximumFractionDigits: 4 })} ARS`
                  : "—"}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primer pago</p>
                <p className="mt-2 text-base font-semibold">{METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago}</p>
                <p className="mt-2 text-lg font-bold tabular-nums text-primary">
                  {formatARS(venta.montoPago1Ars ?? 0)}
                </p>
                {venta.usdPago1 != null && venta.usdPago1 > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Registrado como {venta.usdPago1.toLocaleString("es-AR")} USD
                  </p>
                )}
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segundo pago</p>
                <p className="mt-2 text-base font-semibold">
                  {METODO_PAGO_LABEL[venta.metodoPagoSecundario ?? ""] ?? venta.metodoPagoSecundario}
                </p>
                <p className="mt-2 text-lg font-bold tabular-nums text-primary">
                  {formatARS(venta.montoPago2Ars ?? 0)}
                </p>
                {venta.usdPago2 != null && venta.usdPago2 > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Registrado como {venta.usdPago2.toLocaleString("es-AR")} USD
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Items + Cliente (2 columnas) ─────────────────────────── */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden lg:col-span-2 shadow-sm">
          <CardHeader className="flex min-w-0 flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <Package className="h-4 w-4 shrink-0" />
              Items
            </CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {venta.items.reduce((s, i) => s + i.cantidad, 0)} unid.
            </Badge>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            {/* Móvil: lista apilada (evita scroll horizontal) */}
            <ul className="divide-y md:hidden">
              {venta.items.map((item, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="min-w-0 break-words font-medium leading-snug">{item.productoNombre}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.productoSku}</div>
                  {item.esConsignacion && (
                    <Badge variant="secondary" className="mt-1.5 text-xs">
                      Consig.
                    </Badge>
                  )}
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {item.cantidad} × {formatARS(item.precioUnitario)}
                    </span>
                    <span className="font-semibold tabular-nums">{formatARS(item.subtotal)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {/* md+: tabla */}
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-0 table-fixed text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-[40%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:px-6">
                      Producto
                    </th>
                    <th className="w-[10%] px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground md:px-4">
                      Cant.
                    </th>
                    <th className="w-[22%] px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground md:px-4">
                      P. unit.
                    </th>
                    <th className="w-[28%] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground md:px-6">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map((item, i) => (
                    <tr key={i} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 align-top md:px-6">
                        <span className="break-words font-medium">{item.productoNombre}</span>
                        <span className="text-muted-foreground text-xs"> ({item.productoSku})</span>
                        {item.esConsignacion && (
                          <Badge variant="secondary" className="ml-2 align-middle text-xs">
                            Consig.
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums md:px-4">{item.cantidad}</td>
                      <td className="break-all px-2 py-3 text-right tabular-nums md:px-4">
                        {formatARS(item.precioUnitario)}
                      </td>
                      <td className="break-all px-4 py-3 text-right tabular-nums font-semibold md:px-6">
                        {formatARS(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0">
          <GuardarDatosCliente
            ventaId={id}
            clienteActual={venta.cliente}
            clienteNombre={venta.clienteNombre}
            onGuardado={() => {
              fetch(`/api/ventas/${id}`)
                .then((res) => res.json())
                .then((v) =>
                  setVenta((prev) =>
                    prev ? { ...prev, cliente: v.cliente, clienteNombre: v.clienteNombre } : prev
                  )
                );
            }}
          />
        </div>
      </div>
    </div>
  );
}
