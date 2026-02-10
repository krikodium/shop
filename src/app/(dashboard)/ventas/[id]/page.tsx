"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GuardarDatosCliente } from "@/components/ventas/GuardarDatosCliente";

interface VentaDetalle {
  id: string;
  numeroVenta: string;
  fecha: string;
  subtotal: number;
  descuento: number;
  total: number;
  costoTotal: number;
  gananciaBruta: number;
  margenPorcentaje: number;
  deudaConsignacion: number;
  metodoPago: string;
  items: Array<{
    productoNombre: string;
    productoSku: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    esConsignacion: boolean;
  }>;
  cliente?: { nombre: string; email?: string | null; telefono?: string | null; dni?: string | null } | null;
  clienteNombre?: string | null;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_DEBITO: "Tarjeta débito",
  TARJETA_CREDITO: "Tarjeta crédito",
  TRANSFERENCIA: "Transferencia",
  MERCADOPAGO: "Mercado Pago",
  MULTIPLE: "Múltiple",
};

export default function VentaDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [venta, setVenta] = useState<VentaDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ventas/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrada");
        return res.json();
      })
      .then((v) => {
        setVenta({
          ...v,
          subtotal: Number(v.subtotal),
          descuento: Number(v.descuento),
          total: Number(v.total),
          costoTotal: Number(v.costoTotal),
          gananciaBruta: Number(v.gananciaBruta),
          margenPorcentaje: Number(v.margenPorcentaje),
          deudaConsignacion: Number(v.deudaConsignacion),
          items: (v.items || []).map((i: { precioUnitario: unknown; subtotal: unknown }) => ({
            ...i,
            precioUnitario: Number(i.precioUnitario),
            subtotal: Number(i.subtotal),
          })),
        });
      })
      .catch(() => setVenta(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!venta) {
    return (
      <div className="space-y-4">
        <p>Venta no encontrada.</p>
        <Link href="/ventas">
          <Button variant="outline">Volver a ventas</Button>
        </Link>
      </div>
    );
  }

  const clienteNombre = venta.cliente?.nombre ?? venta.clienteNombre ?? "Sin cliente";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ventas">
            <Button variant="ghost">← Ventas</Button>
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Venta {venta.numeroVenta}</h1>
        </div>
        <Link href="/ventas/nueva">
          <Button>Nueva venta</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">Fecha:</span>{" "}
              {new Date(venta.fecha).toLocaleString()}
            </p>
            <p>
              <span className="text-muted-foreground">Cliente:</span> {clienteNombre}
            </p>
            <p>
              <span className="text-muted-foreground">Método de pago:</span>{" "}
              {METODO_LABEL[venta.metodoPago] ?? venta.metodoPago}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Totales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${venta.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Descuento</span>
              <span>${venta.descuento.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>${venta.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Ganancia</span>
              <span>${venta.gananciaBruta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Margen</span>
              <span>{venta.margenPorcentaje.toFixed(1)}%</span>
            </div>
            {venta.deudaConsignacion > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Deuda consignación</span>
                <span>${venta.deudaConsignacion.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GuardarDatosCliente
        ventaId={id}
        clienteActual={venta.cliente}
        clienteNombre={venta.clienteNombre}
        onGuardado={() => {
          fetch(`/api/ventas/${id}`)
            .then((res) => res.json())
            .then((v) =>
              setVenta((prev) =>
                prev ? { ...prev, cliente: v.cliente, clienteNombre: v.clienteNombre } : prev
              )
            );
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Producto</th>
                <th className="py-2 text-right">Cant.</th>
                <th className="py-2 text-right">P. unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venta.items.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">
                    {item.productoNombre}
                    {item.esConsignacion && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Consig.
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 text-right">{item.cantidad}</td>
                  <td className="py-2 text-right">
                    ${item.precioUnitario.toFixed(2)}
                  </td>
                  <td className="py-2 text-right">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
