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
import { ListTodo, History, ArrowDownToLine, ArrowUpFromLine, Coins } from "lucide-react";
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
  const allMovs = [
    ...movimientos,
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Libro de Caja</CardTitle>
        </div>
        <CardDescription>Seguimiento detallado de todas las operaciones</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[140px] font-bold text-xs uppercase text-muted-foreground tracking-wider pl-6">Fecha y Hora</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Tipo</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Concepto</TableHead>
                <TableHead className="text-center w-16 font-bold text-xs uppercase text-muted-foreground tracking-wider">Moneda</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-muted-foreground tracking-wider">Ingreso (Debe)</TableHead>
                <TableHead className="text-right pr-6 font-bold text-xs uppercase text-muted-foreground tracking-wider">Egreso (Haber)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Montos iniciales siempre arriba o abajo segun fecha, aqui los pongo como parte de la lista si no hay movimientos para que no este vacio */}
              {allMovs.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                            {formatDate(new Date(m.fecha))}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {formatTime(new Date(m.fecha))} hs
                        </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {m.tipo === "INGRESO" ? (
                            <div className="bg-emerald-500/10 p-1 rounded">
                                <ArrowDownToLine className="h-3 w-3 text-emerald-600" />
                            </div>
                        ) : (
                            <div className="bg-red-500/10 p-1 rounded">
                                <ArrowUpFromLine className="h-3 w-3 text-red-600" />
                            </div>
                        )}
                        <Badge variant={m.tipo === "INGRESO" ? "default" : "secondary"} className="text-[10px] py-0 px-1.5 h-5">
                            {m.tipo}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{m.concepto ?? "Sin concepto"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-bold bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">
                        {m.moneda ?? "ARS"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.tipo === "INGRESO" ? (
                      <span className="text-sm font-bold text-emerald-600 tabular-nums">
                        {(m.moneda ?? "ARS") === "ARS" ? formatARS(Number(m.monto)) : formatUSD(Number(m.monto))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {m.tipo === "EGRESO" ? (
                      <span className="text-sm font-bold text-red-600 tabular-nums">
                        {(m.moneda ?? "ARS") === "ARS" ? formatARS(Number(m.monto)) : formatUSD(Number(m.monto))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Registro de Apertura (Apertura es especial, la ponemos al final si estamos ordenando por fecha DESC) */}
              <TableRow className="bg-muted/40 font-medium">
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col opacity-60">
                    <span className="text-sm">{formatDate(new Date(fechaApertura))}</span>
                    <span className="text-[10px]">{formatTime(new Date(fechaApertura))} hs</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600">APERTURA</Badge>
                </TableCell>
                <TableCell>Monto inicial de apertura</TableCell>
                <TableCell className="text-center font-bold text-[10px] text-muted-foreground">ARS</TableCell>
                <TableCell className="text-right font-bold text-emerald-600 text-sm tabular-nums">
                  {formatARS(montoInicial)}
                </TableCell>
                <TableCell className="text-right pr-6">—</TableCell>
              </TableRow>

              {Number(montoInicialUsd ?? 0) > 0 && (
                <TableRow className="bg-muted/40 font-medium border-t-0">
                  <TableCell className="pl-6 py-2">—</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600">APERTURA</Badge>
                  </TableCell>
                  <TableCell>Monto inicial de apertura USD</TableCell>
                  <TableCell className="text-center font-bold text-[10px] text-muted-foreground">USD</TableCell>
                  <TableCell className="text-right font-bold text-blue-600 text-sm tabular-nums">
                    {formatUSD(Number(montoInicialUsd))}
                  </TableCell>
                  <TableCell className="text-right pr-6">—</TableCell>
                </TableRow>
              )}

              {allMovs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                        <ListTodo className="h-8 w-8" />
                        <p>No se han registrado movimientos todavía</p>
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
