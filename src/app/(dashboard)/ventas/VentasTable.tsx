"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui/table-skeleton";

interface VentaRow {
  id: string;
  numeroVenta: string;
  fecha: string;
  total: number;
  gananciaBruta: number;
  margenPorcentaje: number;
  deudaConsignacion: number;
  metodoPago: string;
  metodoPagoSecundario?: string | null;
  usdPago1?: number | null;
  usdPago2?: number | null;
  cliente?: { nombre: string } | null;
  clienteNombre?: string | null;
}

function getDefaultDates() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

export function VentasTable() {
  const { desde, hasta } = getDefaultDates();
  const [fechaDesde, setFechaDesde] = useState(desde);
  const [fechaHasta, setFechaHasta] = useState(hasta);
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("fechaDesde", fechaDesde);
    params.set("fechaHasta", `${fechaHasta}T23:59:59.999Z`);
    fetch(`/api/ventas?${params}`)
      .then((res) => res.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : [];
        const rows: VentaRow[] = raw.map((v: Record<string, unknown>) => {
          const u1 = v.usdPago1 != null ? Number(v.usdPago1) : null;
          const u2 = v.usdPago2 != null ? Number(v.usdPago2) : null;
          return {
            id: v.id as string,
            numeroVenta: v.numeroVenta as string,
            fecha: v.fecha as string,
            total: Number(v.total ?? 0),
            gananciaBruta: Number(v.gananciaBruta ?? 0),
            margenPorcentaje: Number(v.margenPorcentaje ?? 0),
            deudaConsignacion: Number(v.deudaConsignacion ?? 0),
            metodoPago: (v.metodoPago as string) ?? "",
            metodoPagoSecundario: (v.metodoPagoSecundario as string) ?? null,
            usdPago1: u1,
            usdPago2: u2,
            cliente: v.cliente as { nombre: string } | null,
            clienteNombre: (v.clienteNombre as string) ?? null,
          };
        });
        setVentas(rows);
      })
      .catch(() => setVentas([]))
      .finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && ventas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="space-y-1">
            <div className="h-4 w-12 animate-skeleton-shimmer rounded" />
            <div className="h-10 w-36 animate-skeleton-shimmer rounded-md" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-12 animate-skeleton-shimmer rounded" />
            <div className="h-10 w-36 animate-skeleton-shimmer rounded-md" />
          </div>
        </div>
        <TableSkeleton rows={6} cols={9} />
      </div>
    );
  }

  if (ventas.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
          <div>
            <Label htmlFor="ventas-desde" className="mb-1 block text-sm font-medium">Desde</Label>
            <Input
              id="ventas-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="min-h-10"
            />
          </div>
          <div>
            <Label htmlFor="ventas-hasta" className="mb-1 block text-sm font-medium">Hasta</Label>
            <Input
              id="ventas-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="min-h-10"
            />
          </div>
        </div>
        <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
          No hay ventas en este período.{" "}
          <Link href="/ventas/nueva" className="font-medium text-primary hover:underline">
            Crear una venta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
        <div>
          <Label htmlFor="ventas-desde" className="mb-1 block text-sm font-medium">Desde</Label>
          <Input
            id="ventas-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="min-h-10"
          />
        </div>
        <div>
          <Label htmlFor="ventas-hasta" className="mb-1 block text-sm font-medium">Hasta</Label>
          <Input
            id="ventas-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="min-h-10"
          />
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nº</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Total</TableHead>
          <TableHead className="whitespace-nowrap">Pago</TableHead>
          <TableHead>Ganancia</TableHead>
          <TableHead>Margen</TableHead>
          <TableHead>Consignación</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ventas.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="font-medium">{v.numeroVenta}</TableCell>
            <TableCell>
              {new Date(v.fecha).toLocaleDateString()} {new Date(v.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </TableCell>
            <TableCell>{v.cliente?.nombre ?? v.clienteNombre ?? "—"}</TableCell>
            <TableCell className="tabular-nums">${v.total.toFixed(2)}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {v.metodoPagoSecundario ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    2 medios
                  </Badge>
                ) : null}
                {(v.usdPago1 != null && v.usdPago1 > 0) ||
                (v.usdPago2 != null && v.usdPago2 > 0) ? (
                  <Badge variant="outline" className="border-sky-500/50 text-[10px] text-sky-700 dark:text-sky-300">
                    USD
                  </Badge>
                ) : null}
                {!v.metodoPagoSecundario &&
                  !((v.usdPago1 != null && v.usdPago1 > 0) || (v.usdPago2 != null && v.usdPago2 > 0)) && (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell className="tabular-nums text-green-600 dark:text-green-400">${v.gananciaBruta.toFixed(2)}</TableCell>
            <TableCell>{v.margenPorcentaje.toFixed(1)}%</TableCell>
            <TableCell>
              {v.deudaConsignacion > 0 ? (
                <Badge variant="secondary">${v.deudaConsignacion.toFixed(2)}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <Link href={`/ventas/${v.id}`}>
                <Button variant="ghost" size="sm">
                  Ver
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
