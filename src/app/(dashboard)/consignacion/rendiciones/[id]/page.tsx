"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Printer,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Receipt,
  AlertCircle,
  Info,
  CalendarRange,
} from "lucide-react";
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
  const [marcandoPago, setMarcandoPago] = useState(false);

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

  const marcarComoPagada = async () => {
    if (!rendicion) return;
    setMarcandoPago(true);
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
    } catch {
      setMarcandoPago(false);
    } finally {
      setMarcandoPago(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse space-y-4">
        <div className="h-10 w-10 bg-muted rounded-full" />
        <div className="h-4 w-40 bg-muted rounded" />
    </div>
  );
  
  if (!rendicion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black">Rendición no encontrada</h2>
            <p className="text-muted-foreground">La rendición que estás buscando no existe o fue eliminada.</p>
        </div>
        <Link href="/consignacion/rendiciones">
          <Button variant="outline" className="font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Button>
        </Link>
      </div>
    );
  }

  const items = rendicion.detalleItems as DetalleItem[];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link href="/consignacion/rendiciones" className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider">Historial de Rendiciones</span>
        </Link>
        <div className="flex flex-wrap gap-2">
          {rendicion.estado === "PENDIENTE" && (
            <div className="flex gap-2 items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border shadow-sm mr-2">
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="w-[140px] border-none bg-transparent h-8 text-xs font-semibold">
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
                size="sm"
                onClick={marcarComoPagada}
                disabled={marcandoPago}
                className="h-8 font-black text-[10px] uppercase tracking-wider px-3"
              >
                {marcandoPago ? "..." : "Confirmar Pago"}
              </Button>
            </div>
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
          <Button variant="outline" size="sm" onClick={imprimir} className="h-9 font-bold bg-white dark:bg-zinc-900 border-border/60">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {rendicion.contexto && (
        <div className="space-y-4 print:hidden">
          <Card className="border-blue-200/70 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-900/50">
            <CardContent className="p-5 space-y-3">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-bold text-blue-900 dark:text-blue-100">
                    Esta rendición solo cierra el período indicado
                  </p>
                  <p className="text-blue-900/85 dark:text-blue-100/90 leading-relaxed">
                    Los totales de arriba corresponden únicamente a ventas con fecha entre{" "}
                    <strong>
                      {new Date(rendicion.fechaDesde).toLocaleDateString("es-AR")} y{" "}
                      {new Date(rendicion.fechaHasta).toLocaleDateString("es-AR")}
                    </strong>
                    . No suman ventas anteriores ya liquidadas en otra rendición ni ventas posteriores a esa
                    fecha de cierre: esas van en la{" "}
                    <strong>próxima rendición</strong> (otro comprobante).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {rendicion.contexto.otrasRendicionesMismoMesGeneracion.length > 0 && (
            <Card className="border-violet-200/70 bg-violet-50/70 dark:bg-violet-950/25 dark:border-violet-900/50">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <CalendarRange className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-bold text-violet-900 dark:text-violet-100">
                      Mismo mes, otras rendiciones a este proveedor
                    </p>
                    <p className="text-violet-900/85 dark:text-violet-100/90">
                      En{" "}
                      {new Date(rendicion.fechaRendicion).toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      también generaste:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-violet-900/90 dark:text-violet-100/90">
                      {rendicion.contexto.otrasRendicionesMismoMesGeneracion.map((o) => (
                        <li key={o.id}>
                          <Link
                            href={`/consignacion/rendiciones/${o.id}`}
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            {o.numeroRendicion}
                          </Link>
                          {" · "}
                          {new Date(o.fechaDesde).toLocaleDateString("es-AR")} –{" "}
                          {new Date(o.fechaHasta).toLocaleDateString("es-AR")}
                          {" · "}
                          {formatARS(o.totalARendir)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {rendicion.contexto.deudaPendientePosterior > 0 && (
            <Card className="border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-900/50">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-amber-950 dark:text-amber-100">
                        Ventas nuevas después de este cierre (próxima rendición)
                      </p>
                      <p className="text-amber-950/90 dark:text-amber-100/90 leading-relaxed">
                        Hay{" "}
                        <strong>{formatARS(rendicion.contexto.deudaPendientePosterior)}</strong> pendiente
                        de rendir por ventas con fecha posterior al{" "}
                        {new Date(rendicion.fechaHasta).toLocaleDateString("es-AR")}. Eso{" "}
                        <strong>no está</strong> en los totales de esta rendición: lo liquidás cuando generes
                        el próximo comprobante.
                      </p>
                      {rendicion.contexto.totalVendidoBrutoPosterior > 0 && (
                        <p className="text-xs text-amber-900/75 dark:text-amber-200/70">
                          Bruto de esas ventas: {formatARS(rendicion.contexto.totalVendidoBrutoPosterior)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 font-bold" asChild>
                    <Link
                      href={`/consignacion/rendiciones/nueva?proveedorId=${encodeURIComponent(rendicion.proveedorId)}`}
                    >
                      Ir a nueva rendición
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Document Content */}
      <Card className="border-none shadow-xl bg-white dark:bg-zinc-950 overflow-hidden print:shadow-none print:border">
        {/* Document Header */}
        <div className="p-8 border-b bg-muted/20 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter">RENDICIÓN</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Nº {rendicion.numeroRendicion}</p>
              </div>
            </div>
            
            <div className="space-y-1 pt-2">
                <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-primary/60" />
                    <span className="font-bold">{rendicion.proveedor?.nombre}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Período: {new Date(rendicion.fechaDesde).toLocaleDateString()} - {new Date(rendicion.fechaHasta).toLocaleDateString()}</span>
                </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 self-stretch md:self-auto">
            {rendicion.estado === "PAGADO" ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-black px-3 py-1 text-xs uppercase tracking-wider gap-1.5 border-none">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Liquidada
                </Badge>
            ) : (
                <Badge variant="outline" className="bg-primary/5 text-primary font-black px-3 py-1 text-xs uppercase tracking-wider gap-1.5 border-primary/20">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Pendiente
                </Badge>
            )}

            <div className="text-right pt-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest leading-none mb-1">Generada el</p>
                <p className="text-sm font-bold">{new Date(rendicion.fechaRendicion).toLocaleDateString("es-AR", { day: 'numeric', month: 'long', year: 'numeric'})}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {/* Summary Figures */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b">
            <div className="p-8 space-y-1">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-zinc-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Ventas Bruto</span>
                </div>
                <p className="text-2xl font-black tabular-nums">{formatARS(rendicion.totalVendido)}</p>
            </div>
            <div className="p-8 space-y-1 bg-muted/5">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-primary/60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comisión Retenida</span>
                </div>
                <p className="text-2xl font-black tabular-nums text-primary">{formatARS(rendicion.comisionShop)}</p>
            </div>
            <div className="p-8 space-y-1 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Monto Final Liquidado</span>
                </div>
                <p className="text-3xl font-black tabular-nums text-emerald-700">{formatARS(rendicion.totalARendir)}</p>
                {rendicion.monedaLiquidacion === "USD" &&
                  rendicion.totalARendirUsd != null &&
                  rendicion.cotizacionUsd != null && (
                    <div className="mt-3 space-y-1 text-right">
                      <p className="text-lg font-black tabular-nums text-emerald-800 dark:text-emerald-300">
                        {formatUSD(rendicion.totalARendirUsd)}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-700/80">
                        Liquidación en USD · TC {rendicion.cotizacionUsd.toLocaleString("es-AR", { maximumFractionDigits: 4 })} ARS/USD
                      </p>
                    </div>
                  )}
            </div>
          </div>

          {rendicion.estado === "PAGADO" && rendicion.fechaPago && (
            <div className="bg-emerald-500/5 p-4 px-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div className="space-y-0.5">
                    <p className="text-sm font-bold text-emerald-900 leading-none">Pago Confirmado</p>
                    <p className="text-[10px] font-medium text-emerald-600/70">Liquidado mediante {METODOS_PAGO.find((m) => m.value === rendicion.metodoPago)?.label ?? rendicion.metodoPago}</p>
                </div>
              </div>
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 opacity-70">
                {new Date(rendicion.fechaPago).toLocaleString("es-AR", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})} hs
              </p>
            </div>
          )}

          {/* Items Table */}
          <div className="p-0">
            <div className="p-8 flex justify-between items-center bg-muted/5">
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary/60" />
                    Detalle Cronológico de Ventas
                </h2>
                <Badge variant="outline" className="text-[10px] font-bold border-zinc-200">{items.length} MOVIMIENTOS</Badge>
            </div>
            
            <div className="overflow-x-auto p-8 pt-0">
                <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2">
                        <TableHead className="text-[10px] font-black uppercase pl-0 h-12">Producto / SKU</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center h-12">Cant.</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right h-12">P. Venta</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right h-12">Total Bruto</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right pr-0 h-12">Para Proveedor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, i) => (
                        <TableRow key={i} className="group hover:bg-muted/10 border-border/50">
                          <TableCell className="pl-0 py-5">
                            <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight">{item.productoNombre}</span>
                                <span className="text-[10px] text-muted-foreground font-medium tracking-widest">{item.productoSku}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-sm text-zinc-500">{item.cantidad}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">{formatARS(item.precioVenta)}</TableCell>
                          <TableCell className="text-right font-bold text-sm tabular-nums">
                            {formatARS(item.totalVenta)}
                          </TableCell>
                          <TableCell className="text-right pr-0 py-5">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                               {formatARS(item.montoProveedor)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
            </div>
          </div>

          {/* Document Footer */}
          <div className="p-12 border-t mt-10 flex flex-col items-center justify-center opacity-40">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4">Comprobante de Liquidación Interna</p>
                <div className="h-[1px] w-40 bg-zinc-300 dark:bg-zinc-700 mb-4" />
                <p className="text-[10px] font-medium max-w-sm text-center leading-relaxed">
                    Este documento es un resumen de las ventas realizadas por cuenta y orden de terceros. Los montos expresados son finales y ya incluyen las comisiones correspondientes.
                </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
