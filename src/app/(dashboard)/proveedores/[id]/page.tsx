"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProveedorForm, proveedorToFormValues } from "@/components/forms/ProveedorForm";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import type { Proveedor } from "@prisma/client";
import {
  Package,
  TrendingUp,
  CreditCard,
  Receipt,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

interface AnalyticsData {
  proveedor: { id: string; nombre: string; tipoProveedor: string };
  productos: {
    lista: Array<{
      id: string;
      sku: string;
      nombre: string;
      stockActual: number;
      stockMinimo: number;
      precioVenta: number;
      precioCompra: number | null;
      enConsignacion: boolean;
      activo: boolean;
      categoria: string | null;
    }>;
    cantidad: number;
    cantidadActivos: number;
    valorInventario: number;
    valorInventarioCosto: number;
  };
  ventas: { totalVendido: number; cantidadVentas: number };
  consignacion: {
    deudaPendiente: number;
    totalRendido: number;
    totalVendidoRendido: number;
    rendiciones: Array<{
      id: string;
      numeroRendicion: string;
      fechaDesde: string;
      fechaHasta: string;
      totalVendido: number;
      totalARendir: number;
      estado: string;
    }>;
  } | null;
  compras: {
    totalCompras: number;
    cantidadOrdenes: number;
    ultimas: Array<{ id: string; numeroOrden: string; fecha: string; total: number }>;
  };
  ventasRecientes: Array<{
    id: string;
    numeroVenta: string;
    fecha: string;
    total: number;
    subtotalProveedor: number;
    itemsProveedor: Array<{ productoNombre: string; cantidad: number; subtotal: number }>;
  }>;
}

export default function ProveedorDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/proveedores/${id}`).then((r) =>
        r.ok ? r.json() : Promise.reject()
      ),
      fetch(`/api/proveedores/${id}/analytics`).then((r) =>
        r.ok ? r.json() : Promise.reject()
      ),
    ])
      .then(([prov, anal]) => {
        setProveedor(prov);
        setAnalytics(anal);
      })
      .catch(() => setProveedor(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: ProveedorFormValues) => {
    const res = await fetch(`/api/proveedores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Error al actualizar");
    }
    const updated = await res.json();
    setProveedor(updated);
    router.refresh();
    // Refrescar analytics
    fetch(`/api/proveedores/${id}/analytics`)
      .then((r) => r.ok && r.json())
      .then((a) => a && setAnalytics(a));
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!proveedor) {
    return (
      <div className="space-y-4">
        <p>Proveedor no encontrado.</p>
        <Link href="/proveedores">
          <Button variant="outline">Volver a proveedores</Button>
        </Link>
      </div>
    );
  }

  const a = analytics;
  const esConsignacion = proveedor.tipoProveedor === "CONSIGNACION";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/proveedores">
          <Button variant="ghost">← Proveedores</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={esConsignacion ? "secondary" : "outline"}>
            {esConsignacion ? "Consignación" : "Regular"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormOpen(!formOpen)}
          >
            {formOpen ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar edición
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Editar datos
              </>
            )}
          </Button>
        </div>
      </div>

      {formOpen && (
        <div className="rounded-lg border bg-card p-4">
          <ProveedorForm
            defaultValues={proveedorToFormValues(proveedor)}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">{proveedor.nombre}</h1>
        {(proveedor.telefono || proveedor.email) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[proveedor.telefono, proveedor.email].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {!a ? (
        <p className="text-muted-foreground">Cargando estadísticas…</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Productos en dominio
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{a.productos.cantidad}</p>
                <p className="text-xs text-muted-foreground">
                  {a.productos.cantidadActivos} activos · Valor inventario {fmt(a.productos.valorInventario)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total vendido
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {fmt(a.ventas.totalVendido)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.ventas.cantidadVentas} ventas con sus productos
                </p>
              </CardContent>
            </Card>

            {esConsignacion && a.consignacion && (
              <>
                <Card className="border-amber-200 dark:border-amber-900">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Deuda pendiente
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-amber-600">
                      {fmt(a.consignacion.deudaPendiente)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Por rendir al proveedor
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total rendido
                    </CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {fmt(a.consignacion.totalRendido)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Histórico pagado al proveedor
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {!esConsignacion && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total comprado
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{fmt(a.compras.totalCompras)}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.compras.cantidadOrdenes} órdenes de compra
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Productos en dominio */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Productos en dominio</CardTitle>
              <Link href={`/productos?proveedorId=${id}`}>
                <Button variant="ghost" size="sm">
                  Ver todos <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {a.productos.lista.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay productos asignados a este proveedor
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Producto</th>
                        <th className="py-2 text-left">SKU</th>
                        <th className="py-2 text-right">Stock</th>
                        <th className="py-2 text-right">P. venta</th>
                        <th className="py-2 text-right">Valor</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.productos.lista.map((p) => {
                        const bajoStock = p.stockActual <= p.stockMinimo;
                        return (
                          <tr key={p.id} className="border-b">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                {!p.activo && (
                                  <span className="text-xs text-muted-foreground">(inactivo)</span>
                                )}
                                <Link
                                  href={`/productos/${p.id}/editar`}
                                  className="font-medium hover:underline"
                                >
                                  {p.nombre}
                                </Link>
                              </div>
                            </td>
                            <td className="py-2 text-muted-foreground">{p.sku}</td>
                            <td className="py-2 text-right">
                              <span className={bajoStock ? "text-amber-600" : ""}>
                                {p.stockActual}
                                {bajoStock && (
                                  <AlertTriangle className="ml-1 inline h-3 w-3" />
                                )}
                              </span>
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {fmt(p.precioVenta)}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {fmt(p.precioVenta * p.stockActual)}
                            </td>
                            <td>
                              <Link href={`/productos/${p.id}/editar`}>
                                <Button variant="ghost" size="sm">
                                  Editar
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ventas recientes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ventas recientes con sus productos</CardTitle>
                <Link href="/ventas">
                  <Button variant="ghost" size="sm">
                    Ver ventas <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {a.ventasRecientes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Sin ventas registradas
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {a.ventasRecientes.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <Link
                            href={`/ventas/${v.id}`}
                            className="font-medium hover:underline"
                          >
                            {v.numeroVenta}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {new Date(v.fecha).toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-amber-600">
                            Sus productos: {fmt(v.subtotalProveedor)}
                          </p>
                        </div>
                        <span className="font-semibold">{fmt(v.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Rendiciones o Órdenes de compra */}
            {esConsignacion && a.consignacion ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Rendiciones</CardTitle>
                  <Link href={`/consignacion/rendiciones/nueva?proveedorId=${id}`}>
                    <Button size="sm">Nueva rendición</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {a.consignacion.rendiciones.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Sin rendiciones
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {a.consignacion.rendiciones.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <Link
                              href={`/consignacion/rendiciones/${r.id}`}
                              className="font-medium hover:underline"
                            >
                              {r.numeroRendicion}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.fechaDesde).toLocaleDateString("es-AR")} -{" "}
                              {new Date(r.fechaHasta).toLocaleDateString("es-AR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-amber-600">
                              {fmt(r.totalARendir)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {r.estado}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Órdenes de compra</CardTitle>
                  <Link href="/compras/nueva">
                    <Button size="sm">Nueva orden</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {a.compras.ultimas.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Sin órdenes de compra
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {a.compras.ultimas.map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <Link
                              href={`/compras/${o.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.numeroOrden}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.fecha).toLocaleDateString("es-AR")}
                            </p>
                          </div>
                          <span className="font-semibold">{fmt(o.total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
