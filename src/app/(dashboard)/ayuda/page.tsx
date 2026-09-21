import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";

const claseLink =
  "inline-flex rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const inicioRapido = [
  {
    titulo: "Cargá proveedores",
    detalle: "Definí si cada uno es regular o de consignación.",
    href: "/proveedores/nuevo",
    cta: "Ir a proveedores",
  },
  {
    titulo: "Cargá productos",
    detalle: "Precio, stock y vínculo con su proveedor.",
    href: "/productos/nuevo",
    cta: "Ir a productos",
  },
  {
    titulo: "Registrá una venta",
    detalle: "Carrito, cliente y método de pago.",
    href: "/ventas/nueva",
    cta: "Ir a nueva venta",
  },
];

const modulos = [
  {
    titulo: "Ventas",
    descripcion:
      "Registrá ventas, aplicá descuentos y trabajá con pagos simples o divididos (incluyendo USD).",
    href: "/ventas",
    cta: "Ir a ventas",
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
    pasos: [
      "Creá productos con precio de compra/venta.",
      "Definí stock actual y stock mínimo.",
      "Si aplica, usá consignación o partes por proveedor.",
      "Monitoreá alertas de bajo stock desde el inicio o reportes.",
    ],
  },
  {
    titulo: "Proveedores y consignación",
    descripcion:
      "Administrá proveedores regulares o de consignación y generá rendiciones pendientes.",
    href: "/consignacion",
    cta: "Ir a consignación",
    pasos: [
      "Configurá el proveedor como regular o consignación.",
      "Controlá la deuda pendiente por proveedor.",
      "Generá la rendición y descargá el documento PDF.",
      "Las ventas rendidas no vuelven a aparecer pendientes.",
    ],
  },
  {
    titulo: "Compras",
    descripcion:
      "Creá órdenes de compra, seguí estados y recepcioná mercadería para actualizar stock.",
    href: "/compras",
    cta: "Ir a compras",
    pasos: [
      "Generá la orden desde “Compras > Nueva orden”.",
      "Cargá ítems y proveedor.",
      "Recepcioná total o parcial en el detalle de la orden.",
      "El stock se ajusta automáticamente.",
    ],
  },
  {
    titulo: "Clientes",
    descripcion:
      "Guardá clientes para historial comercial, CRM básico y seguimiento de compras.",
    href: "/clientes",
    cta: "Ir a clientes",
    pasos: [
      "Alta manual o desde el flujo de venta.",
      "Consultá datos y comportamiento de compra.",
      "Actualizá la información de contacto cuando haga falta.",
    ],
  },
  {
    titulo: "Reportes",
    descripcion: "Analizá ventas, inventario y rentabilidad con filtros; exportá en CSV y PDF.",
    href: "/reportes",
    cta: "Ir a reportes",
    pasos: [
      "Elegí un rango de fechas o un preset rápido.",
      "Aplicá filtros por método de pago, proveedor y categoría.",
      "Activá la comparación con el período anterior.",
      "Exportá los resultados en CSV o PDF.",
    ],
  },
];

const preguntas = [
  {
    pregunta: "¿Puedo cobrar en ARS y USD en la misma venta?",
    respuesta: "Sí. Activá pago dividido, cargá ambos tramos e ingresá la cotización cuando haya USD.",
  },
  {
    pregunta: "¿Qué puedo exportar desde reportes?",
    respuesta: "CSV y PDF con los filtros activos, para auditoría y análisis.",
  },
  {
    pregunta: "¿Cómo se actualiza el stock?",
    respuesta: "Baja con las ventas y sube al recepcionar órdenes de compra.",
  },
];

const accesosRapidos = [
  { href: "/", label: "Inicio" },
  { href: "/ventas/nueva", label: "Nueva venta" },
  { href: "/productos/nuevo", label: "Nuevo producto" },
  { href: "/proveedores/nuevo", label: "Nuevo proveedor" },
  { href: "/consignacion/rendiciones/nueva", label: "Nueva rendición" },
  { href: "/caja-chica", label: "Caja chica" },
];

/** Número de paso: mono chico, alineado a la izquierda del texto. */
function NumeroPaso({ n }: { n: number }) {
  return (
    <span className="w-5 shrink-0 pt-px font-mono text-[11px] tabular-nums text-muted-foreground">
      {String(n).padStart(2, "0")}
    </span>
  );
}

export default function AyudaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        overline="Administración · Ayuda"
        title="Centro de ayuda"
        description="Guía práctica del sistema: primeros pasos, cómo se usa cada módulo y accesos rápidos."
      />

      <Panel>
        <PanelHeader title="Inicio rápido" descripcion="Lo mínimo para arrancar la primera vez." />
        <ol className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {inicioRapido.map((paso, i) => (
            <li key={paso.href} className="flex gap-3 px-4 py-4 sm:px-5">
              <NumeroPaso n={i + 1} />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{paso.titulo}</p>
                <p className="text-sm text-muted-foreground">{paso.detalle}</p>
                <Link href={paso.href} className={claseLink}>
                  {paso.cta} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-x-12 lg:grid-cols-2">
        {modulos.map((modulo) => (
          <section
            key={modulo.titulo}
            aria-labelledby={`modulo-${modulo.href.slice(1)}`}
            className="border-t border-border py-6"
          >
            <h2 id={`modulo-${modulo.href.slice(1)}`} className="text-base font-semibold tracking-tight">
              {modulo.titulo}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{modulo.descripcion}</p>
            <ol className="mt-4 space-y-2">
              {modulo.pasos.map((paso, i) => (
                <li key={paso} className="flex gap-3 text-sm">
                  <NumeroPaso n={i + 1} />
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
            <Link href={modulo.href} className={`${claseLink} mt-4`}>
              {modulo.cta} →
            </Link>
          </section>
        ))}
      </div>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
        <section aria-labelledby="ayuda-faq" className="border-t border-border pt-6">
          <h2 id="ayuda-faq" className="text-base font-semibold tracking-tight">
            Preguntas frecuentes
          </h2>
          <dl className="mt-4 divide-y divide-border">
            {preguntas.map((p) => (
              <div key={p.pregunta} className="py-3 first:pt-0">
                <dt className="text-sm font-medium">{p.pregunta}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{p.respuesta}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="ayuda-accesos" className="border-t border-border pt-6">
          <h2 id="ayuda-accesos" className="text-base font-semibold tracking-tight">
            Accesos rápidos
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {accesosRapidos.map((acceso) => (
              <Button key={acceso.href} asChild variant="outline" size="sm">
                <Link href={acceso.href}>{acceso.label}</Link>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
