"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeudaProveedor } from "@/app/api/consignacion/deudas/route";
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

export function ConsignacionDashboard() {
  const [deudas, setDeudas] = useState<DeudaProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/api/consignacion/deudas")
      .then((res) => res.json())
      .then((data) => setDeudas(Array.isArray(data) ? data : []))
      .catch(() => setDeudas([]))
      .finally(() => setLoading(false));
  }, []);

  // Dispara el crecimiento de las barras de participación tras el primer paint.
  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-skeleton-shimmer rounded-xl" />
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (deudas.length === 0) {
    return (
      <EmptyState
        icono={FileStack}
        titulo="No hay proveedores de consignación"
        descripcion="Creá un proveedor con tipo «Consignación» y asignale productos para empezar a registrar ventas y rendiciones."
        accion={
          <Button asChild variant="outline" size="sm">
            <Link href="/proveedores">Gestionar proveedores</Link>
          </Button>
        }
      />
    );
  }

  const totalDeuda = deudas.reduce((acc, d) => acc + d.deudaPendiente, 0);
  const totalVendido = deudas.reduce((acc, d) => acc + d.totalVendidoPeriodo, 0);
  const proveedoresConDeuda = deudas.filter((d) => d.deudaPendiente > 0).length;

  // Orden contable: primero a quien más se le debe.
  const filas = [...deudas].sort((a, b) => b.deudaPendiente - a.deudaPendiente);

  return (
    <div className="space-y-6">
      <Resumen
        items={[
          {
            label: "Deuda pendiente de rendición",
            valor: (
              <span className={totalDeuda > 0 ? "text-num-warning" : undefined}>
                {formatARS(totalDeuda)}
              </span>
            ),
            hint: `Saldo acumulado de ${deudas.length} proveedores`,
          },
          {
            label: "Con saldo",
            valor: (
              <>
                {proveedoresConDeuda}
                <span className="text-muted-foreground">/{deudas.length}</span>
              </>
            ),
            hint: "Proveedores con deuda pendiente",
          },
          {
            label: "Vendido en el período",
            valor: formatARS(totalVendido),
            // La API suma el subtotal de las ventas aún no incluidas en una rendición.
            hint: "Ventas aún no rendidas",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          title="Proveedores"
          descripcion="Ordenados por deuda pendiente, de mayor a menor. Montos en ARS."
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden w-56 md:table-cell">Participación</TableHead>
              <TableHead className="text-right">Deuda</TableHead>
              <TableHead className="w-[1%]">
                <span className="sr-only">Acción</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((d) => {
              const tieneDeuda = d.deudaPendiente > 0;
              const permitido = d.restriccionRendicion.permitido;
              const share = totalDeuda > 0 ? (d.deudaPendiente / totalDeuda) * 100 : 0;

              return (
                <TableRow key={d.proveedorId}>
                  <TableCell className="max-w-[18rem]">
                    <p className="truncate font-medium">{d.proveedorNombre}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {d.ultimaRendicion
                        ? `Última rendición ${new Date(d.ultimaRendicion.fechaHasta).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · ${formatARS(d.ultimaRendicion.totalARendir)}`
                        : "Sin rendiciones registradas"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {!tieneDeuda ? (
                      <span className="text-muted-foreground">Al día</span>
                    ) : permitido ? (
                      <span>Con saldo</span>
                    ) : (
                      <span>
                        Con saldo{" "}
                        <span className="text-muted-foreground">
                          · rendible en {d.restriccionRendicion.diasParaUltimaSemana} d
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {tieneDeuda ? (
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-muted-foreground/60 transition-[width] duration-700 ease-out"
                            style={{ width: mounted ? `${Math.max(share, 2)}%` : "0%" }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono font-semibold tabular-nums",
                      tieneDeuda ? "text-num-warning" : "text-muted-foreground"
                    )}
                  >
                    {formatARS(d.deudaPendiente)}
                  </TableCell>
                  <TableCell className="text-right">
                    {tieneDeuda && permitido ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/consignacion/rendiciones/nueva?proveedorId=${d.proveedorId}`}
                        >
                          Generar rendición
                        </Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
