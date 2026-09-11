import { cn } from "@/lib/utils";

/**
 * Único indicador de carga de la app. Hereda el color del texto,
 * así que sirve sobre cualquier variante de botón.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      data-slot="spinner"
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full",
        "border-2 border-current/25 border-t-current",
        "motion-reduce:animate-none",
        className
      )}
    />
  );
}
