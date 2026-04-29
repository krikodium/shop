import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { SidebarNav } from "@/components/layout/SidebarNav";
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Header móvil */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm lg:hidden">
        <MobileNav />
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Shop
        </Link>
        <Link
          href="/ventas/nueva"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          + Venta
        </Link>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-5 py-5">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            Shop
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="mt-auto border-t border-border pt-4">
            <UserMenu />
          </div>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
