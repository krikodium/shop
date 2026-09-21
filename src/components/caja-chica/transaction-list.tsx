"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatUSD } from "@/lib/formatCurrency";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

interface Movimiento {
  id: string;
  tipo: string;
  monto: number;
  moneda?: string;
  concepto: string | null;
  fecha: string;
}

interface TransactionListProps {
  movimientos: Movimiento[];
  fechaApertura: string;
  montoInicial: number;
  montoInicialUsd?: number | null;
}

/** Monto del movimiento en su propia moneda (sin convertir). */
function montoEnMoneda(m: Movimiento) {
  return (m.moneda ?? "ARS") === "ARS" ? formatARS(Number(m.monto)) : formatUSD(Number(m.monto));
}

function FechaHora({ fecha, apagada }: { fecha: string; apagada?: boolean }) {
  const d = new Date(fecha);
  return (
    <span className={apagada ? "text-muted-foreground" : undefined}>
      <span className="font-mono tabular-nums">{formatDate(d)}</span>{" "}
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatTime(d)}</span>
    </span>
  );
}

const Guion = () => <span className="text-muted-foreground">—</span>;

export function TransactionList({
  movimientos,
  fechaApertura,
  montoInicial,
  montoInicialUsd,
}: TransactionListProps) {
  const allMovs = [...movimientos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  return (
    <Panel>
      <PanelHeader
        title="Libro de caja"
        descripcion={
          allMovs.length > 0
            ? `${allMovs.length} ${allMovs.length === 1 ? "movimiento" : "movimientos"} en el turno`
            : "Movimientos del turno"
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="w-16">Mon.</TableHead>
            <TableHead className="text-right">Ingreso</TableHead>
            <TableHead className="text-right">Egreso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allMovs.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <FechaHora fecha={m.fecha} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {m.tipo === "INGRESO" ? "Ingreso" : "Egreso"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[320px] truncate">
                {m.concepto ?? <span className="text-muted-foreground">Sin concepto</span>}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {m.moneda ?? "ARS"}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums text-num-positive">
                {m.tipo === "INGRESO" ? montoEnMoneda(m) : <Guion />}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums text-num-negative">
                {m.tipo === "EGRESO" ? montoEnMoneda(m) : <Guion />}
              </TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell>
              <FechaHora fecha={fechaApertura} apagada />
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px] font-normal">
                Apertura
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">Monto inicial</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">ARS</TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {formatARS(montoInicial)}
            </TableCell>
            <TableCell className="text-right">
              <Guion />
            </TableCell>
          </TableRow>

          {Number(montoInicialUsd ?? 0) > 0 && (
            <TableRow>
              <TableCell>
                <Guion />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-normal">
                  Apertura
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">Monto inicial USD</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">USD</TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {formatUSD(Number(montoInicialUsd))}
              </TableCell>
              <TableCell className="text-right">
                <Guion />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {allMovs.length === 0 && (
        <PanelBody className="border-t border-border">
          <EmptyState
            className="py-6"
            titulo="Todavía no hay movimientos registrados"
            descripcion="Los ingresos y egresos del turno aparecen acá, arriba de la apertura."
          />
        </PanelBody>
      )}
    </Panel>
  );
}
