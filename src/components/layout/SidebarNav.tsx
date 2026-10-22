"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { gruposNav, isActive, navAdmin, navBase } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === "ADMIN";
  const grupos = gruposNav(esAdmin);
  const todos = [...navBase, ...(esAdmin ? navAdmin : [])];

  return (
    <nav className="flex flex-col gap-5">
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
            {grupo.titulo}
          </p>
          <div className="flex flex-col gap-0.5">
            {grupo.items.map((item) => {
              const activo = isActive(pathname, item.href, todos);
              const Icono = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors duration-[--dur-fast]",
                    activo
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <Icono
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      activo ? "text-foreground" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
