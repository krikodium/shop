"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RendicionPDFDownload } from "@/components/pdf/RendicionPDFDownload";

interface DetalleItem {
  ventaId: string;
  productoNombre: string;
  productoSku: string;
  cantidad: number;
  precioVenta: number;
  totalVenta: number;
  comisionShop: number | null;
  montoProveedor: number;
}

interface RendicionDetalle {
  id: string;
  numeroRendicion: string;
  fechaRendicion: string;
  fechaDesde: string;
  fechaHasta: string;
  totalVendido: number;
  comisionShop: number;
  totalARendir: number;
  estado: string;
  metodoPago: string | null;
  fechaPago: string | null;
  detalleItems: DetalleItem[];
  proveedor: { nombre: string };
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA_DEBITO", label: "Tarjeta débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta crédito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "MERCADOPAGO", label: "Mercado Pago" },
  { value: "MULTIPLE", label: "Múltiple" },
];

export default function RendicionDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [rendicion, setRendicion] = useState<RendicionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [marcandoPago, setMarcandoPago] = useState(false);

  useEffect(() => {
    fetch(`/api/consignacion/rendiciones/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrada");
        return res.json();
      })
      .then((r) => {
        setRendicion({
          ...r,
          totalVendido: Number(r.totalVendido ?? 0),
          comisionShop: Number(r.comisionShop ?? 0),
          totalARendir: Number(r.totalARendir ?? 0),
          detalleItems: Array.isArray(r.detalleItems) ? r.detalleItems : [],
        });
        setMetodoPago(r.metodoPago ?? "EFECTIVO");
      })
      .catch(() => setRendicion(null))
      .finally(() => setLoading(false));
  }, [id]);

  const marcarComoPagada = async () => {
    if (!rendicion) return;
    setMarcandoPago(true);
    try {
      const res = await fetch(`/api/consignacion/rendiciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "PAGADO",
          metodoPago,
          fechaPago: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Error");
      const updated = await res.json();
      setRendicion({
        ...updated,
        totalVendido: Number(updated.totalVendido ?? 0),
        comisionShop: Number(updated.comisionShop ?? 0),
        totalARendir: Number(updated.totalARendir ?? 0),
        detalleItems: Array.isArray(updated.detalleItems) ? updated.detalleItems : [],
      });
    } catch {
      setMarcandoPago(false);
    } finally {
      setMarcandoPago(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!rendicion) {
    return (
      <div className="space-y-4">
        <p>Rendición no encontrada.</p>
        <Link href="/consignacion/rendiciones">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    );
  }

  const items = rendicion.detalleItems as DetalleItem[];

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/consignacion/rendiciones">
          <Button variant="ghost">← Rendiciones</Button>
        </Link>
        <div className="flex gap-2">
          {rendicion.estado === "PENDIENTE" && (
            <>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={marcarComoPagada}
                disabled={marcandoPago}
              >
                {marcandoPago ? "..." : "Marcar como pagada"}
              </Button>
            </>
          )}
          <RendicionPDFDownload
            numeroRendicion={rendicion.numeroRendicion}
            proveedorNombre={rendicion.proveedor?.nombre ?? ""}
            fechaDesde={rendicion.fechaDesde}
            fechaHasta={rendicion.fechaHasta}
            totalVendido={rendicion.totalVendido}
            comisionShop={rendicion.comisionShop}
            totalARendir={rendicion.totalARendir}
            estado={rendicion.estado}
            items={items}
          />
          <Button variant="outline" onClick={imprimir}>
            Imprimir
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">Rendición {rendicion.numeroRendicion}</h1>
          <p className="text-muted-foreground">
            {rendicion.proveedor?.nombre} •{" "}
            {new Date(rendicion.fechaDesde).toLocaleDateString()} -{" "}
            {new Date(rendicion.fechaHasta).toLocaleDateString()}
          </p>
          <Badge className="mt-2">{rendicion.estado}</Badge>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 print:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total vendido</p>
            <p className="text-xl font-bold">${rendicion.totalVendido.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Comisión shop</p>
            <p className="text-xl font-bold text-green-600">
              ${rendicion.comisionShop.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">A rendir al proveedor</p>
            <p className="text-xl font-bold text-amber-600">
              ${rendicion.totalARendir.toFixed(2)}
            </p>
          </div>
        </div>

        {rendicion.estado === "PAGADO" && rendicion.fechaPago && (
          <p className="mt-4 text-sm text-muted-foreground">
            Pagada el {new Date(rendicion.fechaPago).toLocaleString()}
            {rendicion.metodoPago && ` • ${METODOS_PAGO.find((m) => m.value === rendicion.metodoPago)?.label ?? rendicion.metodoPago}`}
          </p>
        )}

        <div className="mt-6">
          <h2 className="mb-3 font-semibold">Detalle de items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Producto</th>
                <th className="py-2 text-right">Cant.</th>
                <th className="py-2 text-right">P. venta</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">A proveedor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{item.productoNombre}</td>
                  <td className="py-2 text-right">{item.cantidad}</td>
                  <td className="py-2 text-right">
                    ${(item.precioVenta ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    ${(item.totalVenta ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    ${(item.montoProveedor ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
