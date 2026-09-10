import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  BookOpen,
  ShoppingCart,
  Receipt,
  Package,
  Truck,
  FileStack,
  Users,
  ShoppingBag,
  Wallet,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const modulos = [
  {
    titulo: "Ventas",
    descripcion:
      "Registrá ventas, aplicá descuentos y trabajá con pagos simples o divididos (incluyendo USD).",
    href: "/ventas",
    cta: "Ir a ventas",
    icon: Receipt,
    pasos: [
      "Creá una venta desde “Nueva venta”.",
      "Agregá productos por nombre o SKU.",
      "Elegí cliente (o sin cliente) y método de pago.",
      "Confirmá y revisá detalle/ticket en el historial.",
    ],
  },
  {
    titulo: "Productos e inventario",
    descripcion:
      "Gestioná catálogo, stock y precios. Podés cargar productos con proveedor único o desglose por partes.",
    href: "/productos",
    cta: "Ir a productos",
    icon: Package,
    pasos: [
      "Creá productos con precio de compra/venta.",
      "Definí stock actual y stock mínimo.",
      "Si aplica, usá consignación o partes por proveedor.",
      "Monitoreá alertas de bajo stock desde dashboard/reportes.",
    ],
  },
  {
    titulo: "Proveedores y consignación",
    descripcion:
      "Administrá proveedores regulares o de consignación y generá rendiciones pendientes.",
    href: "/consignacion",
    cta: "Ir a consignación",
    icon: FileStack,
    pasos: [
      "Configurá proveedor como regular o consignación.",
      "Controlá deuda pendiente por proveedor.",
      "Generá rendición y descargá documento PDF.",
      "Las ventas rendidas no vuelven a aparecer pendientes.",
    ],
  },
  {
    titulo: "Compras",
    descripcion:
      "Creá órdenes de compra, seguí estados y recepcioná mercadería para actualizar stock.",
    href: "/compras",
    cta: "Ir a compras",
    icon: ShoppingBag,
    pasos: [
      "Generá orden desde “Compras > Nueva orden”.",
      "Cargá ítems y proveedor.",
      "Recepcioná total/parcial en el detalle de la orden.",
      "El stock se ajusta automáticamente.",
    ],
  },
  {
    titulo: "Clientes",
    descripcion:
      "Guardá clientes para historial comercial, CRM básico y seguimiento de compras.",
    href: "/clientes",
    cta: "Ir a clientes",
    icon: Users,
    pasos: [
      "Alta manual o desde flujo de venta.",
      "Consultá datos y comportamiento de compra.",
      "Actualizá información de contacto cuando sea necesario.",
    ],
  },
  {
    titulo: "Reportes",
    descripcion:
      "Analizá ventas, inventario y rentabilidad con filtros; exportá en CSV y PDF.",
    href: "/reportes",
    cta: "Ir a reportes",
    icon: BarChart3,
    pasos: [
      "Elegí rango de fechas o presets rápidos.",
      "Aplicá filtros por método de pago, proveedor y categoría.",
      "Activá comparación con período anterior.",
      "Exportá resultados en CSV o PDF.",
    ],
  },
];

const accesosRapidos = [
  { href: "/", label: "Inicio", icon: ShoppingCart },
  { href: "/ventas/nueva", label: "Nueva venta", icon: ShoppingCart },
  { href: "/productos/nuevo", label: "Nuevo producto", icon: Package },
  { href: "/proveedores/nuevo", label: "Nuevo proveedor", icon: Truck },
  { href: "/consignacion/rendiciones/nueva", label: "Nueva rendición", icon: FileStack },
  { href: "/caja-chica", label: "Caja chica", icon: Wallet },
];

export default function AyudaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Soporte · Documentación"
        title="Centro de ayuda"
        description="Guía práctica del sistema: configuración inicial, flujo de trabajo y accesos rápidos."
      >
        <Badge variant="secondary">Guía operativa</Badge>
        <Badge variant="outline">Actualizado</Badge>
      </PageHeader>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Inicio rápido (primera vez)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-semibold">1. Cargá proveedores</p>
            <p className="mt-1 text-muted-foreground">Definí tipo regular o consignación.</p>
            <Link href="/proveedores/nuevo" className="mt-2 inline-flex text-primary hover:underline">
              Ir a proveedores
            </Link>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-semibold">2. Cargá productos</p>
            <p className="mt-1 text-muted-foreground">Precio, stock y vínculo con proveedor.</p>
            <Link href="/productos/nuevo" className="mt-2 inline-flex text-primary hover:underline">
              Ir a productos
            </Link>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-semibold">3. Registrá una venta</p>
            <p className="mt-1 text-muted-foreground">Carrito, cliente y método de pago.</p>
            <Link href="/ventas/nueva" className="mt-2 inline-flex text-primary hover:underline">
              Ir a nueva venta
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {modulos.map((modulo) => (
          <Card key={modulo.titulo} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <modulo.icon className="h-4 w-4 text-primary" />
                {modulo.titulo}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{modulo.descripcion}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {modulo.pasos.map((paso) => (
                  <li key={paso} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                    <span>{paso}</span>
                  </li>
                ))}
              </ul>
              <Link href={modulo.href}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {modulo.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border p-3">
            <p className="font-medium text-foreground">¿Puedo cobrar en ARS y USD en la misma venta?</p>
            <p className="mt-1">
              Sí. Activá pago dividido, cargá ambos tramos e ingresá cotización cuando haya USD.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-foreground">¿Qué puedo exportar desde reportes?</p>
            <p className="mt-1">
              Podés exportar CSV y PDF con filtros activos para auditoría y análisis.
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-foreground">¿Cómo se actualiza el stock?</p>
            <p className="mt-1">
              Baja con ventas y sube al recepcionar órdenes de compra.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {accesosRapidos.map((acceso) => (
              <Link key={acceso.href} href={acceso.href}>
                <Button variant="outline" size="sm" className="w-full justify-start gap-1.5">
                  <acceso.icon className="h-3.5 w-3.5" />
                  {acceso.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
        <Link href="/ventas/nueva">
          <Button className="shadow-sm">Ir a nueva venta</Button>
        </Link>
      </div>
    </div>
  );
}
