"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { navMobile, isActive } from "@/lib/nav-config";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = navMobile;

  const linkClass = (href: string) => {
    const active = isActive(pathname, href, nav);
    return `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors touch-manipulation ${
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
      <SheetContent side="left" className="flex w-[300px] flex-col p-0 sm:w-[320px]" showCloseButton={false}>
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="flex items-center justify-between">
            <span className="font-semibold text-lg">Shop</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar menú">
              <X className="size-5" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-auto p-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-5 shrink-0 opacity-90" />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-6 border-t pt-4">
            <UserMenu />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
