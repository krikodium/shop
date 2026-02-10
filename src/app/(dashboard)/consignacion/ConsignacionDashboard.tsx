"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DeudaProveedor } from "@/app/api/consignacion/deudas/route";

export function ConsignacionDashboard() {
  const [deudas, setDeudas] = useState<DeudaProveedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consignacion/deudas")
      .then((res) => res.json())
      .then((data) => setDeudas(Array.isArray(data) ? data : []))
      .catch(() => setDeudas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (deudas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No hay proveedores de consignación.</p>
          <p className="mt-2 text-sm">
            Creá un proveedor con tipo &quot;Consignación&quot; y asignale productos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {deudas.map((d) => (
        <Card
          key={d.proveedorId}
          className={
            d.deudaPendiente > 0
              ? "border-amber-200 dark:border-amber-900"
              : undefined
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{d.proveedorNombre}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Deuda pendiente</p>
              <p
                className={`text-2xl font-bold ${
                  d.deudaPendiente > 0 ? "text-amber-600" : "text-muted-foreground"
                }`}
              >
                ${d.deudaPendiente.toFixed(2)}
              </p>
            </div>
            {d.ultimaRendicion && (
              <p className="text-xs text-muted-foreground">
                Última rendición hasta:{" "}
                {new Date(d.ultimaRendicion.fechaHasta).toLocaleDateString()}
              </p>
            )}
            <Link href={`/consignacion/rendiciones/nueva?proveedorId=${d.proveedorId}`}>
              <Button
                variant={d.deudaPendiente > 0 ? "default" : "outline"}
                size="sm"
                className="w-full"
              >
                Generar rendición
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
