# Sistema de diseño — Shop (rediseño monocromo)

Contrato que leen las Tareas 3 a 24 del plan `docs/superpowers/plans/2026-09-10-rediseno-monocromo.md`
y el subagente `ui-consistency` (`.claude/agents/ui-consistency.md`). Si una tarea duda
de si algo encaja con el sistema, la respuesta está acá — no hace falta abrir código
ajeno para confirmarlo.

La guardia automatizada que hace cumplir buena parte de esto vive en
`tests/design-guard.test.ts` (`npm test`). Ver también `docs/mapa-app.md` para el
relevamiento original de deuda visual.

---

## 1. Principios

Copiados textuales de los Global Constraints del plan (`task-2-brief.md`). Toda tarea
del rediseño los hereda implícitamente.

### Prompt positivo (lo que sí)

1. **Blanco y negro.** La interfaz es escala neutra pura. Toda superficie, borde, texto y acción sale de tokens de `globals.css` con **croma 0**.
2. **El color solo vive en números informativos.** Únicos tokens con croma: `--num-positive`, `--num-negative`, `--num-warning`, y `--destructive` para acciones destructivas. Se aplican **a la cifra**, nunca al fondo de un bloque ni a un borde decorativo.
3. **Sin tarjetones.** Nada de grillas de `Card` con ícono en cuadrito. Las métricas van en `StatGrid`/`Figure` (grilla con divisores compartidos) y los bloques de contenido en `Panel`.
4. **KPIs prolijos:** label mono en mayúsculas con `tracking` amplio, cifra en `font-mono tabular-nums`, hint en `text-xs text-muted-foreground`. Cifras alineadas a la derecha en tablas.
5. **Todo botón que dispara una acción asíncrona usa `loading`** (Tarea 4). Prohibido `disabled={saving}` sin indicador visible.
6. **Todo aviso de sistema es un toast abajo a la derecha** (Tarea 5). Prohibidos `alert()`, `confirm()` y `prompt()` nativos. Las confirmaciones destructivas usan `AlertDialog`.
7. **Movimiento con propósito y con freno:** toda animación respeta `@media (prefers-reduced-motion: reduce)`.
8. **Las fotos de producto conservan su color real.** Son datos, no decoración. La regla monocroma no las alcanza.
9. **Español** para nombres de dominio y comentarios; inglés para lo técnico del framework.

### Prompt negativo (lo que no)

1. **Prohibido** `border-l-4`, `border-r-4`, `border-t-4`, `border-b-4` — cards con línea de color al borde.
2. **Prohibido** `bg-gradient-*` y cualquier degradado decorativo.
3. **Prohibidas** las clases de color de la paleta Tailwind (`bg-emerald-500`, `text-blue-600`, `border-zinc-300`, `text-slate-600`, …) y los hex literales en `.tsx` de UI. Se usan tokens.
4. **Prohibido** el look "vibecoding": íconos grandes en cuadraditos de color, sombras exageradas, `font-black`, emojis decorativos, badges de colores saturados, tarjetas flotando sin jerarquía.
5. **Prohibido** cambiar lógica de plata en este plan (ver `docs/pendientes-plata.md` y la sección de plata en el brief de cada tarea).

### Excepciones a la guardia de color

Fuera del escaneo de `tests/design-guard.test.ts` porque son documentos de
impresión/PDF, donde el hex es la única forma de expresar color:

- `src/components/pdf/**`
- `src/app/api/**`

---

## 2. Tokens

