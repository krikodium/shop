"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
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
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
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

/** El estado se lee por texto; el badge relleno queda solo para lo ya pagado. */
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADO: "Pagado",
};

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

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
      <EmptyState
        icono={FileText}
        titulo="No hay rendiciones registradas"
        descripcion="Creá una rendición para liquidar las ventas de tus proveedores de consignación."
        accion={
          <Button asChild size="sm">
            <Link href="/consignacion/rendiciones/nueva">Nueva rendición</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Panel>
      <PanelHeader title="Historial de rendiciones" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Total vendido</TableHead>
            <TableHead className="text-right">Neto a rendir</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[1%]">
              <span className="sr-only">Acción</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rendiciones.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs tabular-nums">
                {r.numeroRendicion}
              </TableCell>
              <TableCell className="font-medium">{r.proveedor?.nombre || "—"}</TableCell>
              <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                {fechaCorta(r.fechaDesde)} – {fechaCorta(r.fechaHasta)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatARS(r.totalVendido)}
              </TableCell>
              <TableCell className="text-right">
                <p className="font-mono font-semibold tabular-nums">
                  {formatARS(r.totalARendir)}
                </p>
                {r.monedaLiquidacion === "USD" && r.totalARendirUsd != null && (
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatUSD(r.totalARendirUsd)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={r.estado === "PAGADO" ? "default" : "outline"}>
                  {ESTADO_LABEL[r.estado] ?? r.estado}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/consignacion/rendiciones/${r.id}`}>Ver</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
