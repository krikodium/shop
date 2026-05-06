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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ListTodo, History, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
    <Card className="border border-border/80 bg-card shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-semibold">Libro de caja</CardTitle>
        </div>
        <CardDescription>Movimientos del turno</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[140px] pl-6 text-xs font-medium text-muted-foreground">
                  Fecha y hora
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Concepto</TableHead>
                <TableHead className="w-16 text-center text-xs font-medium text-muted-foreground">
                  Mon.
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  Ingreso
                </TableHead>
                <TableHead className="pr-6 text-right text-xs font-medium text-muted-foreground">
                  Egreso
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMovs.map((m) => (
                <TableRow
                  key={m.id}
                  className="border-border/40 transition-colors hover:bg-muted/40"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {formatDate(new Date(m.fecha))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(new Date(m.fecha))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                          m.tipo === "INGRESO"
                            ? "border-border bg-muted/50 text-foreground"
                            : "border-border bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {m.tipo === "INGRESO" ? (
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpFromLine className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {m.tipo}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{m.concepto ?? "Sin concepto"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {m.moneda ?? "ARS"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.tipo === "INGRESO" ? (
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {(m.moneda ?? "ARS") === "ARS"
                          ? formatARS(Number(m.monto))
                          : formatUSD(Number(m.monto))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {m.tipo === "EGRESO" ? (
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {(m.moneda ?? "ARS") === "ARS"
                          ? formatARS(Number(m.monto))
                          : formatUSD(Number(m.monto))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="border-border/60 bg-muted/25 hover:bg-muted/30">
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col text-muted-foreground">
                    <span className="text-sm">{formatDate(new Date(fechaApertura))}</span>
                    <span className="text-xs">{formatTime(new Date(fechaApertura))}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Apertura
                  </Badge>
                </TableCell>
                <TableCell>Monto inicial</TableCell>
                <TableCell className="text-center text-[10px] font-medium text-muted-foreground">
                  ARS
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {formatARS(montoInicial)}
                </TableCell>
                <TableCell className="pr-6 text-right text-muted-foreground">—</TableCell>
              </TableRow>

              {Number(montoInicialUsd ?? 0) > 0 && (
                <TableRow className="border-border/60 bg-muted/25 hover:bg-muted/30">
                  <TableCell className="pl-6 py-3 text-muted-foreground">—</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Apertura
                    </Badge>
                  </TableCell>
                  <TableCell>Monto inicial USD</TableCell>
                  <TableCell className="text-center text-[10px] font-medium text-muted-foreground">
                    USD
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatUSD(Number(montoInicialUsd))}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-muted-foreground">—</TableCell>
                </TableRow>
              )}

              {allMovs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ListTodo className="h-8 w-8 opacity-40" />
                      <p className="text-sm">Todavía no hay movimientos registrados</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
