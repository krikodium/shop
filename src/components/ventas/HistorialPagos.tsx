"use client";

/**
 * Panel "Pagos" del detalle de venta: historial de cobros y acceso al alta.
 *
 * Todos los importes que se muestran vienen como `string` de la API; acá solo
 * se formatean. No se suma nada en el cliente.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { METODO_PAGO_LABEL } from "@/lib/constants";
import { formatARS } from "@/lib/formatCurrency";
import { RegistrarPagoDialog } from "@/components/ventas/RegistrarPagoDialog";
import {
  ESTADO_PAGO_LABEL,
  haySaldo,
  type EstadoHistorialPagos,
} from "@/components/ventas/usePagosVenta";

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function HistorialPagos({
  ventaId,
  historial,
}: {
  ventaId: string;
  historial: EstadoHistorialPagos;
}) {
  const { datos, cargando, error, refrescar } = historial;

  const puedeCobrar =
    datos != null && !datos.anulada && haySaldo(datos.saldoPendiente);

  const acciones = (
    <>
      {datos && (
        <Badge variant="outline">
          {ESTADO_PAGO_LABEL[datos.estadoPago] ?? datos.estadoPago}
        </Badge>
      )}
      {puedeCobrar && (
        <RegistrarPagoDialog
          ventaId={ventaId}
          total={datos.total}
          saldo={datos.saldoPendiente}
          onRegistrado={refrescar}
        />
      )}
    </>
  );

  return (
    <Panel>
      <PanelHeader
        title="Pagos"
        descripcion="Cobros imputados a esta venta."
        acciones={acciones}
      />
      <PanelBody>
        {cargando && !datos ? (
          <div className="space-y-2" aria-busy="true">
            <div className="h-14 animate-skeleton-shimmer rounded-md" />
            <div className="h-14 animate-skeleton-shimmer rounded-md" />
          </div>
        ) : error ? (
          <EmptyState
            titulo="No se pudo cargar el historial de cobros"
            descripcion={error}
            accion={
              <Button variant="outline" size="sm" onClick={() => void refrescar()}>
                Reintentar
              </Button>
            }
          />
        ) : !datos || datos.pagos.length === 0 ? (
          <EmptyState
            titulo="Sin cobros registrados"
            descripcion="Cuando registres una seña o el saldo, los cobros aparecen acá."
          />
        ) : (
          <DataList>
            {datos.pagos.map((p) => (
              <DataRow
                key={p.id}
                titulo={METODO_PAGO_LABEL[p.metodoPago] ?? p.metodoPago}
                meta={
                  <>
                    {fechaCorta(p.fecha)}
                    {p.registradoPor ? ` · ${p.registradoPor}` : ""}
                    {p.notas && (
                      <span className="mt-1 block font-sans text-xs text-muted-foreground">
                        {p.notas}
                      </span>
                    )}
                  </>
                }
                valor={formatARS(Number(p.montoArs))}
                valorHint={
                  p.montoUsd
                    ? `${p.montoUsd} USD${p.cotizacionUsd ? ` · 1 USD = ${p.cotizacionUsd}` : ""}`
                    : undefined
                }
              />
            ))}
          </DataList>
        )}
      </PanelBody>
    </Panel>
  );
}
