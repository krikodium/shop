"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RendicionPDFDownload } from "@/components/pdf/RendicionPDFDownload";
import { METODOS_PAGO } from "@/lib/constants";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

interface DetalleItem {
  ventaId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  comisionShop: number | null;
  montoProveedor: number;
}

interface RendicionContexto {
  deudaPendientePosterior: number;
  totalVendidoBrutoPosterior: number;
  otrasRendicionesMismoMesGeneracion: Array<{
    id: string;
    numeroRendicion: string;
    fechaDesde: string;
    fechaHasta: string;
    fechaRendicion: string;
    totalARendir: number;
  }>;
}

/** El estado se distingue por texto, no por color. */
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADO: "Pagada",
};

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR");

interface RendicionDetalle {
  id: string;
  proveedorId: string;
  numeroRendicion: string;
  fechaRendicion: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  monedaLiquidacion: "ARS" | "USD";
  cotizacionUsd: number | null;
  totalARendirUsd: number | null;
  estado: string;
  metodoPago: string | null;
  fechaPago: string | null;
  detalleItems: DetalleItem[];
  proveedor: { nombre: string };
  contexto: RendicionContexto | null;
}

export default function RendicionDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [rendicion, setRendicion] = useState<RendicionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [metodoPago, setMetodoPago] = useState<string>("");

  useEffect(() => {
    fetch(`/api/consignacion/rendiciones/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrada");
        return res.json();
      })
      .then((r) => {
        const ctx = r.contexto as RendicionContexto | undefined;
        setRendicion({
          ...r,
          proveedorId: String(r.proveedorId ?? ""),
          totalVendido: Number(r.totalVendido ?? 0),
          comisionShop: Number(r.comisionShop ?? 0),
          totalARendir: Number(r.totalARendir ?? 0),
          monedaLiquidacion: r.monedaLiquidacion === "USD" ? "USD" : "ARS",
          cotizacionUsd: r.cotizacionUsd != null ? Number(r.cotizacionUsd) : null,
          totalARendirUsd: r.totalARendirUsd != null ? Number(r.totalARendirUsd) : null,
          detalleItems: Array.isArray(r.detalleItems) ? r.detalleItems : [],
          contexto: ctx ?? null,
        });
        setMetodoPago(r.metodoPago ?? "EFECTIVO");
      })
      .catch(() => setRendicion(null))
      .finally(() => setLoading(false));
  }, [id]);

  const { run: marcarComoPagada, loading: marcandoPago } = useAsyncAction(async () => {
    if (!rendicion) return;
    try {
      const res = await fetch(`/api/consignacion/rendiciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "PAGADO",
          metodoPago,
          fechaPago: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Error");
      const updated = await res.json();
      setRendicion((prev) => {
        if (!prev) return null;
        const u = updated as Record<string, unknown>;
        return {
          ...prev,
          ...u,
          proveedorId: String(u.proveedorId ?? prev.proveedorId),
          totalVendido: Number(u.totalVendido ?? 0),
          comisionShop: Number(u.comisionShop ?? 0),
          totalARendir: Number(u.totalARendir ?? 0),
          monedaLiquidacion: u.monedaLiquidacion === "USD" ? "USD" : "ARS",
          cotizacionUsd: u.cotizacionUsd != null ? Number(u.cotizacionUsd) : null,
          totalARendirUsd: u.totalARendirUsd != null ? Number(u.totalARendirUsd) : null,
          detalleItems: Array.isArray(u.detalleItems) ? u.detalleItems : prev.detalleItems,
          proveedor: (u.proveedor as RendicionDetalle["proveedor"]) ?? prev.proveedor,
          contexto: prev.contexto,
        };
      });
      notificar.ok("Pago de la rendición confirmado");
    } catch {
      notificar.error("No se pudo confirmar el pago de la rendición");
    }
  });

  const imprimir = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="h-3 w-28 animate-skeleton-shimmer rounded" />
            <div className="h-8 w-52 animate-skeleton-shimmer rounded-md" />
          </div>
          <div className="h-10 w-36 animate-skeleton-shimmer rounded-md" />
        </div>
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <div className="h-64 animate-skeleton-shimmer rounded-lg" />
      </div>
    );
  }

  if (!rendicion) {
    return (
      <EmptyState
        titulo="Rendición no encontrada"
        descripcion="La rendición que estás buscando no existe o fue eliminada."
        accion={
          <Button asChild variant="outline">
            <Link href="/consignacion/rendiciones">Volver al listado</Link>
          </Button>
        }
      />
    );
  }

  const items = rendicion.detalleItems as DetalleItem[];
  const liquidaEnUsd =
    rendicion.monedaLiquidacion === "USD" &&
    rendicion.totalARendirUsd != null &&
    rendicion.cotizacionUsd != null;

  return (
    <div className="space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground print:hidden"
      >
        <Link href="/consignacion/rendiciones">← Rendiciones</Link>
      </Button>

      <PageHeader
        overline={`Mercadería · Rendición ${rendicion.numeroRendicion}`}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {rendicion.proveedor?.nombre}
            <Badge variant="outline">{ESTADO_LABEL[rendicion.estado] ?? rendicion.estado}</Badge>
          </span>
        }
        description={
          <>
            Período {fecha(rendicion.fechaDesde)} – {fecha(rendicion.fechaHasta)} · generada el{" "}
            {new Date(rendicion.fechaRendicion).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </>
        }
        className="print:border-b-0"
      >
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {rendicion.estado === "PENDIENTE" && (
            <>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="h-9 w-[150px]" aria-label="Método de pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => void marcarComoPagada()}
                loading={marcandoPago}
                loadingText="Confirmando…"
              >
                Confirmar pago
              </Button>
            </>
          )}
          <RendicionPDFDownload
            numeroRendicion={rendicion.numeroRendicion}
            proveedorNombre={rendicion.proveedor?.nombre ?? ""}
            fechaDesde={rendicion.fechaDesde}
            fechaHasta={rendicion.fechaHasta}
            totalVendido={rendicion.totalVendido}
            comisionShop={rendicion.comisionShop}
            totalARendir={rendicion.totalARendir}
            monedaLiquidacion={rendicion.monedaLiquidacion}
            cotizacionUsd={rendicion.cotizacionUsd}
            totalARendirUsd={rendicion.totalARendirUsd}
            estado={rendicion.estado}
            items={items}
          />
          <Button variant="outline" onClick={imprimir}>
            Imprimir
          </Button>
        </div>
      </PageHeader>

      <Resumen
        items={[
          { label: "Total ventas bruto", valor: formatARS(rendicion.totalVendido) },
          { label: "Comisión retenida", valor: formatARS(rendicion.comisionShop) },
          {
            label: "Monto a liquidar",
            valor: formatARS(rendicion.totalARendir),
            hint: liquidaEnUsd ? (
              <>
                <span className="font-mono tabular-nums text-foreground">
                  {formatUSD(rendicion.totalARendirUsd as number)}
                </span>{" "}
                · Liquidación en USD · TC{" "}
                {(rendicion.cotizacionUsd as number).toLocaleString("es-AR", {
                  maximumFractionDigits: 4,
                })}{" "}
                ARS/USD
              </>
            ) : undefined,
          },
        ]}
      />

      {rendicion.estado === "PAGADO" && rendicion.fechaPago && (
        <p className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-medium">Pago confirmado</span>
            <span className="text-muted-foreground">
              {" "}
              · {METODOS_PAGO.find((m) => m.value === rendicion.metodoPago)?.label ??
                rendicion.metodoPago}
            </span>
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {new Date(rendicion.fechaPago).toLocaleString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            hs
          </span>
        </p>
      )}

      {rendicion.contexto && (
        <div className="divide-y divide-border rounded-lg border border-border text-sm print:hidden">
          <div className="space-y-1 px-4 py-3">
            <p className="font-medium">Esta rendición solo cierra el período indicado</p>
            <p className="leading-relaxed text-muted-foreground">
              Los totales corresponden únicamente a ventas con fecha entre{" "}
              <span className="font-mono text-foreground">
                {fecha(rendicion.fechaDesde)} y {fecha(rendicion.fechaHasta)}
              </span>
              . No suman ventas anteriores ya liquidadas en otra rendición ni ventas posteriores a
              esa fecha de cierre: esas van en la próxima rendición (otro comprobante).
            </p>
          </div>

          {rendicion.contexto.otrasRendicionesMismoMesGeneracion.length > 0 && (
            <div className="space-y-1.5 px-4 py-3">
              <p className="font-medium">Mismo mes, otras rendiciones a este proveedor</p>
              <p className="text-muted-foreground">
                En{" "}
                {new Date(rendicion.fechaRendicion).toLocaleDateString("es-AR", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                también generaste:
              </p>
              <ul className="space-y-1">
                {rendicion.contexto.otrasRendicionesMismoMesGeneracion.map((o) => (
                  <li key={o.id} className="text-muted-foreground">
                    <Link
                      href={`/consignacion/rendiciones/${o.id}`}
                      className="rounded-sm font-mono text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {o.numeroRendicion}
                    </Link>
                    {" · "}
                    <span className="font-mono tabular-nums">
                      {fecha(o.fechaDesde)} – {fecha(o.fechaHasta)}
                    </span>
                    {" · "}
                    <span className="font-mono tabular-nums text-foreground">
                      {formatARS(o.totalARendir)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rendicion.contexto.deudaPendientePosterior > 0 && (
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">Ventas nuevas después de este cierre</p>
                <p className="leading-relaxed text-muted-foreground">
                  Hay{" "}
                  <span className="font-mono font-semibold tabular-nums text-num-warning">
                    {formatARS(rendicion.contexto.deudaPendientePosterior)}
                  </span>{" "}
                  pendiente de rendir por ventas con fecha posterior al{" "}
                  {fecha(rendicion.fechaHasta)}. Eso no está en los totales de esta rendición: lo
                  liquidás cuando generes el próximo comprobante.
                </p>
                {rendicion.contexto.totalVendidoBrutoPosterior > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Bruto de esas ventas:{" "}
                    <span className="font-mono tabular-nums">
                      {formatARS(rendicion.contexto.totalVendidoBrutoPosterior)}
                    </span>
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link
                  href={`/consignacion/rendiciones/nueva?proveedorId=${encodeURIComponent(rendicion.proveedorId)}`}
                >
                  Ir a nueva rendición
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Detalle de ventas"
          acciones={<Badge variant="outline">{items.length} movimientos</Badge>}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">P. venta</TableHead>
              <TableHead className="text-right">Total bruto</TableHead>
              <TableHead className="text-right">Para proveedor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>
                  <p className="font-medium">{item.productoNombre}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.productoSku}</p>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {item.cantidad}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {formatARS(item.precioVenta)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatARS(item.totalVenta)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatARS(item.montoProveedor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
          Comprobante de liquidación interna: resumen de las ventas realizadas por cuenta y orden
          de terceros. Los montos expresados son finales y ya incluyen las comisiones
          correspondientes.
        </p>
      </Panel>
    </div>
  );
}
