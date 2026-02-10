"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Proveedor } from "@prisma/client";

interface PreviewItem {
  ventaId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  comisionShop: number | null;
  montoProveedor: number;
}

interface PreviewData {
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  items: PreviewItem[];
  proveedorNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  todasRendidas?: boolean;
}

function NuevaRendicionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proveedorIdParam = searchParams.get("proveedorId");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState<string>(proveedorIdParam ?? "");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => {
        const provs = (Array.isArray(data) ? data : []).filter(
          (p: Proveedor) => p.tipoProveedor === "CONSIGNACION"
        );
        setProveedores(provs);
        if (proveedorIdParam && provs.some((p: Proveedor) => p.id === proveedorIdParam)) {
          setProveedorId(proveedorIdParam);
        } else if (provs.length > 0 && !proveedorId) {
          setProveedorId(provs[0].id);
        }
      });
  }, [proveedorIdParam, proveedorId]);

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    const desde = haceUnMes.toISOString().slice(0, 10);
    setFechaDesde((prev) => prev || desde);
    setFechaHasta((prev) => prev || hoy);
  }, []);

  const calcularPreview = async () => {
    if (!proveedorId || !fechaDesde || !fechaHasta) {
      setError("Seleccioná proveedor y rango de fechas");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/consignacion/rendiciones/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          fechaDesde,
          fechaHasta,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al calcular");
      }
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarRendicion = async () => {
    if (!proveedorId || !fechaDesde || !fechaHasta) return;
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/consignacion/rendiciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proveedorId,
          fechaDesde,
          fechaHasta,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al crear");
      }
      const rendicion = await res.json();
      router.push(`/consignacion/rendiciones/${rendicion.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/consignacion">
        <Button variant="ghost">← Consignación</Button>
      </Link>
      <h1 className="text-2xl font-bold">Nueva rendición</h1>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-sm">Proveedor</label>
            <Select value={proveedorId} onValueChange={(v) => setProveedorId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
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
          <div>
            <label className="mb-1 block text-sm">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="rounded border px-3 py-2"
            />
          </div>
          <Button onClick={calcularPreview} disabled={isLoading}>
            {isLoading ? "Calculando…" : "Calcular"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-destructive">{error}</p>}

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de rendición</CardTitle>
            <p className="text-sm text-muted-foreground">
              {preview.proveedorNombre} •{" "}
              {new Date(preview.fechaDesde).toLocaleDateString()} -{" "}
              {new Date(preview.fechaHasta).toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.todasRendidas && (
              <p className="rounded bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Todas las ventas de este período ya fueron incluidas en rendiciones anteriores.
                No hay monto nuevo a rendir.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total vendido</p>
                <p className="text-2xl font-bold">${preview.totalVendido.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisión shop</p>
                <p className="text-2xl font-bold text-green-600">
                  ${preview.comisionShop.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">A rendir al proveedor</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${preview.totalARendir.toFixed(2)}
                </p>
              </div>
            </div>

            {preview.items.length > 0 && !preview.todasRendidas && (
              <>
                <div className="text-sm font-medium">Detalle de items</div>
                <div className="max-h-64 overflow-auto rounded border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-right">Cant.</th>
                        <th className="p-2 text-right">P. venta</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">A proveedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((item, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{item.productoNombre}</td>
                          <td className="p-2 text-right">{item.cantidad}</td>
                          <td className="p-2 text-right">
                            ${item.precioVenta.toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            ${item.totalVenta.toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            ${item.montoProveedor.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  onClick={confirmarRendicion}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Creando…" : "Confirmar y generar rendición"}
                </Button>
              </>
            )}
            {preview.todasRendidas && preview.items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Seleccioná otro rango de fechas para ver ventas pendientes de rendir.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NuevaRendicionPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <NuevaRendicionContent />
    </Suspense>
  );
}
