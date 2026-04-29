import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen } from "lucide-react";

export default function AyudaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HelpCircle className="h-7 w-7 text-primary" />
          Ayuda
        </h1>
        <p className="mt-1 text-muted-foreground">
          Guía paso a paso para usar el sistema de gestión
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            ¿Cómo funciona el dashboard?
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            El sistema está organizado en módulos. Acá te explicamos el flujo general y cada sección.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="mb-2 font-semibold">1. Configuración inicial (primera vez)</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Proveedores:</strong> Creá los proveedores desde{" "}
                <Link href="/proveedores/nuevo" className="text-primary underline">
                  Proveedores → Nuevo
                </Link>
                . Marcá si son regulares (compra directa) o en consignación.
              </li>
              <li>
                <strong>Productos:</strong> Cargá productos desde{" "}
                <Link href="/productos/nuevo" className="text-primary underline">
                  Productos → Nuevo
                </Link>
                . Asigná precio de compra, precio de venta y, si aplica, si es consignación.
              </li>
              <li>
                <strong>Clientes (opcional):</strong> Podés crear clientes desde{" "}
                <Link href="/clientes/nuevo" className="text-primary underline">
                  Clientes → Nuevo
                </Link>
                , o cargarlos al momento de la venta.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">2. Registrar una venta</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Entrá a{" "}
                <Link href="/ventas/nueva" className="text-primary underline">
                  Nueva venta
                </Link>
                .
              </li>
              <li>
                Buscá productos por nombre o SKU y hacé clic en uno para agregarlo al carrito.
              </li>
              <li>
                Ajustá cantidades en el carrito si hace falta.
              </li>
              <li>
                Elegí el cliente: seleccioná uno de la lista o "Sin cliente". Si es nuevo, usá{" "}
                <strong>Cargar datos</strong> para crearlo y asignarlo.
              </li>
              <li>
                Aplicá descuento (opcional) y elegí el método de pago.
              </li>
              <li>
                <strong>Pesos y dólares:</strong> Podés marcar <strong>Dividir en dos pagos</strong> y elegir ARS o USD por tramo.
                Si usás USD, indicá la cotización (ARS por 1 USD) en ese momento; el total en pesos de la venta no cambia. No hay un tipo de cambio global en el sistema.
              </li>
              <li>
                Hacé clic en <strong>Confirmar venta</strong>.
              </li>
              <li>
                Si no cargaste datos del cliente, podés hacerlo después en el detalle de la venta.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">3. Ver ventas realizadas</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              En{" "}
              <Link href="/ventas" className="text-primary underline">
                Ventas
              </Link>
              podés ver el listado de todas las ventas. Hacé clic en una para ver el detalle, totales, ganancia y margen.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">4. Consignación y rendiciones</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              Si vendés productos en consignación, el sistema lleva el control de la deuda con cada proveedor.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Consignación:</strong> En{" "}
                <Link href="/consignacion" className="text-primary underline">
                  Consignación
                </Link>
                ves el dashboard de deudas por proveedor (montos en ARS).
              </li>
              <li>
                <strong>Rendiciones:</strong> En{" "}
                <Link href="/consignacion/rendiciones/nueva" className="text-primary underline">
                  Nueva rendición
                </Link>
                elegís el proveedor y generás el documento con las ventas pendientes. Si el proveedor liquida en dólares (o lo elegís en el momento), indicás el tipo de cambio al confirmar y el sistema guarda el equivalente en USD. Podés descargar el PDF para entregar.
              </li>
              <li>
                Al confirmar una rendición, esas ventas quedan marcadas como rendidas y no se incluyen en futuras rendiciones.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">5. Compras y stock</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              Para productos que comprás (no consignación), usá el módulo de compras.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Creá una{" "}
                <Link href="/compras/nueva" className="text-primary underline">
                  orden de compra
                </Link>
                con proveedor e ítems.
              </li>
              <li>
                Al recibir la mercadería, marcá la recepción en el detalle de la orden. El stock se actualiza automáticamente.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">6. Reportes</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              En{" "}
              <Link href="/reportes" className="text-primary underline">
                Reportes
              </Link>
              tenés tres pestañas:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>Ventas:</strong> Total en ARS, cantidad, ganancia, margen, desglose por método de pago, bloque <strong>USD</strong> (suma de dólares cobrados, cantidad de ventas con USD y equivalente ARS usando la cotización guardada por venta).
              </li>
              <li>
                <strong>Exportar CSV:</strong> Botón <strong>CSV ventas</strong> descarga el listado del período con columnas de total ARS, métodos, USD y cotización (útil para Excel).
              </li>
              <li><strong>Inventario:</strong> Valor del stock (costo y venta) y productos con stock bajo.</li>
              <li><strong>Rentabilidad:</strong> Ganancia total y rentabilidad por producto.</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Podés filtrar por rango de fechas en los reportes de ventas y rentabilidad.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Resumen del menú</h2>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <strong>Dashboard</strong> — Inicio y acceso rápido
              </div>
              <div>
                <strong>Nueva venta</strong> — Punto de venta
              </div>
              <div>
                <strong>Ventas</strong> — Historial de ventas
              </div>
              <div>
                <strong>Productos</strong> — Catálogo e inventario
              </div>
              <div>
                <strong>Proveedores</strong> — Proveedores y configuración
              </div>
              <div>
                <strong>Consignación</strong> — Deudas por proveedor
              </div>
              <div>
                <strong>Rendiciones</strong> — Generar y ver rendiciones
              </div>
              <div>
                <strong>Clientes</strong> — Base de clientes
              </div>
              <div>
                <strong>Compras</strong> — Órdenes de compra
              </div>
              <div>
                <strong>Reportes</strong> — Ventas, inventario, rentabilidad
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/">
          <Button variant="outline">Volver al dashboard</Button>
        </Link>
        <Link href="/ventas/nueva">
          <Button className="shadow-sm">Ir a nueva venta</Button>
        </Link>
      </div>
    </div>
  );
}
