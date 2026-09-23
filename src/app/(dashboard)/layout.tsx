import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileNav } from "@/components/layout/MobileNav";

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
    <div className="flex h-screen overflow-hidden flex-col lg:flex-row">
      {/* Header móvil: no scrollea, no tapa el contenido (el main es el que scrollea). */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2 lg:hidden">
        <MobileNav />
        <Link
          href="/"
          className="mr-auto min-w-0 truncate rounded-sm text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Shop
        </Link>
        <Button asChild className="shrink-0">
          <Link href="/ventas/nueva">
            <Plus aria-hidden="true" />
            Venta
          </Link>
        </Button>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-5 py-5">
          <Link
            href="/"
            className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
              Gestión
            </span>
            <span className="mt-0.5 block text-lg font-semibold tracking-tight">Shop</span>
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
            <div className="min-w-0 flex-1">
              <UserMenu />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">{children}</main>
    </div>
  );
}