Definidos en `src/app/globals.css` (bloque `:root` para claro, `.dark` para oscuro).
Los valores reales con croma 0 y los tokens `--num-*` nuevos se fijan en la **Tarea 3**
(hoy `--primary` y `--destructive` todavía tienen croma). Esta tabla deja los nombres
y el uso; la columna de valores se completa ahí.

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--background` | pendiente Tarea 3 | pendiente Tarea 3 | fondo de página |
| `--foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto principal |
| `--card` | pendiente Tarea 3 | pendiente Tarea 3 | fondo de `Panel`/superficies elevadas |
| `--card-foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto sobre `--card` |
| `--popover` | pendiente Tarea 3 | pendiente Tarea 3 | fondo de popovers/menús/dropdowns |
| `--popover-foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto sobre `--popover` |
| `--primary` | pendiente Tarea 3 | pendiente Tarea 3 | acción principal, foco de marca — **croma 0 desde Tarea 3** |
| `--primary-foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto/ícono sobre `--primary` |
| `--secondary` | pendiente Tarea 3 | pendiente Tarea 3 | acción secundaria |
| `--secondary-foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto sobre `--secondary` |
| `--muted` | pendiente Tarea 3 | pendiente Tarea 3 | fondos de baja jerarquía (filas alternas, skeletons) |
| `--muted-foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto secundario, hints, labels |
| `--accent` | pendiente Tarea 3 | pendiente Tarea 3 | hover/selección sutil |
| `--accent-foreground` | pendiente Tarea 3 | pendiente Tarea 3 | texto sobre `--accent` |
| `--destructive` | pendiente Tarea 3 | pendiente Tarea 3 | **único** token de acción con croma — botones/estados destructivos |
| `--border` | pendiente Tarea 3 | pendiente Tarea 3 | bordes de superficies y divisores |
| `--input` | pendiente Tarea 3 | pendiente Tarea 3 | borde de campos de formulario |
| `--ring` | pendiente Tarea 3 | pendiente Tarea 3 | anillo de foco |
| `--sidebar` / `--sidebar-foreground` / `--sidebar-primary` / `--sidebar-primary-foreground` / `--sidebar-accent` / `--sidebar-accent-foreground` / `--sidebar-border` / `--sidebar-ring` | pendiente Tarea 3 | pendiente Tarea 3 | familia de tokens de la barra lateral, mismo criterio que sus equivalentes sin prefijo |
| `--radius` (y derivados `--radius-sm/md/lg/xl`) | `0.625rem` | igual | radio de borde base de todas las superficies |
| `--num-positive` | **nuevo, Tarea 3** | **nuevo, Tarea 3** | única cifra "buena" (ganancia, saldo a favor, pago confirmado) |
| `--num-negative` | **nuevo, Tarea 3** | **nuevo, Tarea 3** | única cifra "mala" (deuda, pérdida, faltante) |
| `--num-warning` | **nuevo, Tarea 3** | **nuevo, Tarea 3** | única cifra de alerta (stock bajo, vencimiento próximo) |

Regla de oro: si necesitás un color y no está en esta tabla, no lo agregues sin
pasar por la Tarea 3 (o sin discutirlo primero) — no se inventan tokens sueltos por
pantalla.

---

## 3. Primitivas

Qué existe hoy, qué existe todavía no, y cuándo usar cada una. El detalle completo
(props finales, variantes) se termina de fijar en las **Tareas 4 a 7**; esto es el
estado de partida que dejó la Tarea 2.

| Primitiva | Estado en Tarea 2 | Cuándo usarla |
| --- | --- | --- |
| `PageHeader` (`src/components/ui/page-header.tsx`) | **Existe.** Props: `overline?`, `title`, `description?`, `children?` (acciones a la derecha). | Encabezado de **toda** página. Ninguna pantalla arma su propio `<h1>` suelto — ver Receta 1. |
| `StatGrid` / `Stat` (`src/components/ui/stat.tsx`) | **Existe, pero con deuda.** `Stat` hoy resuelve `tone` con clases hardcodeadas (`text-emerald-600 dark:text-emerald-400`, `text-amber-600 dark:text-amber-400`) — por eso `src/components/ui/stat.tsx` está en `PENDIENTES` de la guardia. Se migra a los tokens `--num-*` en Tarea 3/4. | Filas de KPIs/métricas. Reemplaza cualquier grilla de `Card` con ícono. |
| `Figure` | **No existe todavía.** Se define en Tareas 4-7 como variante de cifra individual (fuera de grilla) que comparte tono con `Stat`. | Cifra destacada suelta (ej. un total grande en el header de un detalle) que no forma parte de una `StatGrid`. |
| `Panel` / `PanelHeader` | **No existe todavía.** Se define en Tareas 4-7 para reemplazar el uso genérico de `Card`/`CardHeader`/`CardContent` en bloques de contenido (no-KPI). | Todo bloque de contenido que hoy usa `Card` para agrupar (listas, formularios, previews) y no es una métrica. |
| `EmptyState` | **No existe todavía.** Se define en Tareas 4-7. | Estado vacío de tablas y listados (sin resultados, sin datos todavía). |
| `Button` con prop `loading` | **A confirmar/completar en Tarea 4.** Hoy revisar si `src/components/ui/button.tsx` ya soporta `loading` antes de asumir que no. | Todo botón que dispara una acción asíncrona — nunca `disabled={saving}` a secas. |
| `AlertDialog` (Radix, vía `radix-ui`) | **Disponible como dependencia** (`radix-ui` ya está en `package.json`); el wrapper de UI propio se confirma/crea en Tarea 5. | Toda confirmación destructiva (eliminar, anular, revertir). |
| `notificar()` (`src/lib/notificar.ts`) | **No existe todavía.** Se crea en Tarea 5, sobre `sonner` (ya está en dependencias). | Todo aviso al usuario — éxito, error, advertencia. Reemplaza `alert()`/`confirm()`/`prompt()` nativos y cualquier `toast` invocado suelto sin pasar por acá. |
| `useAsyncAction` | **No existe todavía.** Se crea en Tarea 4. | Envolver toda acción async de UI (fetch/server action) para que `loading` y `notificar()` salgan consistentes en todas las pantallas. |
| `Reveal` / clases `ledger-*` (`globals.css`) | **`ledger-*` existe** en `globals.css` (ya usado, por ejemplo, en `ConsignacionDashboard.tsx`); componente `Reveal` a confirmar en Tarea 6/7. | Animaciones de entrada con `prefers-reduced-motion` ya resuelto — no reinventar transiciones sueltas. |

---

## 4. Recetas

Patrón canónico para los casos que se repiten en las 22 tareas de hoja.

### 4.1 Página con encabezado

```tsx
<PageHeader
  overline="Mercadería · Productos"
  title="Productos"
  description="Catálogo y stock."
