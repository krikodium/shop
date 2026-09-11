import type { ReactNode } from "react";
import { Figure, FigureGrid, type TonoCifra } from "@/components/ui/figure";

/**
 * Compatibilidad con el sistema "libro mayor" anterior.
 * Código nuevo: usá Figure y FigureGrid directamente.
 */

type ToneViejo = "default" | "positive" | "warning" | "muted";

const mapaTono: Record<ToneViejo, TonoCifra> = {
  default: "neutro",
  positive: "positivo",
  warning: "alerta",
  muted: "neutro",
};

export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <FigureGrid columnas={4} className={className}>
      {children}
    </FigureGrid>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: ToneViejo;
  /** Ya no se usa: el punto de acento se eliminó del sistema. */
  accent?: boolean;
  className?: string;
}) {
  return (
    <Figure
      label={label}
      valor={value}
      hint={hint}
      tono={mapaTono[tone]}
      className={className}
    />
  );
}
