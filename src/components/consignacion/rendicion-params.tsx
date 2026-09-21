"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  /** Cálculo del preview en curso: muestra el indicador en el botón. */
  isLoading: boolean;
  /** Otra acción en vuelo (p. ej. confirmar): deshabilita sin indicador propio. */
  ocupado?: boolean;
  bloqueado?: boolean;
}

const claseLabel = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

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
  ocupado = false,
  bloqueado = false,
}: RendicionParamsProps) {
  return (
    <Panel>
      <PanelHeader
        title="Parámetros"
        descripcion="Las fechas se sugieren a partir de la última rendición del proveedor."
      />
      <PanelBody>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 space-y-1.5">
            <Label htmlFor="rend-proveedor" className={claseLabel}>
              Proveedor
            </Label>
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger id="rend-proveedor" className="h-10 w-full">
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

          <div className="space-y-1.5">
            <Label htmlFor="rend-desde" className={claseLabel}>
              Desde
            </Label>
            <Input
              id="rend-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-10 w-[10rem]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rend-hasta" className={claseLabel}>
              Hasta
            </Label>
            <Input
              id="rend-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-10 w-[10rem]"
            />
          </div>

          <Button
            onClick={onCalculate}
            loading={isLoading}
            loadingText="Calculando…"
            disabled={ocupado || !proveedorId || bloqueado}
            className="h-10"
          >
            Calcular totales
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
