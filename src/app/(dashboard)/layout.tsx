import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import { ForzarCambioPasswordDialog } from "@/components/layout/ForzarCambioPasswordDialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-background lg:flex-row">
      {/* Forzar cambio de clave si el usuario ingresa por primera vez o con clave default */}
      {session.user.debeCambiarPassword && (
        <ForzarCambioPasswordDialog
          open={true}
          userEmail={session.user.email}
        />
      )}

      {/* Header móvil: no scrollea, no tapa el contenido (el main es el que scrollea). */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border bg-card px-3.5 py-2.5 lg:hidden">
        <MobileNav />
        <Link
          href="/"
          className="mr-auto flex min-w-0 items-center gap-2 truncate rounded-sm text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-foreground font-mono text-[10px] font-bold text-background">
            HC
          </span>
          <span className="truncate">Shop</span>
        </Link>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/ventas/nueva">
            <Plus aria-hidden="true" />
            Venta
          </Link>
        </Button>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-strong bg-foreground font-mono text-xs font-semibold tracking-tighter text-background">
              HC
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Gestión
              </span>
              <span className="block truncate text-base font-semibold leading-tight tracking-tight">
                Shop
              </span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3.5 py-4">
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            <SidebarNav />
          </div>
          <div className="mt-auto border-t border-sidebar-border pt-3.5">
            <UserMenu />
          </div>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
