import type { ReactNode } from "react";
import { AlertTriangle, FlaskConical, Mail } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Resumen } from "@/components/ui/resumen";
import type { EstadoPagoDemo, EstadoProductoDemo, MonedaDemo } from "@/lib/pedidos-demo";
import { formatARS, formatUSD } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

/** Los importes de la muestra viajan en centavos enteros; acá solo se formatean. */
export function formatImporteDemo(centavos: number, moneda: MonedaDemo = "ARS") {
  const importe = centavos / 100;
  // Hoy la muestra solo maneja ARS; si algún día suma USD, ya formatea con su moneda.
  return moneda === "ARS" ? formatARS(importe) : formatUSD(importe);
}

export function formatFechaDemo(fecha: string, incluirHora = false) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    ...(incluirHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  }).formatToParts(new Date(fecha));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  const fechaCorta = `${valor("day")} ${meses[Number.parseInt(valor("month"), 10) - 1]}`;
  return incluirHora ? `${fechaCorta}, ${valor("hour")}:${valor("minute")}` : fechaCorta;
}

export function DemoBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** "Pagado" se distingue con borde fuerte y peso, sin fondo lleno. */
export function EstadoPagoBadge({ estado }: { estado: EstadoPagoDemo }) {
  return (
    <DemoBadge className={estado === "Pagado" ? "border-border-strong font-semibold" : "text-muted-foreground"}>
      Pago: {estado}
    </DemoBadge>
  );
}

export function EstadoProductoBadge({ estado }: { estado: EstadoProductoDemo }) {
  return <DemoBadge>Producto: {estado}</DemoBadge>;
}

export function DemoFlag() {
  return (
    <div className="flex items-start gap-2 border-b border-border bg-surface px-4 py-2.5 text-sm sm:px-6">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p>
        <strong>Modo muestra.</strong> Todos los nombres, productos, pagos y movimientos son ficticios.
        Nada se guarda ni modifica stock o caja.
      </p>
    </div>
  );
}

export function DecisionPendiente() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-strong p-4 text-sm leading-6">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-semibold">Supuesto provisional: precio fijo</p>
        <p className="text-muted-foreground">
          La muestra conserva el precio acordado al crear el pedido. Siguen pendientes las reglas de
          ajuste de precio, entrega con saldo y rendición de encargos.
        </p>
      </div>
    </div>
  );
}

export function CorreoPendiente() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-6">
      <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-semibold">Correo pendiente de configuración</p>
        <p className="text-muted-foreground">Los avisos están deshabilitados. Esta muestra no envía mensajes.</p>
      </div>
    </div>
  );
}

/** Envoltorio fino de Panel para las secciones de la muestra. */
export function DemoSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader title={title} descripcion={description} acciones={action} />
      <PanelBody>{children}</PanelBody>
    </Panel>
  );
}

/**
 * Total, cobrado y saldo. Las tres celdas son planas (antes el saldo iba
 * invertido en negro: en tema oscuro era una plancha blanca). El saldo sale de
 * los mismos centavos que ya maneja la muestra; no hay plata real acá.
 */
export function ResumenImportes({
  totalCentavos,
  cobradoCentavos,
  cobradoLabel = "Importe cobrado",
  apilado = false,
}: {
  totalCentavos: number;
  cobradoCentavos: number;
  cobradoLabel?: string;
  apilado?: boolean;
}) {
  const saldoCentavos = Math.max(0, totalCentavos - cobradoCentavos);

  return (
    <Resumen
      className={apilado ? "sm:grid-cols-1" : undefined}
      items={[
        { label: "Total", valor: formatImporteDemo(totalCentavos) },
        { label: cobradoLabel, valor: formatImporteDemo(cobradoCentavos) },
        { label: "Saldo pendiente", valor: formatImporteDemo(saldoCentavos) },
      ]}
    />
  );
}

export function DemoSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando datos ficticios" className="divide-y divide-border overflow-hidden rounded-lg border border-border" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid min-h-16 grid-cols-[1fr_7rem] gap-4 p-4">
          <div className="space-y-2">
            <div className="h-4 w-40 animate-skeleton-shimmer rounded" />
            <div className="h-3 w-2/3 animate-skeleton-shimmer rounded" />
          </div>
          <div className="h-8 animate-skeleton-shimmer rounded" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
