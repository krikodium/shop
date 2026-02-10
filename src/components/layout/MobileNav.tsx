"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserMenu } from "./UserMenu";

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
    (n) =>
      n.href !== href && n.href.startsWith(href) && pathname.startsWith(n.href)
  );
  return !hayMasEspecifico;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const nav = [...navBase, ...(isAdmin ? navAdmin : [])];

  const linkClass = (href: string) => {
    const active = isActive(pathname, href, nav);
    return `block rounded-lg px-4 py-3 text-base font-medium transition-colors touch-manipulation ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-accent"
    }`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="flex items-center justify-between">
            <span>Shop</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-1 overflow-auto p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-auto border-t pt-4">
            <UserMenu />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
