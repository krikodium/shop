"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { CalendarDays, TrendingUp, TrendingDown, Wallet, FileText, ChevronDown } from "lucide-react";

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

const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

export function MonthlyClosure({ cierreMensual, onLoad, loading }: MonthlyClosureProps) {
  const [mes, setMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));

  return (
    <Card className="border-none shadow-md overflow-hidden bg-muted/10">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Cierre Mensual</CardTitle>
          </div>
          <CardDescription>Consulta el historial de cierres y saldos por mes</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-zinc-900 p-1 rounded-lg border shadow-sm">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[120px] border-none bg-transparent h-8 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1).padStart(2, "0"),
                label: new Date(2000, i, 1).toLocaleString("es-AR", { month: "long" }),
              })).map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[80px] border-none bg-transparent h-8 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => onLoad(mes, ano)} 
            disabled={loading}
            className="h-8 px-4 text-xs font-bold uppercase tracking-wider"
          >
            {loading ? "..." : "Consultar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {cierreMensual ? (
          <div className="space-y-8">
            {/* Totales Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col p-4 rounded-xl border-2 border-emerald-500/10 bg-emerald-500/5 transition-all hover:bg-emerald-500/10">
                <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70">Ingresos</span>
                </div>
                <p className="text-xl font-black text-emerald-700 tabular-nums">
                  {formatARS(cierreMensual.totales.totalIngresos)}
                </p>
              </div>
              
              <div className="flex flex-col p-4 rounded-xl border-2 border-red-500/10 bg-red-500/5 transition-all hover:bg-red-500/10">
                <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-600/70">Egresos</span>
                </div>
                <p className="text-xl font-black text-red-700 tabular-nums">
                  {formatARS(cierreMensual.totales.totalEgresos)}
                </p>
              </div>
              
              <div className="flex flex-col p-4 rounded-xl border-2 border-primary/10 bg-primary/5 transition-all hover:bg-primary/10">
                <div className="flex items-center justify-between mb-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Saldo Final</span>
                </div>
                <p className="text-xl font-black text-primary tabular-nums">
                  {formatARS(cierreMensual.totales.saldoFinal)}
                </p>
              </div>
            </div>

            {/* Cajas Individuales Table */}
            {cierreMensual.cajas.length > 0 && (
              <div className="rounded-xl border border-dashed border-border bg-white p-1 dark:bg-zinc-900 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground pl-4 h-10">Usuario</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10">Apertura</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-10">Cierre</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-4 h-10">Saldo Neto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cierreMensual.cajas.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/30 transition-colors border-none">
                        <TableCell className="font-bold text-sm pl-4 py-3">{c.user}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.fechaApertura).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.fechaCierre).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary tabular-nums pr-4 py-3">
                          {formatARS(c.saldoFinal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {cierreMensual.cajas.length === 0 && (
              <div className="text-center py-6 bg-white dark:bg-zinc-900 rounded-xl border border-dashed opacity-60">
                <p className="text-xs font-medium">No se encontraron cajas cerradas en este período</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
            <FileText className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">Hacé clic en "Consultar" para ver los datos del período seleccionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
