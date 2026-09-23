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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { gruposNav, isActive, navAdmin, navBase } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

/**
 * Hamburguesa del celular. Muestra los MISMOS tres grupos que el sidebar de
 * escritorio (Operación / Mercadería / Administración): en el local el teléfono
 * es la única vía de acceso, así que no puede quedar un menú recortado.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === "ADMIN";
  const grupos = gruposNav(esAdmin);
  const todos = [...navBase, ...(esAdmin ? navAdmin : [])];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Abrir menú">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[17.5rem] max-w-[85vw] flex-col p-0 sm:w-80"
        showCloseButton={false}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold tracking-tight">Shop</SheetTitle>
              <SheetDescription className="sr-only">
                Navegación principal del sistema
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
          {grupos.map((grupo) => (
            <div key={grupo.titulo}>
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 touch-manipulation items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        activo
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <Icono className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  );
}
