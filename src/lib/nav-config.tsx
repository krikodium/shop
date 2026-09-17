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
  ClipboardList,
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
  { href: "/muestra-pedidos/nueva-venta", label: "Muestra pedidos", icon: ClipboardList },
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
  { href: "/muestra-pedidos/nueva-venta", label: "Muestra pedidos", icon: ClipboardList },
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

export type GrupoNav = {
  titulo: string;
  items: NavItem[];
};

const buscar = (href: string): NavItem => {
  const item = [...navBase, ...navAdmin].find((n) => n.href === href);
  if (!item) throw new Error(`nav-config: no existe el ítem ${href}`);
  return item;
};

/** Navegación agrupada por sección de negocio. Ver docs/mapa-app.md §5. */
export function gruposNav(esAdmin: boolean): GrupoNav[] {
  return [
    {
      titulo: "Operación",
      items: [
        buscar("/"),
        buscar("/ventas/nueva"),
        buscar("/ventas"),
        buscar("/muestra-pedidos/nueva-venta"),
        buscar("/clientes"),
      ],
    },
    {
      titulo: "Mercadería",
      items: [
        buscar("/productos"),
        buscar("/proveedores"),
        buscar("/consignacion"),
        buscar("/consignacion/rendiciones"),
        buscar("/compras"),
      ],
    },
    {
      titulo: "Administración",
      items: [
        buscar("/caja-chica"),
        buscar("/reportes"),
        ...(esAdmin ? [buscar("/usuarios"), buscar("/estadisticas-vendedores")] : []),
        buscar("/ayuda"),
      ],
    },
  ];
}
