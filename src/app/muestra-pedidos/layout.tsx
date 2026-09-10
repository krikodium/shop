import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { DemoFlag } from "@/components/pedidos-demo/demo-ui";

const demoTheme = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0 0)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.145 0 0)",
  "--primary": "oklch(0.145 0 0)",
  "--primary-foreground": "oklch(0.985 0 0)",
  "--secondary": "oklch(0.97 0 0)",
  "--secondary-foreground": "oklch(0.205 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-foreground": "oklch(0.48 0 0)",
  "--accent": "oklch(0.94 0 0)",
  "--accent-foreground": "oklch(0.145 0 0)",
  "--border": "oklch(0.82 0 0)",
  "--input": "oklch(0.82 0 0)",
  "--ring": "oklch(0.32 0 0)",
  "--destructive": "oklch(0.2 0 0)",
} as CSSProperties;

export default function MuestraPedidosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-950" style={demoTheme}>
      <DemoFlag />
      <header className="sticky top-0 z-30 border-b border-zinc-300 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/muestra-pedidos/nueva-venta" className="mr-auto flex items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2">
            <span className="text-lg font-semibold tracking-tight">Shop</span>
            <span className="hidden text-xs uppercase tracking-[0.16em] text-zinc-500 sm:inline">Pedidos · muestra</span>
          </Link>
          <nav aria-label="Recorrido de la muestra" className="flex items-center gap-1 sm:gap-2">
            <Link href="/muestra-pedidos/nueva-venta" className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Nueva venta</span>
            </Link>
            <Link href="/muestra-pedidos/pedidos" className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
              <ClipboardList className="size-4" aria-hidden="true" />
              Pedidos
            </Link>
            <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Volver al sistema</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
