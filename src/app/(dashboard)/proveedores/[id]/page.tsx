"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Resumen, type ItemResumen } from "@/components/ui/resumen";
import { DataList, DataRow } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProveedorForm, proveedorToFormValues } from "@/components/forms/ProveedorForm";
import { claseTonoCifra, tonoStock } from "@/components/productos/stock";
import { formatARS } from "@/lib/formatCurrency";
import { notificar } from "@/lib/notificar";
import { cn } from "@/lib/utils";
import type { ProveedorFormValues } from "@/lib/validaciones/proveedorSchema";
import type { Proveedor } from "@prisma/client";

function VolverAProveedores() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
      <Link href="/proveedores">← Proveedores</Link>
    </Button>
  );
}

function ProveedorDetalleSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-8 w-32 animate-skeleton-shimmer rounded-md" />
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-skeleton-shimmer rounded" />
          <div className="h-8 w-56 animate-skeleton-shimmer rounded-md" />
        </div>
        <div className="h-9 w-32 animate-skeleton-shimmer rounded-md" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card px-4 py-3.5">
            <div className="h-3 w-24 animate-skeleton-shimmer rounded" />
            <div className="mt-2.5 h-6 w-32 animate-skeleton-shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-skeleton-shimmer rounded-lg" />
    </div>
  );
}

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

  // Si falla, lanza: el formulario muestra el error con `notificar`.
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
    notificar.ok("Proveedor actualizado");
    router.refresh();
    // Refrescar analytics
    fetch(`/api/proveedores/${id}/analytics`)
      .then((r) => r.ok && r.json())
      .then((a) => a && setAnalytics(a));
  };

  if (loading) return <ProveedorDetalleSkeleton />;
  if (!proveedor) {
    return (
      <div className="space-y-6">
        <VolverAProveedores />
        <EmptyState
          icono={Truck}
          titulo="Proveedor no encontrado"
          descripcion="Puede haber sido eliminado o el enlace ya no es válido."
          accion={
            <Button asChild variant="outline" size="sm">
              <Link href="/proveedores">Volver a proveedores</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const a = analytics;
  const esConsignacion = proveedor.tipoProveedor === "CONSIGNACION";

  const resumenItems: ItemResumen[] = [];
  if (a) {
    resumenItems.push(
      {
        label: "Productos",
        valor: a.productos.cantidad,
        hint: `${a.productos.cantidadActivos} activos · inventario ${formatARS(a.productos.valorInventario)}`,
      },
      {
        label: "Total vendido",
        valor: formatARS(a.ventas.totalVendido),
        hint: `${a.ventas.cantidadVentas} ventas con sus productos`,
      }
    );
    if (esConsignacion && a.consignacion) {
      resumenItems.push(
        {
          label: "Deuda pendiente",
          valor: (
            <span className={a.consignacion.deudaPendiente > 0 ? "text-num-warning" : undefined}>
              {formatARS(a.consignacion.deudaPendiente)}
            </span>
          ),
          hint: "Por rendir al proveedor",
        },
        {
          label: "Total rendido",
          valor: formatARS(a.consignacion.totalRendido),
          hint: "Histórico pagado al proveedor",
        }
      );
    }
    if (!esConsignacion) {
      resumenItems.push({
        label: "Total comprado",
        valor: formatARS(a.compras.totalCompras),
        hint: `${a.compras.cantidadOrdenes} órdenes de compra`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <VolverAProveedores />

      <PageHeader
        overline="Mercadería · Proveedores"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {proveedor.nombre}
            <Badge variant="outline">{esConsignacion ? "Consignación" : "Regular"}</Badge>
          </span>
        }
        description={
          proveedor.telefono || proveedor.email
            ? [proveedor.telefono, proveedor.email].filter(Boolean).join(" · ")
            : undefined
        }
      >
        <Button
          variant="outline"
          onClick={() => setFormOpen(!formOpen)}
          aria-expanded={formOpen}
          aria-controls="proveedor-edicion"
        >
          {formOpen ? (
            <ChevronUp aria-hidden="true" className="text-muted-foreground" />
          ) : (
            <ChevronDown aria-hidden="true" className="text-muted-foreground" />
          )}
          {formOpen ? "Ocultar edición" : "Editar datos"}
        </Button>
      </PageHeader>

      {formOpen && (
        <div id="proveedor-edicion" className="max-w-3xl">
          <ProveedorForm
            defaultValues={proveedorToFormValues(proveedor)}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {!a ? (
        <EmptyState titulo="No se pudieron cargar las estadísticas" descripcion="Reintentá en unos segundos o revisá la conexión con la base." />
      ) : (
        <>
          <Resumen items={resumenItems} />

          <Panel>
            <PanelHeader
              title="Productos en dominio"
              descripcion={`${a.productos.lista.length} ${a.productos.lista.length === 1 ? "producto" : "productos"}`}
              acciones={
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/productos?proveedorId=${id}`}>Ver en productos</Link>
                </Button>
              }
            />
            {a.productos.lista.length === 0 ? (
              <EmptyState className="m-4 sm:m-5" titulo="Sin productos asignados" descripcion="Todavía no hay productos vinculados a este proveedor." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">P. venta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[80px]">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.productos.lista.map((p) => {
                    const tono = tonoStock(p.stockActual, p.stockMinimo);
                    return (
                      <TableRow
                        key={p.id}
                        className={p.activo ? undefined : "text-muted-foreground"}
                      >
                        <TableCell>
                          <span className="font-medium">{p.nombre}</span>
                          {!p.activo && (
                            <Badge variant="outline" className="ml-2 align-middle">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono tabular-nums",
                            claseTonoCifra[tono],
                            tono !== "neutro" && "font-semibold"
                          )}
                          title={
                            tono === "negativo"
                              ? "Sin stock"
                              : tono === "alerta"
                                ? `En o bajo el mínimo (${p.stockMinimo})`
                                : undefined
                          }
                        >
                          {p.stockActual}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatARS(p.precioVenta)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatARS(p.precioVenta * p.stockActual)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/productos/${p.id}/editar`}>Editar</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Ventas recientes"
                descripcion="Ventas que incluyen productos de este proveedor"
                acciones={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/ventas">Ver ventas</Link>
                  </Button>
                }
              />
              {a.ventasRecientes.length === 0 ? (
                <EmptyState className="m-4 sm:m-5" titulo="Sin ventas registradas" />
              ) : (
                <DataList className="rounded-none border-0">
                  {a.ventasRecientes.map((v) => (
                    <DataRow
                      key={v.id}
                      href={`/ventas/${v.id}`}
                      titulo={<span className="font-mono">{v.numeroVenta}</span>}
                      meta={new Date(v.fecha).toLocaleString("es-AR")}
                      valor={formatARS(v.total)}
                      valorHint={`sus productos ${formatARS(v.subtotalProveedor)}`}
                    />
                  ))}
                </DataList>
              )}
            </Panel>

            {esConsignacion && a.consignacion ? (
              <Panel>
                <PanelHeader
                  title="Rendiciones"
                  acciones={
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/consignacion/rendiciones/nueva?proveedorId=${id}`}>
                        Nueva rendición
                      </Link>
                    </Button>
                  }
                />
                {a.consignacion.rendiciones.length === 0 ? (
                  <EmptyState className="m-4 sm:m-5" titulo="Sin rendiciones" />
                ) : (
                  <DataList className="rounded-none border-0">
                    {a.consignacion.rendiciones.map((r) => (
                      <DataRow
                        key={r.id}
                        href={`/consignacion/rendiciones/${r.id}`}
                        titulo={<span className="font-mono">{r.numeroRendicion}</span>}
                        etiquetas={<Badge variant="outline">{r.estado}</Badge>}
                        meta={`${new Date(r.fechaDesde).toLocaleDateString("es-AR")} – ${new Date(r.fechaHasta).toLocaleDateString("es-AR")}`}
                        valor={formatARS(r.totalARendir)}
                        valorHint="a rendir"
                      />
                    ))}
                  </DataList>
                )}
              </Panel>
            ) : (
              <Panel>
                <PanelHeader
                  title="Órdenes de compra"
                  acciones={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/compras/nueva">Nueva orden</Link>
                    </Button>
                  }
                />
                {a.compras.ultimas.length === 0 ? (
                  <EmptyState className="m-4 sm:m-5" titulo="Sin órdenes de compra" />
                ) : (
                  <DataList className="rounded-none border-0">
                    {a.compras.ultimas.map((o) => (
                      <DataRow
                        key={o.id}
                        href={`/compras/${o.id}`}
                        titulo={<span className="font-mono">{o.numeroOrden}</span>}
                        meta={new Date(o.fecha).toLocaleDateString("es-AR")}
                        valor={formatARS(o.total)}
                      />
                    ))}
                  </DataList>
                )}
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
}
