import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { DemoFlag } from "@/components/pedidos-demo/demo-ui";

// Sin tema propio: la muestra usa los tokens globales, así funciona igual en claro y oscuro.
const claseNav =
  "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function MuestraPedidosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DemoFlag />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/muestra-pedidos/nueva-venta"
            className="mr-auto flex items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="text-lg font-semibold tracking-tight">Shop</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              Pedidos · muestra
            </span>
          </Link>
          <nav aria-label="Recorrido de la muestra" className="flex items-center gap-1 sm:gap-2">
            <Link href="/muestra-pedidos/nueva-venta" className={claseNav}>
              <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="hidden sm:inline">Nueva venta</span>
            </Link>
            <Link href="/muestra-pedidos/pedidos" className={claseNav}>
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
              Pedidos
            </Link>
            <Link href="/" className={`${claseNav} border border-border`}>
              <ArrowLeft className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="hidden sm:inline">Volver al sistema</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
