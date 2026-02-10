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
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <MobileNav />
        <Link href="/" className="font-semibold text-lg">
          Shop
        </Link>
        <Link
          href="/ventas/nueva"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Venta
        </Link>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex">
        <Link href="/" className="mb-6 block font-semibold text-lg">
          Shop
        </Link>
        <SidebarNav />
        <div className="mt-auto pt-4 border-t border-border">
          <UserMenu />
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
