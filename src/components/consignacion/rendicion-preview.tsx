"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
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

interface RendicionPreviewProps {
  preview: PreviewData;
  onConfirm: () => void;
  isLoading: boolean;
  monedaLiquidacion: "ARS" | "USD";
  onMonedaLiquidacionChange: (v: "ARS" | "USD") => void;
  cotizacionUsd: string;
  onCotizacionUsdChange: (v: string) => void;
}

export function RendicionPreview({
  preview,
  onConfirm,
  isLoading,
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {preview.todasRendidas && (
        <Card className="border-none bg-blue-500/10 text-blue-700 dark:text-blue-400">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">
              Todas las ventas de este período ya fueron incluidas en rendiciones anteriores. No hay monto nuevo a rendir.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-md bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Total Vendido
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tabular-nums">{formatARS(preview.totalVendido)}</p>
            <p className="text-[9px] text-muted-foreground mt-1">
              Bruto facturado en {preview.items.length} ventas
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Comisión Shop
            </span>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tabular-nums text-primary">{formatARS(preview.comisionShop)}</p>
            <p className="text-[9px] text-muted-foreground mt-1">Retención acordada por gestión</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-primary to-emerald-600 text-white overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
              A Rendir
            </span>
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tabular-nums">{formatARS(preview.totalARendir)}</p>
            <p className="text-[9px] text-primary-foreground/70 mt-1">Neto al proveedor (ventas en ARS)</p>
            {usdEquivalent != null && (
              <p className="text-sm font-bold tabular-nums mt-2 border-t border-white/20 pt-2">
                ≈ {formatUSD(usdEquivalent)} USD
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {preview.items.length > 0 && !preview.todasRendidas && (
        <>
          <Card className="border-none shadow-md bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Liquidación al proveedor</CardTitle>
              <CardDescription>
                Los montos de ventas están en pesos. Si el pago al proveedor es en dólares, indicá el tipo de cambio de este momento (no hay TC global en el sistema).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Moneda de liquidación</Label>
                <Select
                  value={monedaLiquidacion}
                  onValueChange={(v) => onMonedaLiquidacionChange(v as "ARS" | "USD")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {monedaLiquidacion === "USD" && (
                <div className="space-y-2">
                  <Label htmlFor="cotiz-rend" className="text-xs font-semibold">
                    Cotización ARS por 1 USD *
                  </Label>
                  <Input
                    id="cotiz-rend"
                    inputMode="decimal"
                    placeholder="Ej. 1200"
                    value={cotizacionUsd}
                    onChange={(e) => onCotizacionUsdChange(e.target.value)}
                    className="font-semibold tabular-nums"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Detalle de Ventas</CardTitle>
                </div>
                <CardDescription>Lista de productos vendidos pendientes de rendir</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-black uppercase pl-6 h-10">Producto</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center h-10">Cant.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right h-10">P. Venta</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right h-10">Subtotal</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right pr-6 h-10">
                        Para Proveedor
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.items.map((item, i) => (
                      <TableRow key={i} className="group hover:bg-muted/20 border-border/50">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{item.productoNombre}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                              {item.productoSku}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm text-muted-foreground/80">
                          {item.cantidad}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">{formatARS(item.precioVenta)}</TableCell>
                        <TableCell className="text-right font-bold text-sm tabular-nums">
                          {formatARS(item.totalVenta)}
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4">
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/5 text-emerald-600 border-emerald-500/10 font-black tabular-nums"
                          >
                            {formatARS(item.montoProveedor)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-6 border-t bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-xs text-muted-foreground font-medium">
                    He revisado los totales y confirmo que son correctos para este período.
                  </p>
                </div>
                <Button
                  onClick={onConfirm}
                  disabled={isLoading || usdBlocked}
                  className="font-black px-10 shadow-lg bg-emerald-600 hover:bg-emerald-700 h-10"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isLoading ? "PROCESANDO..." : "CONFIRMAR RENDICIÓN"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {preview.todasRendidas && preview.items.length === 0 && (
        <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border/60">
          <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
            No se encontraron ventas para este período o todas ya fueron rendidas previamente.
          </p>
        </div>
      )}
    </div>
  );
}
