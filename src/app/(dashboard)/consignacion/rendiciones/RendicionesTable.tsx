"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
} from "lucide-react";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

interface RendicionRow {
  id: string;
  numeroRendicion: string;
  fechaRendicion: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  monedaLiquidacion: string;
  totalARendirUsd: number | null;
  estado: string;
  proveedor: { nombre: string };
}

export function RendicionesTable() {
  const [rendiciones, setRendiciones] = useState<RendicionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consignacion/rendiciones")
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: RendicionRow[] = raw.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          numeroRendicion: r.numeroRendicion as string,
          fechaRendicion: r.fechaRendicion as string,
          fechaDesde: r.fechaDesde as string,
          fechaHasta: r.fechaHasta as string,
          totalVendido: Number(r.totalVendido ?? 0),
          comisionShop: Number(r.comisionShop ?? 0),
          totalARendir: Number(r.totalARendir ?? 0),
          monedaLiquidacion: (r.monedaLiquidacion as string) ?? "ARS",
          totalARendirUsd: r.totalARendirUsd != null ? Number(r.totalARendirUsd) : null,
          estado: (r.estado as string) ?? "",
          proveedor: (r.proveedor as { nombre: string }) ?? { nombre: "" },
        }));
        setRendiciones(rows);
      })
      .catch(() => setRendiciones([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={7} />;

  if (rendiciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/20 rounded-2xl border border-dashed">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
            <h3 className="font-bold text-lg">No hay rendiciones registradas</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Comenzá creando una nueva rendición para liquidar las ventas de tus proveedores.
            </p>
        </div>
        <Link href="/consignacion/rendiciones/nueva">
          <Button className="font-bold">Nueva rendición</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm border-border/50">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-[10px] font-black uppercase pl-6 h-12">Nº Comprobante</TableHead>
              <TableHead className="text-[10px] font-black uppercase h-12">Proveedor</TableHead>
              <TableHead className="text-[10px] font-black uppercase h-12">Período de Liquidación</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right h-12">Total Vendido</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right h-12">Neto a Rendir</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-center h-12">Estado</TableHead>
              <TableHead className="w-10 pr-6 h-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rendiciones.map((r) => (
              <TableRow key={r.id} className="group hover:bg-muted/20 transition-colors border-border/40">
                <TableCell className="pl-6 py-4">
                    <span className="font-black text-sm tracking-tighter text-muted-foreground group-hover:text-primary transition-colors">
                        {r.numeroRendicion}
                    </span>
                </TableCell>
                <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="font-bold text-sm">{r.proveedor?.nombre ?? "—"}</span>
                    </div>
                </TableCell>
                <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
                        <span>
                            {new Date(r.fechaDesde).toLocaleDateString("es-AR", { day: '2-digit', month: 'short' })} - {new Date(r.fechaHasta).toLocaleDateString("es-AR", { day: '2-digit', month: 'short' })}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="text-right font-medium text-xs text-zinc-500 tabular-nums">
                    {formatARS(r.totalVendido)}
                </TableCell>
                <TableCell className="text-right py-4">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-black text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                        {formatARS(r.totalARendir)}
                      </span>
                      {r.monedaLiquidacion === "USD" && r.totalARendirUsd != null && (
                        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {formatUSD(r.totalARendirUsd)}
                        </span>
                      )}
                    </div>
                </TableCell>
                <TableCell className="text-center py-4">
                  {r.estado === "PAGADO" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-none font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        PAGADO
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 gap-1">
                        <Clock className="h-3 w-3" />
                        PENDIENTE
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right py-4">
                  <Link href={`/consignacion/rendiciones/${r.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary hover:text-white transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
