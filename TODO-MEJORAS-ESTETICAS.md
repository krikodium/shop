# Plan de mejoras estéticas - Shop

Lista de tareas para mejorar la estética de todas las páginas y componentes del dashboard.

---

## 1. Layout (afecta todas las páginas)

| # | Componente | Archivo | Mejoras sugeridas |
|---|------------|---------|-------------------|
| 1.1 | SidebarNav | `components/layout/SidebarNav.tsx` | Espaciado, iconos, estados hover/active más claros |
| 1.2 | MobileNav | `components/layout/MobileNav.tsx` | Transiciones, espaciado en Sheet |
| 1.3 | UserMenu | `components/layout/UserMenu.tsx` | Avatar, dropdown más pulido |

---

## 2. Dashboard principal (`/`)

| # | Elemento | Mejoras sugeridas |
|---|-----------|-------------------|
| 2.1 | Header | Título, subtítulo, botón "Nueva venta" |
| 2.2 | Cards KPI | Bordes, iconos, tipografía consistente |
| 2.3 | Gráfico ventas 14 días | BarChart: colores, tooltips, ejes |
| 2.4 | Gráfico método de pago | PieChart: leyenda, colores |
| 2.5 | Últimas ventas | Cards/lista, hover, enlaces |
| 2.6 | Productos bajo stock | Badges, alertas visuales |
| 2.7 | Accesos rápidos | Grid de botones, iconos |

---

## 3. Punto de venta (`/ventas/nueva`)

| # | Componente | Archivo | Mejoras sugeridas |
|---|------------|---------|-------------------|
| 3.1 | ProductosGridPaginado | `punto-venta/ProductosGridPaginado.tsx` | Cards de producto, imágenes, hover, paginación |
| 3.2 | CarritoVenta | `punto-venta/CarritoVenta.tsx` | Espaciado, totales, botón confirmar |
| 3.3 | AlertDialog stock excedido | `ventas/nueva/page.tsx` | Lista de productos, botones |

---

## 4. Ventas

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 4.1 | Listado ventas | `ventas/VentasTable.tsx` | Tabla, filtros, badges estado |
| 4.2 | Detalle venta | `ventas/[id]/page.tsx` | Header, items, ticket |
| 4.3 | TicketVenta | `ventas/TicketVenta.tsx` | Impresión, diseño ticket |
| 4.4 | GuardarDatosCliente | `ventas/GuardarDatosCliente.tsx` | Formulario inline |

---

## 5. Productos

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 5.1 | Listado productos | `productos/ProductosTable.tsx` | Imágenes, filtros, acciones |
| 5.2 | Alta producto | `productos/nuevo/page.tsx` | Layout, Card, espaciado |
| 5.3 | Editar producto | `productos/[id]/editar/page.tsx` | ✅ Ya mejorado (skeleton, header) |
| 5.4 | ProductoForm | `forms/ProductoForm.tsx` | Campos, grid, checkboxes |

---

## 6. Proveedores

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 6.1 | Listado proveedores | `proveedores/ProveedoresTable.tsx` | Tabla, badges tipo |
| 6.2 | Alta proveedor | `proveedores/nuevo/page.tsx` | Layout, Card |
| 6.3 | Detalle proveedor | `proveedores/[id]/page.tsx` | ✅ Ya mejorado (analytics) |

---

## 7. Clientes

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 7.1 | Listado clientes | `clientes/ClientesTable.tsx` | Tabla, búsqueda |
| 7.2 | Alta cliente | `clientes/nuevo/page.tsx` | Layout, Card |
| 7.3 | Detalle cliente | `clientes/[id]/page.tsx` | Header, datos, ventas |

---

## 8. Compras

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 8.1 | Listado compras | `compras/ComprasTable.tsx` | Tabla, badges estado |
| 8.2 | Nueva orden | `compras/nueva/page.tsx` | Cards, formularios, dialogs |
| 8.3 | Detalle orden | `compras/[id]/page.tsx` | ✅ Ya mejorado (espaciado tabla) |

---

## 9. Consignación

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 9.1 | Dashboard consignación | `consignacion/ConsignacionDashboard.tsx` | Cards proveedores, deuda |
| 9.2 | Listado rendiciones | `consignacion/rendiciones/RendicionesTable.tsx` | Tabla, filtros |
| 9.3 | Nueva rendición | `consignacion/rendiciones/nueva/page.tsx` | Parámetros, preview, tabla |
| 9.4 | Detalle rendición | `consignacion/rendiciones/[id]/page.tsx` | Header, items, PDF |

---

## 10. Caja chica

| # | Elemento | Archivo | Mejoras sugeridas |
|---|----------|---------|-------------------|
| 10.1 | Página caja chica | `caja-chica/page.tsx` | Cards, tabla movimientos, dialogs |

---

## 11. Reportes

| # | Elemento | Archivo | Mejoras sugeridas |
|---|----------|---------|-------------------|
| 11.1 | Tabs reportes | `reportes/page.tsx` | Tabs, tablas, filtros fecha |

---

## 12. Ayuda

| # | Elemento | Archivo | Mejoras sugeridas |
|---|----------|---------|-------------------|
| 12.1 | Página ayuda | `ayuda/page.tsx` | Cards, secciones, navegación |

---

## 13. Administración

| # | Página/Componente | Archivo | Mejoras sugeridas |
|---|------------------|---------|-------------------|
| 13.1 | Usuarios | `usuarios/page.tsx` | Tabla, modal nuevo/editar |
| 13.2 | Estadísticas vendedores | `estadisticas-vendedores/page.tsx` | Cards, select |

---

## Criterios de mejora estética (aplicar en general)

- **Espaciado**: `space-y-`, `gap-`, `p-`, `px-`, `py-` consistentes
- **Tipografía**: `font-bold`, `text-muted-foreground`, jerarquía clara
- **Cards**: `rounded-lg`, `border`, `shadow` suaves
- **Tablas**: `px-4 py-4`, headers con `bg-muted/50`, `tabular-nums`
- **Skeletons**: Carga profesional con shimmer en páginas que fetchean
- **Animaciones**: `animate-in fade-in` en transiciones de contenido
- **Responsive**: Mobile-first, espaciado adaptativo
- **Accesibilidad**: Contraste, focus states, labels

---

## Orden sugerido de implementación

1. **Fase 1 - Layout**: SidebarNav, MobileNav, UserMenu
2. **Fase 2 - Dashboard**: Página principal
3. **Fase 3 - Punto de venta**: ProductosGridPaginado, CarritoVenta
4. **Fase 4 - Tablas**: Todas las *Table
5. **Fase 5 - Páginas detalle**: venta, producto, proveedor, cliente, compra
6. **Fase 6 - Formularios y páginas alta**
7. **Fase 7 - Consignación, caja chica, reportes, ayuda, usuarios**
