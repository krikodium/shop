"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
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
import { formatARS, formatUSD, parseCurrencyInput } from "@/lib/formatCurrency";

interface PreviewItem {
  ventaId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  comisionShop: number | null;
  montoProveedor: number;
}

interface PreviewData {
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  items: PreviewItem[];
  proveedorNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  todasRendidas?: boolean;
}

const claseLabel = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

interface RendicionPreviewProps {
  preview: PreviewData;
  onConfirm: () => void;
  /** Confirmación en curso: muestra el indicador en el botón. */
  isLoading: boolean;
  /** Otra acción en vuelo (p. ej. recalcular): deshabilita sin indicador propio. */
  ocupado?: boolean;
  monedaLiquidacion: "ARS" | "USD";
  onMonedaLiquidacionChange: (v: "ARS" | "USD") => void;
  cotizacionUsd: string;
  onCotizacionUsdChange: (v: string) => void;
}

export function RendicionPreview({
  preview,
  onConfirm,
  isLoading,
  ocupado = false,
  monedaLiquidacion,
  onMonedaLiquidacionChange,
  cotizacionUsd,
  onCotizacionUsdChange,
}: RendicionPreviewProps) {
  const cotNum = parseCurrencyInput(cotizacionUsd);
  const usdEquivalent =
    monedaLiquidacion === "USD" && cotNum > 0
      ? preview.totalARendir / cotNum
      : null;
  const usdBlocked =
    monedaLiquidacion === "USD" && (cotNum <= 0 || !String(cotizacionUsd).trim());

  return (
    <div className="space-y-6">
      {preview.todasRendidas && (
        <p className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
          Todas las ventas de este período ya fueron incluidas en rendiciones anteriores. No hay
          monto nuevo a rendir.
        </p>
      )}

      <Resumen
        items={[
          {
            label: "Total vendido",
            valor: formatARS(preview.totalVendido),
            hint: `Bruto facturado en ${preview.items.length} ventas`,
          },
          {
            label: "Comisión shop",
            valor: formatARS(preview.comisionShop),
            hint: "Retención acordada por gestión",
          },
          {
            label: "A rendir",
            valor: formatARS(preview.totalARendir),
            hint:
              usdEquivalent != null
                ? `Neto al proveedor · ≈ ${formatUSD(usdEquivalent)}`
                : "Neto al proveedor (ventas en ARS)",
          },
        ]}
      />

      {preview.items.length > 0 && !preview.todasRendidas && (
        <>
          <Panel>
            <PanelHeader
              title="Liquidación al proveedor"
              descripcion="Los montos de ventas están en pesos. Si el pago al proveedor es en dólares, indicá el tipo de cambio de este momento (no hay TC global en el sistema)."
            />
            <PanelBody>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full space-y-1.5 sm:w-56">
                  <Label htmlFor="moneda-rend" className={claseLabel}>
                    Moneda de liquidación
                  </Label>
                  <Select
                    value={monedaLiquidacion}
                    onValueChange={(v) => onMonedaLiquidacionChange(v as "ARS" | "USD")}
                  >
                    <SelectTrigger id="moneda-rend" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {monedaLiquidacion === "USD" && (
                  <div className="w-full space-y-1.5 sm:w-56">
                    <Label htmlFor="cotiz-rend" className={claseLabel}>
                      Cotización ARS por 1 USD *
                    </Label>
                    <Input
                      id="cotiz-rend"
                      inputMode="decimal"
                      placeholder="Ej. 1200"
                      value={cotizacionUsd}
                      onChange={(e) => onCotizacionUsdChange(e.target.value)}
                      className="h-10 font-mono tabular-nums"
                    />
                  </div>
                )}
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Detalle de ventas"
              descripcion="Productos vendidos pendientes de rendir"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">P. venta</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Para proveedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.items.map((item, i) => (
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

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-muted-foreground">
                Revisá los totales antes de confirmar: la rendición queda registrada para este
                período.
              </p>
              <Button
                onClick={onConfirm}
                loading={isLoading}
                loadingText="Confirmando…"
                disabled={ocupado || usdBlocked}
              >
                Confirmar rendición
              </Button>
            </div>
          </Panel>
        </>
      )}

      {preview.todasRendidas && preview.items.length === 0 && (
        <EmptyState
          icono={FileText}
          titulo="Sin ventas para rendir"
          descripcion="No se encontraron ventas para este período o todas ya fueron rendidas previamente."
        />
      )}
    </div>
  );
}