>
  <Button asChild>
    <Link href="/productos/nuevo">Nuevo producto</Link>
  </Button>
</PageHeader>
```

- `overline` siempre `Sección · Subsección` (ver `docs/mapa-app.md` sección 5, tabla de hojas).
- Ninguna página arma su propio `<h1>`; eso ya lo resuelve `PageHeader`.
- Las acciones de la página (botón primario, toggles de vista) van como `children`,
  alineadas a la derecha.

### 4.2 Fila de KPIs

```tsx
<StatGrid>
  <Stat label="Total" value={formatARS(venta.total)} />
  <Stat
    label="Ganancia"
    value={formatARS(venta.gananciaBruta)}
    tone="positive"
    hint={`Margen ${venta.margenPorcentaje.toFixed(1)}%`}
  />
  <Stat label="Pago" value={METODO_PAGO_LABEL[venta.metodoPago]} />
  {venta.deudaConsignacion > 0 && (
    <Stat
      label="Consignación"
      value={formatARS(venta.deudaConsignacion)}
      tone="warning"
      hint="Deuda a proveedores"
    />
  )}
</StatGrid>
```

- Una `StatGrid` por fila de métricas. Nunca una grilla manual de `Card`.
- `tone` es la única forma de darle color a la cifra (`positive` → `--num-positive`,
  `warning` → `--num-warning`; falta agregar `negative` → `--num-negative` cuando se
  migre `Stat` en Tarea 3/4). El resto del componente (fondo, borde, ícono) se queda
  neutro.
- Ver sección 5 para el antes/después real de este patrón.

### 4.3 Tabla con estado vacío

```tsx
{items.length === 0 ? (
  <EmptyState
    title="Todavía no hay ventas"
    description="Las ventas que registres van a aparecer acá."
  />
) : (
  <Table>
    <TableHeader>…</TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id}>
          {/* cifras con font-mono tabular-nums, alineadas a la derecha */}
          <TableCell className="text-right font-mono tabular-nums">
            {formatARS(item.total)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)}
