"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { EmptyState } from "@/components/ui/empty-state";
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
import { formatARS } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

interface CierreMensual {
  cajas: Array<{
    id: string;
    user: string;
    fechaApertura: string;
    fechaCierre: string;
    montoInicial: number;
    totalIngresos: number;
    totalEgresos: number;
    saldoFinal: number;
  }>;
  totales: {
    montoInicial: number;
    totalIngresos: number;
    totalEgresos: number;
    saldoFinal: number;
  };
}

interface MonthlyClosureProps {
  cierreMensual: CierreMensual | null;
  onLoad: (mes: string, ano: string) => void;
  loading?: boolean;
}

/**
 * Consulta del cierre mensual (solo lectura: GET al endpoint de cierre).
 * Muestra los totales que devuelve el servidor tal cual, sin recalcular.
 */
export function MonthlyClosure({ cierreMensual, onLoad, loading }: MonthlyClosureProps) {
  const [mes, setMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));

  const filtros = (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="cierre-mes" className="sr-only">
        Mes
      </Label>
      <Select value={mes} onValueChange={setMes}>
        <SelectTrigger id="cierre-mes" className="h-9 w-[140px] capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1).padStart(2, "0"),
            label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
          })).map((m) => (
            <SelectItem key={m.value} value={m.value} className="capitalize">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Label htmlFor="cierre-ano" className="sr-only">
        Año
      </Label>
      <Select value={ano} onValueChange={setAno}>
        <SelectTrigger id="cierre-ano" className="h-9 w-[96px] font-mono tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-9"
        onClick={() => onLoad(mes, ano)}
        loading={loading}
        loadingText="Consultando…"
      >
        Consultar
      </Button>
    </div>
  );

  return (
    <Panel>
      <PanelHeader
        title="Cierre mensual"
        descripcion="Historial de cajas cerradas y saldos por mes"
        acciones={filtros}
      />
      {/* Si el endpoint respondió un error ({ error }), no hay totales que mostrar. */}
      {cierreMensual?.totales ? (
        <>
          <PanelBody>
            <FigureGrid columnas={3}>
              <Figure
                label="Ingresos"
                valor={formatARS(cierreMensual.totales.totalIngresos)}
                tono="positivo"
              />
              <Figure
                label="Egresos"
                valor={formatARS(cierreMensual.totales.totalEgresos)}
                tono="negativo"
              />
              <Figure
                label="Saldo final"
                valor={formatARS(cierreMensual.totales.saldoFinal)}
                tono={cierreMensual.totales.saldoFinal >= 0 ? "neutro" : "negativo"}
              />
            </FigureGrid>
          </PanelBody>

          {cierreMensual.cajas.length > 0 ? (
            <div className="border-t border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead className="text-right">Saldo neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cierreMensual.cajas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.user}</TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">
                        {new Date(c.fechaApertura).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">
                        {new Date(c.fechaCierre).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono font-semibold tabular-nums",
                          c.saldoFinal < 0 && "text-num-negative"
                        )}
                      >
                        {formatARS(c.saldoFinal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <PanelBody className="pt-0">
              <EmptyState className="py-6" titulo="No hay cajas cerradas en este período" />
            </PanelBody>
          )}
        </>
      ) : (
        <PanelBody>
          <EmptyState
            className="py-6"
            titulo="Elegí un mes y consultá"
            descripcion="Tocá Consultar para ver los totales y las cajas cerradas del período seleccionado."
          />
        </PanelBody>
      )}
    </Panel>
  );
}
