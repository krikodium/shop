"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen, type ItemResumen } from "@/components/ui/resumen";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useAsyncAction } from "@/hooks/use-async-action";
import { notificar } from "@/lib/notificar";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { formatARS } from "@/lib/formatCurrency";

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

  const { run: anular, loading: anulando } = useAsyncAction(async () => {
    try {
      const res = await fetch(`/api/ventas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "anular" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al anular");
      notificar.ok("Venta anulada correctamente");
      setVenta((prev) => (prev ? { ...prev, anulada: true } : prev));
      setDialogAnularOpen(false);
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : "Error al anular la venta");
    }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="h-3 w-28 animate-skeleton-shimmer rounded" />
            <div className="h-8 w-52 animate-skeleton-shimmer rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 animate-skeleton-shimmer rounded-md" />
            <div className="h-10 w-32 animate-skeleton-shimmer rounded-md" />
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card px-5 py-5">
              <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
              <div className="mt-3 h-8 w-36 animate-skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 animate-skeleton-shimmer rounded-lg" />
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="space-y-4">
        <EmptyState
          titulo="Venta no encontrada"
          descripcion="Puede haber sido eliminada o el enlace ya no es válido."
          accion={
            <Button asChild variant="outline">
              <Link href="/ventas">Volver a ventas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const clienteNombre = venta.cliente?.nombre ?? venta.clienteNombre ?? "Sin cliente";

  const pagoDividido =
    Boolean(venta.metodoPagoSecundario) &&
    venta.montoPago1Ars != null &&
    venta.montoPago2Ars != null;

  const resumenItems: ItemResumen[] = [
    {
      label: "Pago",
      valor: METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago,
      hint: pagoDividido
        ? `+ ${METODO_PAGO_LABEL[venta.metodoPagoSecundario ?? ""] ?? venta.metodoPagoSecundario} (dividido)`
        : undefined,
    },
    {
      label: "Ganancia",
      valor: formatARS(venta.gananciaBruta),
      hint: `Costo ${formatARS(venta.costoTotal)} · Margen ${venta.margenPorcentaje.toFixed(1)}%`,
    },
  ];
  if (venta.deudaConsignacion > 0) {
    resumenItems.push({
      label: "Consignación",
      valor: formatARS(venta.deudaConsignacion),
      hint: "Deuda a proveedores",
    });
  }
  // El total cierra el bloque: la jerarquía la da el orden, no un fondo lleno.
  resumenItems.push({
    label: "Total",
    valor: formatARS(venta.total),
    hint:
      venta.descuento > 0
        ? `Sub. ${formatARS(venta.subtotal)} · Desc. ${formatARS(venta.descuento)}`
        : undefined,
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/ventas">← Ventas</Link>
      </Button>

      <PageHeader
        overline={`Operación · Venta ${venta.numeroVenta}`}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {clienteNombre}
            {venta.anulada && <Badge variant="outline">Anulada</Badge>}
          </span>
        }
        description={new Date(venta.fecha).toLocaleString("es-AR")}
      >
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
                  Se devolverá el stock de los productos y se revertirán las estadísticas del cliente. Esta acción no
                  se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void anular();
                  }}
                  disabled={anulando}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {anulando && <Spinner className="text-white" />}
                  {anulando ? "Anulando…" : "Anular venta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button asChild>
          <Link href="/ventas/nueva">Nueva venta</Link>
        </Button>
      </PageHeader>

      <Resumen items={resumenItems} />

      {pagoDividido && (
        <Panel>
          <PanelHeader title="Detalle pago dividido" acciones={<Badge variant="outline">2 medios</Badge>} />
          <PanelBody className="space-y-4">
            {((venta.usdPago1 != null && venta.usdPago1 > 0) ||
              (venta.usdPago2 != null && venta.usdPago2 > 0)) && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Cotización usada:</span>{" "}
                {venta.cotizacionUsd != null
                  ? `1 USD = ${venta.cotizacionUsd.toLocaleString("es-AR", { maximumFractionDigits: 4 })} ARS`
                  : "—"}
              </p>
            )}
            <FigureGrid columnas={2}>
              <Figure
                label="Primer pago"
                valor={formatARS(venta.montoPago1Ars ?? 0)}
                hint={
                  <>
                    {METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago}
                    {venta.usdPago1 != null && venta.usdPago1 > 0 && (
                      <span className="block">{venta.usdPago1.toLocaleString("es-AR")} USD</span>
                    )}
                  </>
                }
              />
              <Figure
                label="Segundo pago"
                valor={formatARS(venta.montoPago2Ars ?? 0)}
                hint={
                  <>
                    {METODO_PAGO_LABEL[venta.metodoPagoSecundario ?? ""] ?? venta.metodoPagoSecundario}
                    {venta.usdPago2 != null && venta.usdPago2 > 0 && (
                      <span className="block">{venta.usdPago2.toLocaleString("es-AR")} USD</span>
                    )}
                  </>
                }
              />
            </FigureGrid>
          </PanelBody>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Items"
            acciones={<Badge variant="outline">{venta.items.reduce((s, i) => s + i.cantidad, 0)} unid.</Badge>}
          />
          {/* Móvil: lista apilada (evita scroll horizontal) */}
          <ul className="divide-y divide-border md:hidden">
            {venta.items.map((item, i) => (
              <li key={i} className="px-4 py-3">
                <div className="min-w-0 break-words font-medium leading-snug">{item.productoNombre}</div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">{item.productoSku}</div>
                {item.esConsignacion && (
                  <Badge variant="outline" className="mt-1.5">
                    Consig.
                  </Badge>
                )}
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    {item.cantidad} × {formatARS(item.precioUnitario)}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{formatARS(item.subtotal)}</span>
                </div>
              </li>
            ))}
          </ul>
          {/* md+: tabla */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
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
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-accent">
                    <td className="px-4 py-3 align-top md:px-6">
                      <span className="break-words font-medium">{item.productoNombre}</span>
                      <span className="text-xs text-muted-foreground"> ({item.productoSku})</span>
                      {item.esConsignacion && (
                        <Badge variant="outline" className="ml-2 align-middle">
                          Consig.
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center font-mono tabular-nums md:px-4">{item.cantidad}</td>
                    <td className="break-all px-2 py-3 text-right font-mono tabular-nums md:px-4">
                      {formatARS(item.precioUnitario)}
                    </td>
                    <td className="break-all px-4 py-3 text-right font-mono font-semibold tabular-nums md:px-6">
                      {formatARS(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="min-w-0">
          <GuardarDatosCliente
            ventaId={id}
            clienteActual={venta.cliente}
            clienteNombre={venta.clienteNombre}
            onGuardado={() => {
              fetch(`/api/ventas/${id}`)
                .then((res) => res.json())
                .then((v) =>
                  setVenta((prev) => (prev ? { ...prev, cliente: v.cliente, clienteNombre: v.clienteNombre } : prev))
                );
            }}
          />
        </div>
      </div>
    </div>
  );
}
