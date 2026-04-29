"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, User, Calculator, ArrowRight } from "lucide-react";

interface Proveedor {
  id: string;
  nombre: string;
}

interface RendicionParamsProps {
  proveedores: Proveedor[];
  proveedorId: string;
  setProveedorId: (id: string) => void;
  fechaDesde: string;
  setFechaDesde: (fecha: string) => void;
  fechaHasta: string;
  setFechaHasta: (fecha: string) => void;
  onCalculate: () => void;
  isLoading: boolean;
  bloqueado?: boolean;
}

export function RendicionParams({
  proveedores,
  proveedorId,
  setProveedorId,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  onCalculate,
  isLoading,
  bloqueado = false,
}: RendicionParamsProps) {
  return (
    <Card className="border-none shadow-md bg-white dark:bg-zinc-900 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Parámetros de Rendición</CardTitle>
        </div>
        <CardDescription>Seleccioná el proveedor y el rango de fechas para calcular las ventas pendientes</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-3 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Proveedor
            </label>
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger className="bg-muted/50 border-none focus:ring-1 focus:ring-primary/20">
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="h-3 w-3" />
                Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full rounded-md border-none bg-muted/50 px-3 py-2 text-sm focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="h-3 w-3" />
                Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full rounded-md border-none bg-muted/50 px-3 py-2 text-sm focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <p className="text-[10px] text-muted-foreground max-w-[250px]">
            Las fechas se sugieren automáticamente basándose en la última rendición del proveedor seleccionado.
          </p>
          <Button 
            onClick={onCalculate} 
            disabled={isLoading || !proveedorId || bloqueado}
            className="font-bold shadow-md px-8"
          >
            {isLoading ? "Calculando..." : "Calcular Totales"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
