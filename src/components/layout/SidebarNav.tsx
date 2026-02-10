"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const navBase = [
  { href: "/", label: "Dashboard" },
  { href: "/ventas/nueva", label: "Nueva venta" },
  { href: "/ventas", label: "Ventas" },
  { href: "/productos", label: "Productos" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/consignacion", label: "Consignación" },
  { href: "/consignacion/rendiciones", label: "Rendiciones" },
  { href: "/clientes", label: "Clientes" },
  { href: "/compras", label: "Compras" },
  { href: "/caja-chica", label: "Caja chica" },
  { href: "/reportes", label: "Reportes" },
  { href: "/ayuda", label: "Ayuda" },
];

const navAdmin = [
  { href: "/usuarios", label: "Usuarios" },
  { href: "/estadisticas-vendedores", label: "Estadísticas vendedores" },
];

function isActive(pathname: string, href: string, allNav: { href: string }[]) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  const hayMasEspecifico = allNav.some(
    (n) => n.href !== href && n.href.startsWith(href) && pathname.startsWith(n.href)
  );
  return !hayMasEspecifico;
}

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const nav = [...navBase, ...(isAdmin ? navAdmin : [])];

  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = isActive(pathname, item.href, nav);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
