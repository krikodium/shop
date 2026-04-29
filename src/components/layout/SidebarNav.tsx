"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { navBase, navAdmin, isActive } from "@/lib/nav-config";

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const nav = [...navBase, ...(isAdmin ? navAdmin : [])];

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(pathname, item.href, nav);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0 opacity-90" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
