import type { ReactNode } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";

/**
 * Marco común de las pantallas de acceso (login, recuperar y definir
 * contraseña): fondo liso, columna angosta centrada, la marca con el mismo
 * tratamiento que el sidebar y el formulario en un Panel plano.
 */
export function MarcoAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
            Gestión
          </span>
          <span className="mt-0.5 block text-lg font-semibold tracking-tight">Shop</span>
        </div>
        <Panel>
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h1 className="text-sm font-semibold tracking-tight">{titulo}</h1>
            {descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}
          </div>
          <PanelBody>{children}</PanelBody>
        </Panel>
      </div>
    </main>
  );
}

/** Relleno del Suspense mientras se leen los parámetros de la URL. */
export function MarcoAccesoCargando({ titulo }: { titulo: string }) {
  return (
    <MarcoAcceso titulo={titulo} descripcion="Cargando…">
      <div className="space-y-4" aria-hidden="true">
        <div className="h-10 animate-skeleton-shimmer rounded-md" />
        <div className="h-10 animate-skeleton-shimmer rounded-md" />
        <div className="h-9 animate-skeleton-shimmer rounded-md" />
      </div>
    </MarcoAcceso>
  );
}
