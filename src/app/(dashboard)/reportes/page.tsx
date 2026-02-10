"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

function getDefaultDates() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return {
    desde: inicio.toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

export default function ReportesPage() {
  const { desde, hasta } = getDefaultDates();
  const [fechaDesde, setFechaDesde] = useState(desde);
  const [fechaHasta, setFechaHasta] = useState(hasta);
  const [ventas, setVentas] = useState<Record<string, unknown> | null>(null);
  const [inventario, setInventario] = useState<Record<string, unknown> | null>(null);
  const [rentabilidad, setRentabilidad] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchReporte = useCallback(async (tipo: string) => {
    setLoading(tipo);
    try {
      const res = await fetch(
        `/api/reportes?tipo=${tipo}&desde=${fechaDesde}&hasta=${fechaHasta}`
      );
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      if (tipo === "ventas") setVentas(data);
      if (tipo === "inventario") setInventario(data);
      if (tipo === "rentabilidad") setRentabilidad(data);
    } catch {
      if (tipo === "ventas") setVentas(null);
      if (tipo === "inventario") setInventario(null);
      if (tipo === "rentabilidad") setRentabilidad(null);
    } finally {
      setLoading(null);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchReporte("ventas");
    fetchReporte("inventario");
    fetchReporte("rentabilidad");
  }, [fetchReporte]);

  const METODOS_LABEL: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TARJETA_DEBITO: "Tarjeta débito",
    TARJETA_CREDITO: "Tarjeta crédito",
    TRANSFERENCIA: "Transferencia",
    MERCADOPAGO: "Mercado Pago",
    MULTIPLE: "Múltiple",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Desde</label>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Hasta</label>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="ventas">
        <TabsList>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-6">
          {loading === "ventas" ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : ventas ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total ventas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatMoney((ventas.totalVentas as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cantidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {ventas.cantidadVentas as number ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Ganancia
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMoney((ventas.totalGanancia as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Margen prom.
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(ventas.margenPromedio as number)?.toFixed(1) ?? 0}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              {(ventas.porMetodoPago as Record<string, { cantidad: number; total: number }>) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Por método de pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Método</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(
                          ventas.porMetodoPago as Record<string, { cantidad: number; total: number }>
                        ).map(([metodo, data]) => (
                          <TableRow key={metodo}>
                            <TableCell>{METODOS_LABEL[metodo] ?? metodo}</TableCell>
                            <TableCell>{data.cantidad}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(data.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Sin datos de ventas</p>
          )}
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          {loading === "inventario" ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : inventario ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Productos activos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {inventario.cantidadProductos as number ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Valor (costo)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatMoney((inventario.valorInventarioCompra as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Valor (venta)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatMoney((inventario.valorInventarioVenta as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {(inventario.productosBajoStock as Array<{ sku: string; nombre: string; stockActual: number; stockMinimo: number }>)?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Productos con stock bajo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Mínimo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(inventario.productosBajoStock as Array<{ sku: string; nombre: string; stockActual: number; stockMinimo: number }>).map((p) => (
                          <TableRow key={p.sku}>
                            <TableCell>{p.sku}</TableCell>
                            <TableCell>{p.nombre}</TableCell>
                            <TableCell className="text-amber-600">{p.stockActual}</TableCell>
                            <TableCell>{p.stockMinimo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Cargar inventario para ver datos</p>
          )}
        </TabsContent>

        <TabsContent value="rentabilidad" className="mt-6">
          {loading === "rentabilidad" ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : rentabilidad ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total ventas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatMoney((rentabilidad.totalVentas as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Costo total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatMoney((rentabilidad.totalCosto as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Ganancia
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMoney((rentabilidad.totalGanancia as number) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Margen %
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(rentabilidad.margenPorcentaje as number)?.toFixed(1) ?? 0}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              {(rentabilidad.porProducto as Array<{ nombre: string; sku: string; cantidad: number; venta: number; costo: number; ganancia: number }>)?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rentabilidad por producto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cant.</TableHead>
                          <TableHead className="text-right">Venta</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead className="text-right">Ganancia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(rentabilidad.porProducto as Array<{ nombre: string; sku: string; cantidad: number; venta: number; costo: number; ganancia: number }>).map((p) => (
                          <TableRow key={p.sku}>
                            <TableCell>
                              <span className="font-medium">{p.nombre}</span>
                              <span className="text-muted-foreground ml-1">({p.sku})</span>
                            </TableCell>
                            <TableCell>{p.cantidad}</TableCell>
                            <TableCell className="text-right">{formatMoney(p.venta)}</TableCell>
                            <TableCell className="text-right">{formatMoney(p.costo)}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatMoney(p.ganancia)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Cargar rentabilidad para ver datos</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
