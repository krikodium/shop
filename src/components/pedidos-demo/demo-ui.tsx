import type { ReactNode } from "react";
import { AlertTriangle, FlaskConical, Mail } from "lucide-react";
import type { EstadoPagoDemo, EstadoProductoDemo, MonedaDemo } from "@/lib/pedidos-demo";
import { cn } from "@/lib/utils";

export function formatImporteDemo(centavos: number, moneda: MonedaDemo = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
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
        "inline-flex min-h-7 items-center rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800",
        className
      )}
    >
      {children}
    </span>
  );
}

export function EstadoPagoBadge({ estado }: { estado: EstadoPagoDemo }) {
  return (
    <DemoBadge className={estado === "Pagado" ? "border-zinc-950 bg-zinc-950 text-white" : undefined}>
      Pago: {estado}
    </DemoBadge>
  );
}

export function EstadoProductoBadge({ estado }: { estado: EstadoProductoDemo }) {
  return <DemoBadge>Producto: {estado}</DemoBadge>;
}

export function DemoFlag() {
  return (
    <div className="flex items-start gap-2 border-b border-zinc-300 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-800 sm:px-6">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <strong>Modo muestra.</strong> Todos los nombres, productos, pagos y movimientos son ficticios.
        Nada se guarda ni modifica stock o caja.
      </p>
    </div>
  );
}

export function DecisionPendiente() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-zinc-400 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold text-zinc-950">Supuesto provisional: precio fijo</p>
        <p>
          La muestra conserva el precio acordado al crear el pedido. Siguen pendientes las reglas de
          ajuste de precio, entrega con saldo y rendición de encargos.
        </p>
      </div>
    </div>
  );
}

export function CorreoPendiente() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-300 bg-white p-4 text-sm leading-6">
      <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Correo pendiente de configuración</p>
        <p className="text-zinc-600">Los avisos están deshabilitados. Esta muestra no envía mensajes.</p>
      </div>
    </div>
  );
}

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
    <section className={cn("rounded-xl border border-zinc-300 bg-white", className)}>
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

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
    <dl className={cn("grid overflow-hidden rounded-xl border border-zinc-300 bg-white", !apilado && "sm:grid-cols-3")}>
      {[
        ["Total", totalCentavos],
        [cobradoLabel, cobradoCentavos],
        ["Saldo pendiente", saldoCentavos],
      ].map(([label, importe], index) => (
        <div
          key={String(label)}
          className={cn(
            "px-4 py-4",
            index > 0 && "border-t border-zinc-200",
            index > 0 && !apilado && "sm:border-l sm:border-t-0",
            index === 2 && "bg-zinc-950 text-white"
          )}
        >
          <dt className={cn("text-xs font-medium uppercase tracking-wider", index === 2 ? "text-zinc-300" : "text-zinc-500")}>{label}</dt>
          <dd className="mt-2 font-mono text-xl font-semibold tabular-nums sm:text-2xl">
            {formatImporteDemo(Number(importe))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DemoSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando datos ficticios" className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid min-h-16 grid-cols-[1fr_7rem] gap-4 rounded-lg border border-zinc-200 p-4">
          <div className="space-y-2">
            <div className="h-4 w-40 animate-skeleton-shimmer rounded bg-zinc-200" />
            <div className="h-3 w-2/3 animate-skeleton-shimmer rounded bg-zinc-100" />
          </div>
          <div className="h-8 animate-skeleton-shimmer rounded bg-zinc-100" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
