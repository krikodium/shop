# Mapa de la app

Relevamiento de rutas y componentes de `shop` para el plan de rediseño monocromo
(`.superpowers/sdd/2026-09-10-rediseno-monocromo/`). Este documento es la fuente
de referencia para las Tareas 8 a 23: en vez de releer el código, léanse esta
tabla y la de "Hojas" (sección 5).

Generado el 2026-09-10 sobre la rama `rediseno-monocromo`, a partir de:

```bash
find src/app -name "page.tsx" -o -name "layout.tsx" -o -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx" | sort
find src/components -name "*.tsx" | sort
for f in $(find src/app -name "page.tsx" | sort); do echo "=== $f ==="; grep -n "^import" "$f" | grep "@/components\|@/lib"; done
```

Convención: todas las rutas de archivo van entre backticks, con `/` como
separador y relativas a la raíz del repo (nunca `\`, nunca ruta absoluta).

---

## 1. Rutas

Un guion (—) en "componentes propios" significa que la página no tiene
subcomponentes propios (arma toda la UI inline con componentes compartidos).
"Componentes propios" incluye tanto archivos colocados junto a la página como
funciones declaradas dentro del propio `page.tsx` (se anota "función inline").

| Ruta URL | Archivo | Tipo | Hoja | Componentes propios | Componentes compartidos que usa |
| --- | --- | --- | --- | --- | --- |
| `/` | `src/app/(dashboard)/page.tsx` | client | Operación · Inicio | — | `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `PageHeader`, `Stat`/`StatGrid` |
| `/ventas` | `src/app/(dashboard)/ventas/page.tsx` | server | Operación · Ventas | `VentasTable` (`src/app/(dashboard)/ventas/VentasTable.tsx`) | `Button`, `PageHeader` |
| `/ventas/[id]` | `src/app/(dashboard)/ventas/[id]/page.tsx` | client | Operación · Ventas | encabezado armado a mano (`<h1>`, no usa `PageHeader`) | `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `GuardarDatosCliente`, `TicketVenta` |
| `/ventas/nueva` | `src/app/(dashboard)/ventas/nueva/page.tsx` | client | Operación · Punto de venta | encabezado armado a mano (`<h1>`, no usa `PageHeader`) | `ProductosGridPaginado`, `CarritoVenta`, `AlertDialog` (+ subcomponentes) |
| `/clientes` | `src/app/(dashboard)/clientes/page.tsx` | server | Operación · Clientes | `ClientesTable` (`src/app/(dashboard)/clientes/ClientesTable.tsx`) | `Button`, `PageHeader` |
| `/clientes/nuevo` | `src/app/(dashboard)/clientes/nuevo/page.tsx` | client | Operación · Clientes | — | `ClienteForm` |
| `/clientes/[id]` | `src/app/(dashboard)/clientes/[id]/page.tsx` | client | Operación · Clientes | encabezados armados a mano (`<h1>`/`<h2>`, no usa `PageHeader`) | `Button`, `ClienteForm` |
| `/productos` | `src/app/(dashboard)/productos/page.tsx` | client | Mercadería · Productos | `ProductosTable` (`src/app/(dashboard)/productos/ProductosTable.tsx`) | `Button`, `Input`, `Label`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `PageHeader` |
| `/productos/nuevo` | `src/app/(dashboard)/productos/nuevo/page.tsx` | server | Mercadería · Productos | `NuevoProductoCliente` (`src/components/productos/NuevoProductoCliente.tsx`) | `ProductoForm` (vía `NuevoProductoCliente`) |
| `/productos/[id]/editar` | `src/app/(dashboard)/productos/[id]/editar/page.tsx` | client | Mercadería · Productos | `ProductoEditSkeleton` (función inline en el archivo); encabezado armado a mano (`<h1>`) | `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Skeleton`, `ProductoForm` |
| `/proveedores` | `src/app/(dashboard)/proveedores/page.tsx` | server | Mercadería · Proveedores | `ProveedoresTable` (`src/app/(dashboard)/proveedores/ProveedoresTable.tsx`) | `Button`, `PageHeader` |
| `/proveedores/nuevo` | `src/app/(dashboard)/proveedores/nuevo/page.tsx` | server | Mercadería · Proveedores | `NuevoProveedorCliente` (`src/components/proveedores/NuevoProveedorCliente.tsx`) | `ProveedorForm` (vía `NuevoProveedorCliente`) |
| `/proveedores/[id]` | `src/app/(dashboard)/proveedores/[id]/page.tsx` | client | Mercadería · Proveedores | — | `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `ProveedorForm` |
| `/consignacion` | `src/app/(dashboard)/consignacion/page.tsx` | server | Mercadería · Consignación | `ConsignacionDashboard` (`src/app/(dashboard)/consignacion/ConsignacionDashboard.tsx`) | `Button`, `PageHeader` |
| `/consignacion/rendiciones` | `src/app/(dashboard)/consignacion/rendiciones/page.tsx` | server | Mercadería · Consignación | `RendicionesTable` (`src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`); encabezado armado a mano | `Button` |
| `/consignacion/rendiciones/nueva` | `src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx` | client | Mercadería · Consignación | `NuevaRendicionContent` (función inline en el archivo); encabezado armado a mano | `RendicionParams`, `RendicionPreview` (vía barrel `@/components/consignacion`) |
| `/consignacion/rendiciones/[id]` | `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx` | client | Mercadería · Consignación | encabezados armados a mano (`<h1>`/`<h2>`, no usa `PageHeader`) | `Button`, `Card`/`CardContent`, `Badge`, `RendicionPDFDownload` |
| `/compras` | `src/app/(dashboard)/compras/page.tsx` | server | Mercadería · Compras | `ComprasTable` (`src/app/(dashboard)/compras/ComprasTable.tsx`) | `Button`, `PageHeader` |
| `/compras/nueva` | `src/app/(dashboard)/compras/nueva/page.tsx` | client | Mercadería · Compras | — | `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Input`, `Label`, `CurrencyInput` |
| `/compras/[id]` | `src/app/(dashboard)/compras/[id]/page.tsx` | client | Mercadería · Compras | `CompraDetalleSkeleton` (`src/app/(dashboard)/compras/ComprasSkeletons.tsx`); encabezado armado a mano (`<h1>`) | `Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Input`, `AlertDialog` |
| `/caja-chica` | `src/app/(dashboard)/caja-chica/page.tsx` | client | Administración · Caja | — | `Button`, `Card`/`CardContent`, `Label`, `CurrencyInput`, `PageHeader`, `Dialog` (+ subcomponentes), `BalanceCards`/`TransactionForm`/`TransactionList`/`CajaSelector`/`MonthlyClosure`/`CajaChicaSkeleton` (vía barrel `@/components/caja-chica`) |
| `/reportes` | `src/app/(dashboard)/reportes/page.tsx` | client | Administración · Reportes | `LoadingSkeleton`, `EmptyState`, `ComparativaHint` (funciones inline en el archivo) | `Card`/`CardContent`/`CardHeader`/`CardTitle`, `PageHeader`, `Stat`/`StatGrid`, `Tabs` (+ subcomponentes), `Badge`, `Input`, `Button` |
| `/usuarios` | `src/app/(dashboard)/usuarios/page.tsx` | client | Administración · Usuarios | `UsuariosSkeleton`, `UsuariosList`, `UsuarioFormDialog` (`src/app/(dashboard)/usuarios/*.tsx`) | `Button`, `Card`/`CardContent`, `PageHeader` |
| `/estadisticas-vendedores` | `src/app/(dashboard)/estadisticas-vendedores/page.tsx` | client | Administración · Usuarios | `EstadisticasVendedoresSkeleton` (`src/app/(dashboard)/estadisticas-vendedores/EstadisticasVendedoresSkeleton.tsx`) | `Card`/`CardContent`/`CardHeader`/`CardTitle` |
| `/ayuda` | `src/app/(dashboard)/ayuda/page.tsx` | server | Soporte · Ayuda y acceso | — | `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Button`, `Badge`, `PageHeader` |
| `/login` | `src/app/login/page.tsx` | client | Soporte · Ayuda y acceso | `LoginForm` (función inline en el archivo) | `Button`, `Input`, `Label`, `Card`/`CardContent`/`CardDescription`/`CardHeader`/`CardTitle` |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | client | Soporte · Ayuda y acceso | — | `Button`, `Input`, `Label` |
| `/set-password` | `src/app/set-password/page.tsx` | client | Soporte · Ayuda y acceso | `SetPasswordForm` (función inline en el archivo) | `Button`, `Input`, `Label` |
| `/muestra-pedidos/nueva-venta` | `src/app/muestra-pedidos/nueva-venta/page.tsx` | server | Muestra | — | `NuevaVentaDemo` |
| `/muestra-pedidos/pedidos` | `src/app/muestra-pedidos/pedidos/page.tsx` | server | Muestra | — | `PedidosBandejaDemo` |
| `/muestra-pedidos/pedidos/[id]` | `src/app/muestra-pedidos/pedidos/[id]/page.tsx` | server | Muestra | — | `PedidoDetalleDemo` |

Total: 31 `page.tsx` (confirmado con `find src/app -name "page.tsx" | wc -l`).

### Archivos de ruta que no son `page.tsx`

El plan de rediseño trabaja pantalla por pantalla, así que la tabla de arriba
lista solo páginas. Estos son los demás archivos de ruta relevados en el
Paso 1 (layouts, loading, error, not-found):

| Archivo | Tipo | Qué hace |
| --- | --- | --- |
| `src/app/layout.tsx` | server | Layout raíz: fuentes, `SessionProvider`, `Toaster` (`@/components/ui/sonner`). |
| `src/app/(dashboard)/layout.tsx` | server | Layout del dashboard: valida sesión con `auth()`, arma `SidebarNav`, `UserMenu`, `MobileNav`. |
| `src/app/(dashboard)/caja-chica/loading.tsx` | — | Skeleton de carga de `/caja-chica`. |
| `src/app/(dashboard)/compras/loading.tsx` | — | Skeleton de carga de `/compras`. |
| `src/app/(dashboard)/estadisticas-vendedores/loading.tsx` | — | Skeleton de carga de `/estadisticas-vendedores`. |
| `src/app/(dashboard)/productos/nuevo/loading.tsx` | — | Skeleton de carga de `/productos/nuevo` (usa `Card`). |
| `src/app/(dashboard)/proveedores/nuevo/loading.tsx` | — | Skeleton de carga de `/proveedores/nuevo` (usa `Card`). |
| `src/app/(dashboard)/usuarios/loading.tsx` | — | Skeleton de carga de `/usuarios`. |
| `src/app/muestra-pedidos/layout.tsx` | server | Layout de la hoja Muestra. **Nota:** redefine variables de tema (`--background`, `--foreground`, etc.) en `oklch(...)` a mano en vez de heredar `globals.css` — a revisar cuando se toque esta hoja. |
| `src/app/muestra-pedidos/loading.tsx` | — | Loading de la hoja Muestra, importa de `demo-ui`. |
| `src/app/muestra-pedidos/error.tsx` | client | Error boundary de la hoja Muestra. |
| `src/app/muestra-pedidos/not-found.tsx` | — | 404 de la hoja Muestra. |

---

## 2. Componentes compartidos y dónde se usan

Tabla inversa de la de arriba. ⭐ = usado en 3 o más archivos (arreglarlo una
sola vez corrige 3+ pantallas). El conteo es "archivos que importan el
componente", verificado con `grep -rl` sobre `src`.

### Sistema de diseño (`src/components/ui/`)

| Componente | Usos | Archivos que lo importan |
| --- | --- | --- |
| `Button` ⭐ | 54 | Prácticamente todas las páginas y formularios de la app: `src/app/(dashboard)/ayuda/page.tsx`, `src/app/(dashboard)/caja-chica/page.tsx`, `src/app/(dashboard)/clientes/ClientesTable.tsx`, `src/app/(dashboard)/clientes/[id]/page.tsx`, `src/app/(dashboard)/clientes/page.tsx`, `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/[id]/page.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/app/(dashboard)/compras/page.tsx`, `src/app/(dashboard)/consignacion/ConsignacionDashboard.tsx`, `src/app/(dashboard)/consignacion/page.tsx`, `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`, `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx`, `src/app/(dashboard)/consignacion/rendiciones/page.tsx`, `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/productos/ProductosTable.tsx`, `src/app/(dashboard)/productos/[id]/editar/page.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/proveedores/ProveedoresTable.tsx`, `src/app/(dashboard)/proveedores/[id]/page.tsx`, `src/app/(dashboard)/proveedores/page.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx`, `src/app/(dashboard)/usuarios/UsuariosList.tsx`, `src/app/(dashboard)/usuarios/page.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`, `src/app/(dashboard)/ventas/[id]/page.tsx`, `src/app/(dashboard)/ventas/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/login/page.tsx`, `src/app/muestra-pedidos/error.tsx`, `src/app/set-password/page.tsx`, `src/components/caja-chica/monthly-closure.tsx`, `src/components/caja-chica/transaction-form.tsx`, `src/components/consignacion/rendicion-params.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/forms/ClienteForm.tsx`, `src/components/forms/ProductoForm.tsx`, `src/components/forms/ProveedorForm.tsx`, `src/components/layout/CambiarPasswordDialog.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/UserMenu.tsx`, `src/components/pdf/RendicionPDFDownload.tsx`, `src/components/pedidos-demo/NuevaVentaDemo.tsx`, `src/components/pedidos-demo/PedidoDetalleDemo.tsx`, `src/components/pedidos-demo/PedidosBandejaDemo.tsx`, `src/components/productos/NuevoProductoCliente.tsx`, `src/components/proveedores/NuevoProveedorCliente.tsx`, `src/components/punto-venta/CarritoVenta.tsx`, `src/components/punto-venta/ProductosGridPaginado.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/dialog.tsx`, `src/components/ventas/GuardarDatosCliente.tsx`, `src/components/ventas/TicketVenta.tsx`. |
| `Card`/`CardContent`/`CardHeader`/`CardTitle` ⭐ | 30 | `src/app/(dashboard)/ayuda/page.tsx`, `src/app/(dashboard)/caja-chica/page.tsx`, `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/[id]/page.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx`, `src/app/(dashboard)/estadisticas-vendedores/page.tsx`, `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/productos/[id]/editar/page.tsx`, `src/app/(dashboard)/productos/nuevo/loading.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/proveedores/[id]/page.tsx`, `src/app/(dashboard)/proveedores/nuevo/loading.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/usuarios/UsuariosList.tsx`, `src/app/(dashboard)/usuarios/page.tsx`, `src/app/(dashboard)/ventas/[id]/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/login/page.tsx`, `src/app/set-password/page.tsx`, `src/components/caja-chica/balance-cards.tsx`, `src/components/caja-chica/caja-selector.tsx`, `src/components/caja-chica/monthly-closure.tsx`, `src/components/caja-chica/transaction-form.tsx`, `src/components/caja-chica/transaction-list.tsx`, `src/components/consignacion/rendicion-params.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/forms/ProductoForm.tsx`, `src/components/forms/ProveedorForm.tsx`, `src/components/ventas/GuardarDatosCliente.tsx`. Es la base de la Duplicación 1 (sección 3). |
| `Input` ⭐ | 24 | `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/[id]/page.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx`, `src/app/(dashboard)/usuarios/UsuariosList.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`, `src/app/forgot-password/page.tsx`, `src/app/login/page.tsx`, `src/app/set-password/page.tsx`, `src/components/caja-chica/transaction-form.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/forms/ClienteForm.tsx`, `src/components/forms/ProductoForm.tsx`, `src/components/forms/ProveedorForm.tsx`, `src/components/layout/CambiarPasswordDialog.tsx`, `src/components/pedidos-demo/NuevaVentaDemo.tsx`, `src/components/pedidos-demo/PedidoDetalleDemo.tsx`, `src/components/pedidos-demo/PedidosBandejaDemo.tsx`, `src/components/punto-venta/BuscadorProductos.tsx`, `src/components/punto-venta/CarritoVenta.tsx`, `src/components/punto-venta/ProductosGridPaginado.tsx`, `src/components/ventas/GuardarDatosCliente.tsx`. |
| `Badge` ⭐ | 19 | `src/app/(dashboard)/ayuda/page.tsx`, `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/[id]/page.tsx`, `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`, `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx`, `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/productos/ProductosTable.tsx`, `src/app/(dashboard)/productos/[id]/editar/page.tsx`, `src/app/(dashboard)/proveedores/ProveedoresTable.tsx`, `src/app/(dashboard)/proveedores/[id]/page.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/usuarios/UsuariosList.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`, `src/app/(dashboard)/ventas/[id]/page.tsx`, `src/components/caja-chica/caja-selector.tsx`, `src/components/caja-chica/transaction-list.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/punto-venta/CarritoVenta.tsx`, `src/components/punto-venta/ProductosGridPaginado.tsx`. |
| `Label` ⭐ | 17 | `src/app/(dashboard)/caja-chica/page.tsx`, `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`, `src/app/forgot-password/page.tsx`, `src/app/login/page.tsx`, `src/app/set-password/page.tsx`, `src/components/caja-chica/transaction-form.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/layout/CambiarPasswordDialog.tsx`, `src/components/pedidos-demo/NuevaVentaDemo.tsx`, `src/components/pedidos-demo/PedidoDetalleDemo.tsx`, `src/components/punto-venta/CarritoVenta.tsx`, `src/components/ui/form.tsx`, `src/components/ventas/GuardarDatosCliente.tsx`. |
| `Select` ⭐ | 15 | `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx`, `src/app/(dashboard)/estadisticas-vendedores/page.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx`, `src/app/(dashboard)/usuarios/UsuariosList.tsx`, `src/components/caja-chica/monthly-closure.tsx`, `src/components/caja-chica/transaction-form.tsx`, `src/components/consignacion/rendicion-params.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/forms/ProductoForm.tsx`, `src/components/forms/ProveedorForm.tsx`, `src/components/punto-venta/CarritoVenta.tsx`. |
| `Table` (+ subcomponentes) ⭐ | 14 | `src/app/(dashboard)/clientes/ClientesTable.tsx`, `src/app/(dashboard)/clientes/[id]/page.tsx`, `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/compras/[id]/page.tsx`, `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`, `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx`, `src/app/(dashboard)/productos/ProductosTable.tsx`, `src/app/(dashboard)/proveedores/ProveedoresTable.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`, `src/components/caja-chica/monthly-closure.tsx`, `src/components/caja-chica/transaction-list.tsx`, `src/components/consignacion/rendicion-preview.tsx`, `src/components/ui/table-skeleton.tsx`. |
| `PageHeader` ⭐ | 11 | `src/app/(dashboard)/ayuda/page.tsx`, `src/app/(dashboard)/caja-chica/page.tsx`, `src/app/(dashboard)/clientes/page.tsx`, `src/app/(dashboard)/compras/page.tsx`, `src/app/(dashboard)/consignacion/page.tsx`, `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/proveedores/page.tsx`, `src/app/(dashboard)/reportes/page.tsx`, `src/app/(dashboard)/usuarios/page.tsx`, `src/app/(dashboard)/ventas/page.tsx`. Ver Duplicación 2: hay 8 páginas más que deberían usarlo y no lo hacen. |
| `Skeleton` ⭐ | 8 | `src/app/(dashboard)/compras/ComprasSkeletons.tsx`, `src/app/(dashboard)/estadisticas-vendedores/EstadisticasVendedoresSkeleton.tsx`, `src/app/(dashboard)/productos/[id]/editar/page.tsx`, `src/app/(dashboard)/productos/nuevo/loading.tsx`, `src/app/(dashboard)/proveedores/nuevo/loading.tsx`, `src/app/(dashboard)/usuarios/UsuariosSkeleton.tsx`, `src/components/caja-chica/CajaChicaSkeleton.tsx`, `src/components/forms/ProductoForm.tsx`. |
| `TableSkeleton` ⭐ | 7 | `src/app/(dashboard)/clientes/ClientesTable.tsx`, `src/app/(dashboard)/compras/ComprasSkeletons.tsx`, `src/app/(dashboard)/compras/ComprasTable.tsx`, `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`, `src/app/(dashboard)/productos/ProductosTable.tsx`, `src/app/(dashboard)/proveedores/ProveedoresTable.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`. |
| `Dialog` (+ subcomponentes) ⭐ | 7 | `src/app/(dashboard)/caja-chica/page.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/app/(dashboard)/productos/page.tsx`, `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx`, `src/components/layout/CambiarPasswordDialog.tsx`, `src/components/punto-venta/CarritoVenta.tsx`, `src/components/punto-venta/ProductosGridPaginado.tsx`. |
| `CurrencyInput` ⭐ | 4 | `src/app/(dashboard)/caja-chica/page.tsx`, `src/app/(dashboard)/compras/nueva/page.tsx`, `src/components/caja-chica/transaction-form.tsx`, `src/components/forms/ProductoForm.tsx`. Toca formato de montos: cambios de estilo sí, cambios de comportamiento no (regla de plata). |
| `Textarea` ⭐ | 3 | `src/components/forms/ClienteForm.tsx`, `src/components/forms/ProductoForm.tsx`, `src/components/pedidos-demo/NuevaVentaDemo.tsx`. |
| `Form` (+ subcomponentes, react-hook-form) ⭐ | 3 | `src/components/forms/ClienteForm.tsx`, `src/components/forms/ProductoForm.tsx`, `src/components/forms/ProveedorForm.tsx`. |
| `AlertDialog` ⭐ | 3 | `src/app/(dashboard)/compras/[id]/page.tsx`, `src/app/(dashboard)/ventas/[id]/page.tsx`, `src/app/(dashboard)/ventas/nueva/page.tsx`. Es el único mecanismo de confirmación destructiva ya presente (no se encontró `window.confirm`/`alert`/`prompt` nativo en `.tsx`). |
| `Stat`/`StatGrid` | 2 | `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/reportes/page.tsx`. Ya existe el componente que pide el Global Constraint 3; falta extenderlo a las páginas de la Duplicación 1. |
| `Sheet` | 2 | `src/components/layout/MobileNav.tsx`, `src/components/pedidos-demo/NuevaVentaDemo.tsx`. |
| `Progress` | 2 | `src/components/forms/ProductoForm.tsx`, `src/components/forms/ProveedorForm.tsx`. |
| `Tabs` (+ subcomponentes) | 1 | `src/app/(dashboard)/reportes/page.tsx`. |
| `Toaster` (`@/components/ui/sonner`) | 1 | `src/app/layout.tsx`. Ya está montado a nivel global — la Tarea 5 (toasts) tiene la base lista. |
| `DropdownMenu` (+ subcomponentes) | 1 | `src/components/layout/UserMenu.tsx`. |
| `Collapsible` | 0 | No se encontró ningún import de `@/components/ui/collapsible` en `.tsx` — componente sin uso actual. |

### Componentes de dominio (`src/components/<feature>/`)

| Componente | Usos | Archivos que lo importan |
| --- | --- | --- |
| `demo-ui` (`DemoFlag` y utilidades de la hoja Muestra) ⭐ | 5 | `src/app/muestra-pedidos/layout.tsx`, `src/app/muestra-pedidos/loading.tsx`, `src/components/pedidos-demo/NuevaVentaDemo.tsx`, `src/components/pedidos-demo/PedidoDetalleDemo.tsx`, `src/components/pedidos-demo/PedidosBandejaDemo.tsx`. |
| `ProductoForm` | 2 | `src/components/productos/NuevoProductoCliente.tsx`, `src/app/(dashboard)/productos/[id]/editar/page.tsx`. |
| `ProveedorForm` | 2 | `src/components/proveedores/NuevoProveedorCliente.tsx`, `src/app/(dashboard)/proveedores/[id]/page.tsx`. |
| `ClienteForm` | 2 | `src/app/(dashboard)/clientes/nuevo/page.tsx`, `src/app/(dashboard)/clientes/[id]/page.tsx`. |
| `TicketVenta` | 1 | `src/app/(dashboard)/ventas/[id]/page.tsx`. |
| `GuardarDatosCliente` | 1 | `src/app/(dashboard)/ventas/[id]/page.tsx`. |
| `ProductosGridPaginado` | 1 | `src/app/(dashboard)/ventas/nueva/page.tsx`. |
| `CarritoVenta` | 1 | `src/app/(dashboard)/ventas/nueva/page.tsx`. |
| `BuscadorProductos` | **0** | No se encontró ningún import fuera de su propio archivo (`src/components/punto-venta/BuscadorProductos.tsx`). Parece código muerto — no es una duplicación, queda anotado acá para que quien toque `punto-venta` lo confirme antes de rediseñarlo. |
| `SessionProvider` | 1 | `src/app/layout.tsx`. |
| `NuevoProductoCliente` | 1 | `src/app/(dashboard)/productos/nuevo/page.tsx`. |
| `NuevoProveedorCliente` | 1 | `src/app/(dashboard)/proveedores/nuevo/page.tsx`. |
| `NuevaVentaDemo` | 1 | `src/app/muestra-pedidos/nueva-venta/page.tsx`. |
| `PedidoDetalleDemo` | 1 | `src/app/muestra-pedidos/pedidos/[id]/page.tsx`. |
| `PedidosBandejaDemo` | 1 | `src/app/muestra-pedidos/pedidos/page.tsx`. |
| `ReportesPDF` | 1 | `src/app/api/reportes/export/pdf/route.tsx` (fuera del escaneo de color por ser `src/app/api/**`). |
| `RendicionPDFDownload` | 1 | `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx`. |
| `RendicionPDF` | 1 | `src/components/pdf/RendicionPDFDownload.tsx` (import relativo `./RendicionPDF`). |
| `UserMenu` | 1 | `src/app/(dashboard)/layout.tsx`. |
| `SidebarNav` | 1 | `src/app/(dashboard)/layout.tsx`. |
| `MobileNav` | 1 | `src/app/(dashboard)/layout.tsx`. |
| `CambiarPasswordDialog` | 1 | `src/components/layout/UserMenu.tsx` (import relativo). |
| `RendicionParams` | 1 | `src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx` (vía barrel). |
| `RendicionPreview` | 1 | `src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx` (vía barrel). |
| `BalanceCards` | 1 | `src/app/(dashboard)/caja-chica/page.tsx` (vía barrel). |
| `TransactionForm` | 1 | `src/app/(dashboard)/caja-chica/page.tsx` (vía barrel). |
| `TransactionList` | 1 | `src/app/(dashboard)/caja-chica/page.tsx` (vía barrel). |
| `CajaSelector` | 1 | `src/app/(dashboard)/caja-chica/page.tsx` (vía barrel). |
| `MonthlyClosure` | 1 | `src/app/(dashboard)/caja-chica/page.tsx` (vía barrel). |
| `CajaChicaSkeleton` | 1 | `src/app/(dashboard)/caja-chica/page.tsx` (vía barrel). |

Ningún componente de dominio llega a 3 usos salvo `demo-ui`: son, en general,
piezas de una sola pantalla. Esto confirma que el trabajo real de
"arreglar una vez, corrige varias pantallas" pasa por `src/components/ui/`.

---

## 3. Duplicaciones detectadas

Las cuatro duplicaciones del relevamiento previo fueron **verificadas contra
el código real** antes de escribirlas acá; las cuatro se sostienen.

### 3.1 Grilla de KPIs en `Card` con ícono

Confirmada. Las cuatro páginas arman a mano una grilla de `Card` con
`CardHeader`/`CardTitle`/`CardContent`, ícono de `lucide-react` y borde de
color (`border-l-4 border-l-*`, ya prohibido por el Global Constraint negativo
1) en vez de usar `Stat`/`StatGrid`:

- `src/app/(dashboard)/ventas/[id]/page.tsx` (líneas ~239-289): grilla de 3-4
  `Card` con `border-l-4` de distintos colores (`border-l-primary`,
  `border-l-green-500`, `border-l-blue-500`, `border-l-amber-500`).
- `src/app/(dashboard)/reportes/page.tsx` (línea ~316): `Card` con
  `border-l-4 border-l-slate-600` dentro de una grilla `md:grid-cols-4`.
- `src/app/(dashboard)/estadisticas-vendedores/page.tsx` (línea ~320): grilla
  `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5` de `Card` con
  `CardHeader`/`CardTitle`/`CardContent`.
- `src/app/(dashboard)/proveedores/[id]/page.tsx` (línea ~195): grilla
  `sm:grid-cols-2 lg:grid-cols-4` de `Card`, alguna con
  `border-amber-200 dark:border-amber-900`.

### 3.2 Encabezado de página

Confirmada. `PageHeader` (`src/components/ui/page-header.tsx`) se usa en 11
páginas (ver sección 2). Estas 8 páginas arman su encabezado a mano con un
`<h1>`/`<h2>` suelto en vez de `PageHeader`:

- `src/app/(dashboard)/ventas/nueva/page.tsx` (línea 204)
- `src/app/(dashboard)/clientes/[id]/page.tsx` (líneas 96, 105, 129)
- `src/app/(dashboard)/compras/[id]/page.tsx` (línea 228)
- `src/app/(dashboard)/ventas/[id]/page.tsx` (línea 180)
- `src/app/(dashboard)/consignacion/rendiciones/page.tsx` (línea 19)
- `src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx` (línea 224)
- `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx` (líneas 180,
  363, 456)
- `src/app/(dashboard)/productos/[id]/editar/page.tsx` (línea 187)

### 3.3 Spinner de carga

Confirmada, y sin casos adicionales fuera de los cuatro ya señalados (se
verificó con `grep -rl "Loader2\|animate-spin" src --include=*.tsx` y no
aparece ningún otro archivo):

- `Loader2` de `lucide-react` a mano en `src/components/forms/ProductoForm.tsx`
  (líneas 480, 743, 757) y `src/components/forms/ProveedorForm.tsx` (líneas
  287, 301).
- `<span>` con `animate-spin` a mano en
  `src/components/pedidos-demo/NuevaVentaDemo.tsx` (línea 279) y
  `src/components/pedidos-demo/PedidoDetalleDemo.tsx` (línea 229).
- En el resto de los botones asíncronos de la app no hay indicador visible de
  carga (relevante para el Global Constraint positivo 5 / Tarea 4).

### 3.4 Estado vacío

Confirmada, y más extendida de lo que registraba el relevamiento previo: 16
archivos escriben su propio texto "No hay …" (`grep -rl "No hay " src
--include=*.tsx`), no solo tablas:

- `src/app/(dashboard)/clientes/ClientesTable.tsx`
- `src/app/(dashboard)/compras/ComprasTable.tsx`
- `src/app/(dashboard)/consignacion/ConsignacionDashboard.tsx`
- `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`
- `src/app/(dashboard)/estadisticas-vendedores/page.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/app/(dashboard)/productos/ProductosTable.tsx`
- `src/app/(dashboard)/proveedores/ProveedoresTable.tsx`
- `src/app/(dashboard)/proveedores/[id]/page.tsx`
- `src/app/(dashboard)/usuarios/UsuariosList.tsx`
- `src/app/(dashboard)/usuarios/page.tsx`
- `src/app/(dashboard)/ventas/VentasTable.tsx`
- `src/components/caja-chica/caja-selector.tsx`
- `src/components/consignacion/rendicion-preview.tsx`
- `src/components/forms/ProductoForm.tsx`
- `src/components/pedidos-demo/PedidosBandejaDemo.tsx`

No existe ningún `EmptyState` compartido: `src/app/(dashboard)/reportes/page.tsx`
incluso define su **propia** función local `EmptyState` (línea 612), usada
solo dentro de ese archivo — es decir, ni siquiera esa implementación está en
`src/components`.

### 3.5 Hallazgos adicionales (no son duplicaciones, pero quedan anotados)

- **`BuscadorProductos` sin uso** (`src/components/punto-venta/BuscadorProductos.tsx`):
  no lo importa ningún otro archivo. Confirmar si es código muerto antes de
  invertir tiempo en rediseñarlo.
- **Tema propio en la hoja Muestra** (`src/app/muestra-pedidos/layout.tsx`):
  redefine las variables de color (`--background`, `--foreground`, `--primary`,
  etc.) en `oklch(...)` dentro del propio layout, en vez de heredar
  `globals.css`. No es una duplicación de UI, pero si la Tarea de tokens toca
  `globals.css` sin tocar este layout, la hoja Muestra puede quedar
  desincronizada del resto del rediseño monocromo.
- **No hay `window.confirm`/`alert`/`prompt` nativos** en ningún `.tsx`
  (verificado con grep): el Global Constraint negativo 6 ya se cumple de
  hecho en el código actual, más allá de que falte un componente de toast
  para avisos no destructivos.

---

## 4. Deudas visuales por archivo

Salida completa de:

```bash
grep -rno "\b\(bg\|text\|border\|from\|to\|via\|fill\|stroke\)-\(red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\|slate\|gray\|zinc\|neutral\|stone\)-[0-9]\{2,3\}" --include=*.tsx src | awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

| Ocurrencias | Archivo |
| --- | --- |
| 72 | `src/components/pedidos-demo/NuevaVentaDemo.tsx` |
| 61 | `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx` |
| 50 | `src/components/pedidos-demo/PedidoDetalleDemo.tsx` |
| 36 | `src/components/pedidos-demo/PedidosBandejaDemo.tsx` |
| 25 | `src/components/pedidos-demo/demo-ui.tsx` |
| 24 | `src/app/(dashboard)/page.tsx` |
| 22 | `src/components/punto-venta/CarritoVenta.tsx` |
| 20 | `src/app/(dashboard)/reportes/page.tsx` |
| 15 | `src/components/consignacion/rendicion-preview.tsx` |
| 15 | `src/components/caja-chica/monthly-closure.tsx` |
| 15 | `src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx` |
| 15 | `src/app/(dashboard)/consignacion/ConsignacionDashboard.tsx` |
| 14 | `src/components/ventas/TicketVenta.tsx` |
| 11 | `src/app/(dashboard)/estadisticas-vendedores/page.tsx` |
| 9 | `src/components/ui/sonner.tsx` |
| 8 | `src/components/punto-venta/ProductosGridPaginado.tsx` |
| 8 | `src/app/(dashboard)/proveedores/[id]/page.tsx` |
| 8 | `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx` |
| 7 | `src/app/muestra-pedidos/layout.tsx` |
| 7 | `src/app/(dashboard)/ventas/[id]/page.tsx` |
| 5 | `src/app/(dashboard)/ventas/VentasTable.tsx` |
| 4 | `src/components/ui/stat.tsx` |
| 4 | `src/app/muestra-pedidos/not-found.tsx` |
| 4 | `src/app/muestra-pedidos/error.tsx` |
| 4 | `src/app/(dashboard)/usuarios/UsuariosList.tsx` |
| 4 | `src/app/(dashboard)/productos/[id]/editar/page.tsx` |
| 2 | `src/app/muestra-pedidos/loading.tsx` |
| 2 | `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx` |
| 1 | `src/components/ventas/GuardarDatosCliente.tsx` |
| 1 | `src/components/consignacion/rendicion-params.tsx` |
| 1 | `src/app/(dashboard)/productos/page.tsx` |
| 1 | `src/app/(dashboard)/compras/[id]/page.tsx` |

Total: 32 archivos con deuda visual (la tabla de arriba tiene 32 filas y coincide exactamente con el array PENDIENTES de tests/design-guard.test.ts). Nota:
`src/components/ui/sonner.tsx` y `src/components/ui/stat.tsx` son parte del
sistema de diseño — sus 9 y 4 ocurrencias respectivamente valen la pena
revisarlas temprano porque afectan a todas las pantallas que ya los usan.

---

## 5. Hojas (secciones)

Agrupamiento normativo para las Tareas 8 a 23 (copiado tal cual del brief).

| Hoja | Rutas |
| --- | --- |
| Operación · Inicio | `/` |
| Operación · Ventas | `/ventas`, `/ventas/[id]` |
| Operación · Punto de venta | `/ventas/nueva` |
| Operación · Clientes | `/clientes`, `/clientes/nuevo`, `/clientes/[id]` |
| Mercadería · Productos | `/productos`, `/productos/nuevo`, `/productos/[id]/editar` |
| Mercadería · Proveedores | `/proveedores`, `/proveedores/nuevo`, `/proveedores/[id]` |
| Mercadería · Consignación | `/consignacion`, `/consignacion/rendiciones`, `/consignacion/rendiciones/nueva`, `/consignacion/rendiciones/[id]` |
| Mercadería · Compras | `/compras`, `/compras/nueva`, `/compras/[id]` |
| Administración · Caja | `/caja-chica` |
| Administración · Reportes | `/reportes` |
| Administración · Usuarios | `/usuarios`, `/estadisticas-vendedores` |
| Soporte · Ayuda y acceso | `/ayuda`, `/login`, `/forgot-password`, `/set-password` |
| Muestra | `/muestra-pedidos/*` |
