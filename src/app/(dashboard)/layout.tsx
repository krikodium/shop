import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { UserMenu } from "@/components/layout/UserMenu";

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
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-card p-4 flex flex-col">
        <Link href="/" className="mb-6 block font-semibold text-lg">
          Shop
        </Link>
        <SidebarNav />
        <div className="mt-auto pt-4 border-t border-border">
          <UserMenu />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
