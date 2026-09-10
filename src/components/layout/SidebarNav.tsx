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
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
              active
                ? "bg-primary/10 font-semibold text-primary"
                : "font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
            )}
            <Icon className={`size-4 shrink-0 ${active ? "opacity-100" : "opacity-80"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