```

- El estado vacío nunca es un `<p>` centrado suelto: siempre `EmptyState`.
- Toda columna numérica se alinea a la derecha y usa `font-mono tabular-nums`.

### 4.4 Formulario con botón de guardar

```tsx
const { run, loading } = useAsyncAction();

<Button
  loading={loading}
  onClick={() => run(() => guardarProducto(data), {
    onSuccess: () => notificar.success("Producto guardado"),
  })}
>
  Guardar
</Button>
```

- Nunca `disabled={saving}` sin más: el `Button` recibe `loading` y muestra su
  propio indicador.
- El resultado (éxito o error) siempre pasa por `notificar()`, nunca por `alert()`
  ni por un `console.log` silencioso.

### 4.5 Acción destructiva con confirmación

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Eliminar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={eliminar}>Eliminar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- Nunca `confirm("¿Eliminar?")` nativo.
- `variant="destructive"` es el único lugar donde una acción "grita": usa
  `--destructive`, no un `bg-red-500` suelto.

---

## 5. Cómo NO hacerlo

Ejemplo real: la fila de KPIs de `src/app/(dashboard)/ventas/[id]/page.tsx`
(líneas ~238-302 al momento de esta tarea). Hoy son cuatro `Card` con
`border-l-4` de cuatro colores distintos — exactamente lo que la Tarea 9
(hoja "Operación · Ventas") tiene que eliminar.

### Antes (lo que hay hoy)

```tsx
<div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm transition-shadow hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
      <DollarSign className="h-5 w-5 text-primary/70" />
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold tabular-nums">{formatARS(venta.total)}</p>
    </CardContent>
  </Card>

  <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia</CardTitle>
      <TrendingUp className="h-5 w-5 text-green-500/70" />
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
        {formatARS(venta.gananciaBruta)}
      </p>
    </CardContent>
  </Card>

  <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm transition-shadow hover:shadow-md">
    {/* … Pago … */}
  </Card>

  <Card className="overflow-hidden border-l-4 border-l-amber-500 shadow-sm transition-shadow hover:shadow-md">
    {/* … Consignación … */}
  </Card>
</div>
```

Problemas, en los términos de la sección 1:

- `border-l-4 border-l-primary/green-500/blue-500/amber-500`: cuatro colores
  decorativos distintos en el borde de cuatro cards — prohibido explícito (prompt
  negativo #1), y ninguno de esos colores es informativo (no son la cifra).
  Cada `Card` es además un "tarjetón" (prompt positivo #3).
- `text-green-500/70`, `text-green-600 dark:text-green-400`: color de paleta
  Tailwind en vez de token (prompt negativo #3).
- Cuatro `<Card>` sueltas en vez de una grilla compartida: sin jerarquía visual
  común, cada una decide su propia sombra y borde.

### Después (con las primitivas del sistema)

```tsx
<StatGrid>
  <Stat label="Total" value={formatARS(venta.total)} />
  <Stat
    label="Ganancia"
    value={formatARS(venta.gananciaBruta)}
    tone="positive"
    hint={`Margen ${venta.margenPorcentaje.toFixed(1)}%`}
  />
  <Stat label="Pago" value={METODO_PAGO_LABEL[venta.metodoPago]} />
  {venta.deudaConsignacion > 0 && (
    <Stat
      label="Consignación"
      value={formatARS(venta.deudaConsignacion)}
      tone="warning"
      hint="Deuda a proveedores"
    />
  )}
</StatGrid>
```

- Una sola `StatGrid` con divisores compartidos, no cuatro cards independientes.
- El color vive **solo en la cifra** (`tone="positive"` / `tone="warning"`), nunca
  en el borde ni en el ícono.
- Sin íconos decorativos en cuadraditos de color: el label mono ya identifica la
  métrica.

Esta migración puntual de `ventas/[id]/page.tsx` es trabajo de una tarea de hoja
posterior (Operación · Ventas), no de esta Tarea 2 — acá solo se deja documentado
el criterio.
