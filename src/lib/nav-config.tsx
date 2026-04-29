import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Truck,
  FileStack,
  FileCheck,
  Users,
  ShoppingBag,
  Wallet,
  BarChart3,
  HelpCircle,
  UserCog,
  TrendingUp,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navBase: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas/nueva", label: "Nueva venta", icon: ShoppingCart },
  { href: "/ventas", label: "Ventas", icon: Receipt },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/consignacion", label: "Consignación", icon: FileStack },
  { href: "/consignacion/rendiciones", label: "Rendiciones", icon: FileCheck },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/caja-chica", label: "Caja chica", icon: Wallet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/ayuda", label: "Ayuda", icon: HelpCircle },
];

export const navAdmin: NavItem[] = [
  { href: "/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/estadisticas-vendedores", label: "Estadísticas vendedores", icon: TrendingUp },
];

/** Menú reducido solo para el sheet móvil (hamburguesa). Escritorio sigue usando navBase + navAdmin. */
export const navMobile: NavItem[] = [
  { href: "/productos", label: "Inventario", icon: Package },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/ventas/nueva", label: "Venta rápida", icon: ShoppingCart },
];

export function isActive(pathname: string, href: string, allNav: { href: string }[]) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  const hayMasEspecifico = allNav.some(
    (n) => n.href !== href && n.href.startsWith(href) && pathname.startsWith(n.href)
  );
  return !hayMasEspecifico;
}
