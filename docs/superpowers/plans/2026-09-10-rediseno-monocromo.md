# Rediseño monocromo de Shop — Plan de implementación

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usá `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`) para seguimiento.
>
> **Regla de ejecución (pedido explícito de Mateo):** una tarea se empieza y se termina. **No se mezclan tareas.** No se abre la Tarea N+1 hasta que la Tarea N tenga su commit hecho y su verificación en verde. Cada tarea es autocontenida: trae sus rutas exactas, su código y sus comandos de verificación. El ejecutor **no necesita haber leído las tareas anteriores** ni el resto del código.

**Goal:** Convertir Shop en una herramienta de gestión monocroma, sobria y bien animada, rehaciendo la estética hoja por hoja sobre un sistema de tokens y primitivas compartidas, con una guardia automática que impide que vuelvan los patrones prohibidos.

**Architecture:** Primero se levanta un mapa de la app y una guardia de diseño ejecutable (un test que falla si aparece color hardcodeado, `border-l-4` o degradados). Después se reconstruyen los cimientos: tokens neutros en `globals.css`, primitivas compartidas (`Button` con estado de carga, `Panel`, `Figure`, `EmptyState`), toasts abajo a la derecha y un sistema de animación que respeta `prefers-reduced-motion`. Recién entonces se recorre pantalla por pantalla, agrupadas en "hojas" (secciones de negocio), y cada hoja borra su propia entrada de la lista de pendientes de la guardia. La última tarea exige guardia en cero y extrae la guía portable.

**Tech Stack:** Next.js 16.1.6 (App Router) · React 19.2.3 · TypeScript 5 · Tailwind CSS v4 (`@theme inline` en `src/app/globals.css`) · shadcn/Radix · `lucide-react` · `sonner` · `next-themes` (instalado pero **hoy sin usar**) · `recharts` · Prisma 7 + PostgreSQL · Vitest + Testing Library (se instalan en la Tarea 2).

**Spec:** este documento. El antecedente parcial es `PLAN-REDISENO-PEDIDOS.md` en la raíz del repo (su dirección visual §1 y su organización de pantallas §2 siguen vigentes; **toda su parte de pagos, anticipos y estados de producto queda FUERA de este plan** por decisión de Mateo del 2026-09-10).

---

## Global Constraints

Estas reglas aplican a **todas** las tareas. Los requisitos de cada tarea las incluyen implícitamente.

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
5. **Prohibido** cambiar lógica de plata en este plan (ver más abajo).

### Excepciones a la guardia de color

Quedan fuera del escaneo porque son documentos de impresión/PDF, donde el hex es la única forma de expresar color:

- `src/components/pdf/**`
- `src/app/api/**`

### 🔴 Regla de plata (AGENTS.md §3)

Este plan es **estético**. Ninguna tarea debe modificar cálculos de montos, cotizaciones, comisiones, saldos ni el payload que se manda a las APIs de plata.

Archivos sensibles: `src/lib/procesarVenta.ts`, `src/lib/calculadores/*`, `src/lib/consignacionHelpers.ts`, `src/lib/validaciones/*`, `src/app/api/ventas/**`, `src/app/api/caja-chica/**`, `src/app/api/consignacion/**`, `src/app/api/compras/**`, `src/app/api/reportes/**`.

**Si una tarea te obliga a tocar aritmética, redondeo, moneda o el cuerpo de un `fetch` a esas rutas: PARÁ.** No lo hagas dentro de esta tarea. Anotalo en `docs/pendientes-plata.md` y seguí con lo visual. Ese cambio va en el plan de pagos, y ahí sí pasa por el subagente `security-auditor`.

Reencuadrar visualmente un número **ya calculado** (cambiarle la clase, moverlo de `Card` a `Figure`) no es tocar plata y está permitido.

### Fuera de alcance (decidido el 2026-09-10)

Señas, anticipos, cobros parciales, `estadoPago` real, historial de pagos y estados de producto. Hoy `src/lib/procesarVenta.ts` fuerza `estadoPago: "PAGADO"` y no existe modelo `PagoVenta`. Eso es schema + migración + lógica de plata: **va en un plan aparte**, con `security-auditor` obligatorio.

### Verificación común a toda tarea

Toda tarea cierra con estos cuatro comandos en verde antes del commit:

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

(En la Tarea 1 todavía no hay `vitest`; su verificación es distinta y está escrita en la tarea.)

---

## File Structure

Archivos **nuevos** que crea este plan:

| Ruta | Responsabilidad |
| --- | --- |
| `docs/mapa-app.md` | Inventario de rutas → componentes. Evita releer el código en el futuro. |
| `docs/design-system.md` | Contrato de diseño: tokens, primitivas, cuándo usar cada una. |
| `docs/guia-estilos-portable.md` | Versión portable de la guía, sin dependencias de Shop. |
| `docs/pendientes-plata.md` | Buzón de cosas que tocan plata y quedaron para el plan de pagos. |
| `.claude/agents/ui-consistency.md` | Subagente revisor de consistencia visual (solo lectura). |
| `vitest.config.ts` | Config de test. |
| `tests/setup.ts` | Setup de Testing Library. |
| `tests/design-guard.test.ts` | Guardia: falla si vuelve un patrón prohibido. |
| `src/components/ui/spinner.tsx` | Indicador de carga único de la app. |
| `src/hooks/use-async-action.ts` | Envuelve acciones async: nunca quedan colgadas. |
| `src/lib/notificar.ts` | Fachada de toasts. Único punto de aviso al usuario. |
| `src/components/ui/panel.tsx` | Superficie de contenido (reemplaza el uso genérico de `Card`). |
| `src/components/ui/figure.tsx` | Cifra informativa: label + valor + tono + hint. |
| `src/components/ui/empty-state.tsx` | Estado vacío monocromo. |
| `src/components/ui/reveal.tsx` | Revelado escalonado accesible. |
| `src/components/providers/ThemeProvider.tsx` | Monta `next-themes` (hoy el modo oscuro es código muerto). |
| `src/components/layout/ThemeToggle.tsx` | Alternar claro/oscuro. |

Modificados de forma transversal: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/ui/sonner.tsx`, `src/components/ui/stat.tsx`, `src/lib/nav-config.tsx`, `src/components/layout/SidebarNav.tsx`, `package.json`.

Las páginas se modifican una hoja por vez; cada tarea lista las suyas.

---

## Subagentes: qué conviene crear (y qué no)

Mateo pidió evaluar qué subagentes son competentes para este trabajo. La respuesta honesta:

| Subagente | Veredicto | Por qué |
| --- | --- | --- |
| **`ui-consistency`** | ✅ **Crear ahora** (Tarea 2) | Es el único con trabajo real y repetible acá: revisar cada hoja contra un checklist cerrado (tokens, prohibidos, `loading`, toasts, `Panel`/`Figure`, reduced-motion). Es mecánico y verificable → `model: sonnet`, `tools: Read, Grep, Glob` (solo lectura: que revise, no que edite). |
| **`security-auditor`** | ⏸️ **No ahora** | Es obligatorio por AGENTS.md §3, pero **este plan no toca plata**. Crearlo ahora sería crear un auditor sin nada que auditar. Va en el plan de pagos/señas, que sí mueve montos y schema. |
| **`db-reviewer`** | ⏸️ **No ahora** | Este plan no tiene migraciones ni cambios de Prisma. Mismo razonamiento. |
| Un subagente "implementador de estética" | ❌ **No** | No aporta: la implementación la hace el agente que ejecuta la tarea. Una capa más solo pierde contexto. |

---

## Mapa de tareas

| Fase | Tareas |
| --- | --- |
| **0 · Relevamiento y andamiaje** | 1 (mapa), 2 (vitest + guardia + subagente + contrato) |
| **1 · Cimientos visuales** | 3 (tokens + tema), 4 (botones con carga), 5 (toasts), 6 (superficies), 7 (animación) |
| **2 · Hojas** | 8 (navegación), 9 (Inicio), 10 (Ventas lista), 11 (Ventas detalle), 12 (POS catálogo), 13 (POS carrito), 14 (Clientes), 15 (Productos), 16 (Proveedores), 17 (Consignación), 18 (Compras), 19 (Caja chica), 20 (Reportes), 21 (Usuarios), 22 (Ayuda + acceso), 23 (Muestra pedidos) |
| **3 · Cierre** | 24 (guardia en cero + guía portable) |

---

# FASE 0 — Relevamiento y andamiaje

### Tarea 1: Mapa de la app

Levantar el inventario de rutas y componentes **antes** de tocar nada, para que las tareas siguientes (y cualquier trabajo futuro) no tengan que releer el código.

**Files:**
- Create: `docs/mapa-app.md`
- Create: `docs/pendientes-plata.md`

**Interfaces:**
- Consumes: nada.
- Produces: `docs/mapa-app.md` — documento de referencia citado por las Tareas 8 a 23. `docs/pendientes-plata.md` — buzón donde toda tarea posterior anota lo que no puede tocar.

- [ ] **Paso 1: Listar todas las rutas y componentes**

```bash
find src/app -name "page.tsx" -o -name "layout.tsx" -o -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx" | sort
find src/components -name "*.tsx" | sort
```

- [ ] **Paso 2: Para cada página, ver qué importa**

Correr esto y guardar la salida a mano; es la materia prima del mapa:

```bash
for f in $(find src/app -name "page.tsx" | sort); do echo "=== $f ==="; grep -n "^import" "$f" | grep "@/components\|@/lib"; done
```

- [ ] **Paso 3: Escribir `docs/mapa-app.md`**

El documento tiene exactamente estas cinco secciones:

1. **Rutas** — una tabla con: ruta URL · archivo · tipo (server/client) · hoja a la que pertenece · componentes propios · componentes compartidos que usa.
2. **Componentes compartidos y dónde se usan** — tabla inversa: componente · cantidad de usos · archivos que lo importan. Marcar con ⭐ los que se usan en 3+ lugares (son los que hay que arreglar una sola vez).
3. **Duplicaciones detectadas** — bloques de UI que se repiten copiados en vez de compartirse. Como mínimo tiene que registrar estos cuatro, ya detectados en el relevamiento:
   - Grilla de KPIs en `Card` con ícono: repetida en `ventas/[id]/page.tsx`, `reportes/page.tsx`, `estadisticas-vendedores/page.tsx`, `proveedores/[id]/page.tsx`.
   - Encabezado de página: `PageHeader` está en 11 páginas pero `ventas/nueva/page.tsx`, `clientes/[id]`, `compras/[id]`, `ventas/[id]`, `consignacion/rendiciones/*` y `productos/[id]/editar` arman el suyo a mano.
   - Spinner de carga: `Loader2` a mano en `ProductoForm.tsx` y `ProveedorForm.tsx`; `span` con `animate-spin` a mano en `NuevaVentaDemo.tsx` y `PedidoDetalleDemo.tsx`; en el resto no hay indicador.
   - Estado vacío: cada tabla escribe su propio "No hay …".
4. **Deudas visuales por archivo** — la lista de archivos con color hardcodeado, con su conteo. Sale de:

```bash
grep -rno "\b\(bg\|text\|border\|from\|to\|via\|fill\|stroke\)-\(red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\|slate\|gray\|zinc\|neutral\|stone\)-[0-9]\{2,3\}" --include=*.tsx src | awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

5. **Hojas (secciones)** — el agrupamiento que usan las Tareas 8 a 23:

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

- [ ] **Paso 4: Crear `docs/pendientes-plata.md`**

```markdown
# Pendientes que tocan plata

Buzón del plan de rediseño monocromo (2026-09-10). Nada de acá se toca en ese
plan: son cambios que mueven montos, monedas, saldos o payloads de APIs de plata,
y por AGENTS.md §3 tienen que pasar por el subagente `security-auditor` dentro
del plan de pagos/señas.

| Fecha | Tarea que lo encontró | Archivo:línea | Qué se detectó | Por qué es plata |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Relevamiento | `src/lib/procesarVenta.ts` | `estadoPago` se fuerza a `"PAGADO"` siempre | Impide señas y cobros parciales |
| 2026-09-10 | Relevamiento | `src/lib/procesarVenta.ts` | Aritmética en `number` (float) antes de convertir a `Prisma.Decimal` | Precisión de montos |
```

- [ ] **Paso 5: Verificar que el mapa cubre todas las rutas**

Este comando no debe imprimir nada. Si imprime una ruta, esa página falta en el mapa:

```bash
for f in $(find src/app -name "page.tsx"); do grep -q "$f" docs/mapa-app.md || echo "FALTA EN EL MAPA: $f"; done
```

Esperado: sin salida.

- [ ] **Paso 6: Commit**

```bash
git add docs/mapa-app.md docs/pendientes-plata.md
git commit -m "docs: mapa de rutas y componentes + buzon de pendientes de plata"
```

---

### Tarea 2: Vitest, guardia de diseño, subagente y contrato

Instalar la infraestructura de test y escribir la **guardia de diseño**: un test que recorre el árbol y falla si aparece un patrón prohibido. Esto es lo que hace verificables a las 22 tareas siguientes.

**Files:**
- Modify: `package.json` (dependencias + script `test`)
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/design-guard.test.ts`
- Create: `.claude/agents/ui-consistency.md`
- Create: `docs/design-system.md`

**Interfaces:**
- Consumes: `docs/mapa-app.md` (sección 4, para armar la lista de pendientes).
- Produces:
  - `npm test` → corre vitest una vez.
  - `tests/design-guard.test.ts` exporta la constante `PENDIENTES: string[]` — rutas relativas a la raíz que todavía tienen deuda visual. **Cada tarea de hoja borra sus propias rutas de este array.** La Tarea 24 exige `PENDIENTES.length === 0`.
  - Subagente `ui-consistency`, invocable como revisor al cerrar cada hoja.

- [ ] **Paso 1: Instalar dependencias**

```bash
npm install -D vitest@^3 @vitejs/plugin-react@^5 jsdom@^26 @testing-library/react@^16 @testing-library/dom@^10 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

- [ ] **Paso 2: Agregar el script de test a `package.json`**

En el bloque `"scripts"`, después de `"lint": "eslint",`, agregar:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Paso 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Paso 4: Crear `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom no implementa matchMedia y varios componentes lo consultan
// (next-themes, chequeos de prefers-reduced-motion).
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
```

- [ ] **Paso 5: Escribir la guardia de diseño (test que debe fallar primero)**

Crear `tests/design-guard.test.ts`. El array `PENDIENTES` arranca **vacío a propósito** para que el test falle y muestre la lista real:

```ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = process.cwd();
const DIRS_ESCANEADOS = ["src"];

/** Rutas excluidas: documentos de impresión/PDF, donde el hex es legítimo. */
const EXCLUIDOS = [
  join("src", "components", "pdf"),
  join("src", "app", "api"),
];

/**
 * Archivos que todavía arrastran deuda visual del diseño viejo.
 * Cada tarea de hoja del plan de rediseño borra SUS PROPIAS rutas de acá.
 * La tarea final exige que este array quede vacío.
 */
export const PENDIENTES: string[] = [];

const PROHIBIDOS: Array<{ nombre: string; patron: RegExp; motivo: string }> = [
  {
    nombre: "borde de color",
    patron: /\bborder-(?:l|r|t|b)-4\b/,
    motivo: "cards con línea de color al borde — usá Panel o Figure",
  },
  {
    nombre: "degradado",
    patron: /\bbg-gradient-(?:to|from|stops)\b/,
    motivo: "degradado decorativo — usá una superficie plana con token",
  },
  {
    nombre: "color hardcodeado",
    patron:
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|outline|shadow|divide|placeholder|accent|caret)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/,
    motivo:
      "color de paleta Tailwind — usá tokens (bg-card, text-muted-foreground, text-num-positive…)",
  },
  {
    nombre: "hex literal",
    patron: /["'`]#[0-9a-fA-F]{3,8}["'`]|:\s*"#[0-9a-fA-F]{3,8}"/,
    motivo: "hex literal — usá una variable CSS",
  },
  {
    nombre: "diálogo nativo del navegador",
    patron: /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/,
    motivo: "aviso nativo — usá notificar() o AlertDialog",
  },
];

function listarArchivos(dir: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada.startsWith(".")) continue;
    const completo = join(dir, entrada);
    if (statSync(completo).isDirectory()) {
      listarArchivos(completo, acumulado);
    } else if (/\.tsx?$/.test(entrada)) {
      acumulado.push(completo);
    }
  }
  return acumulado;
}

function archivosAEscanear(): string[] {
  return DIRS_ESCANEADOS.flatMap((d) => listarArchivos(join(RAIZ, d)))
    .map((f) => relative(RAIZ, f))
    .filter((f) => !EXCLUIDOS.some((ex) => f.startsWith(ex + sep) || f === ex));
}

type Hallazgo = { archivo: string; linea: number; regla: string; motivo: string; texto: string };

function escanear(): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  for (const archivo of archivosAEscanear()) {
    const lineas = readFileSync(join(RAIZ, archivo), "utf8").split("\n");
    lineas.forEach((texto, i) => {
      for (const regla of PROHIBIDOS) {
        if (regla.patron.test(texto)) {
          hallazgos.push({
            archivo,
            linea: i + 1,
            regla: regla.nombre,
            motivo: regla.motivo,
            texto: texto.trim().slice(0, 110),
          });
        }
      }
    });
  }
  return hallazgos;
}

function formatear(hallazgos: Hallazgo[]): string {
  return hallazgos
    .map((h) => `  ${h.archivo}:${h.linea} [${h.regla}] ${h.motivo}\n      ${h.texto}`)
    .join("\n");
}

describe("guardia de diseño monocromo", () => {
  it("no hay patrones prohibidos fuera de la lista de pendientes", () => {
    const sucios = escanear().filter((h) => !PENDIENTES.includes(h.archivo));
    expect(
      sucios.length,
      `Patrones prohibidos en archivos ya migrados:\n${formatear(sucios)}`
    ).toBe(0);
  });

  it("la lista de pendientes no tiene entradas obsoletas", () => {
    const conDeuda = new Set(escanear().map((h) => h.archivo));
    const obsoletos = PENDIENTES.filter((p) => !conDeuda.has(p));
    expect(
      obsoletos,
      `Estos archivos ya están limpios: sacalos de PENDIENTES.\n  ${obsoletos.join("\n  ")}`
    ).toEqual([]);
  });

  it("cada ruta de PENDIENTES existe", () => {
    const existentes = new Set(archivosAEscanear());
    const fantasmas = PENDIENTES.filter((p) => !existentes.has(p));
    expect(fantasmas, `Rutas inexistentes en PENDIENTES:\n  ${fantasmas.join("\n  ")}`).toEqual([]);
  });
});
```

- [ ] **Paso 6: Correr el test para verlo fallar y capturar la lista real**

```bash
npx vitest run tests/design-guard.test.ts
```

Esperado: **FALLA**, con el listado completo de archivos y líneas sucias.

- [ ] **Paso 7: Poblar `PENDIENTES` con lo que salió**

Copiar las rutas únicas del error al array `PENDIENTES`, en orden alfabético, una por línea. Debe quedar parecido a esto (la lista exacta la da el paso anterior; **no la inventes, usá la salida real**):

```ts
export const PENDIENTES: string[] = [
  "src\\app\\(dashboard)\\consignacion\\ConsignacionDashboard.tsx",
  // … el resto de la salida del paso 6
];
```

> Nota de Windows: `relative()` devuelve separadores `\`. Si preferís rutas con `/`, cambiá el `.map` de `archivosAEscanear` por `.map((f) => relative(RAIZ, f).split(sep).join("/"))` y escribí `PENDIENTES` con `/`. Elegí **una** forma y sé consistente.

- [ ] **Paso 8: Correr el test para verlo pasar**

```bash
npx vitest run tests/design-guard.test.ts
```

Esperado: **3 tests PASS**.

- [ ] **Paso 9: Crear el subagente `.claude/agents/ui-consistency.md`**

```markdown
---
name: ui-consistency
description: Revisa que una pantalla o componente respete el sistema de diseño monocromo de Shop. Usar SIEMPRE al terminar una hoja (sección) del plan de rediseño, antes de dar la tarea por cerrada, y ante cualquier duda de si un componente nuevo encaja con el resto.
tools: Read, Grep, Glob
model: sonnet
---

Sos revisor de consistencia visual del proyecto Shop. Solo leés y reportás:
nunca editás archivos.

Tu contrato de diseño está en `docs/design-system.md`. Leelo antes de revisar.

## Qué revisar, en este orden

1. **Tokens.** Ningún color de la paleta Tailwind (`bg-emerald-500`,
   `text-slate-600`, `border-zinc-300`, …) ni hex literal. Todo sale de tokens:
   `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
   `border-border`, `bg-primary`, `text-primary-foreground`.
2. **Color solo en cifras.** `text-num-positive`, `text-num-negative` y
   `text-num-warning` se aplican al número, jamás a un fondo, un borde
   decorativo o un ícono suelto.
3. **Prohibidos.** `border-l-4` / `-r-4` / `-t-4` / `-b-4`, `bg-gradient-*`,
   `font-black`, sombras mayores a `shadow-sm`, íconos dentro de cuadraditos
   de color, emojis decorativos.
4. **Superficies.** Los bloques de contenido usan `Panel`/`PanelHeader`, no
   `Card` genérica. Las métricas usan `StatGrid` + `Figure`, no una grilla de
   `Card`. Los vacíos usan `EmptyState`.
5. **Encabezado.** Toda página usa `PageHeader` con `overline`; ninguna arma
   su propio `<h1>` suelto.
6. **Carga.** Todo botón que dispara una acción asíncrona pasa `loading` al
   componente `Button`. Un `disabled={saving}` sin indicador visible es un
   hallazgo. Toda acción async pasa por `useAsyncAction`.
7. **Avisos.** Los mensajes al usuario van por `notificar` (`src/lib/notificar.ts`).
   `alert()`, `confirm()` y `prompt()` nativos son hallazgos. Las confirmaciones
   destructivas usan `AlertDialog`.
8. **Movimiento.** Toda animación tiene su rama `prefers-reduced-motion` o usa
   `Reveal`/las clases `ledger-*` de `globals.css`, que ya la tienen.
9. **Números.** Cifras en `font-mono tabular-nums`, alineadas a la derecha en
   tablas. Montos siempre por `formatARS`/`formatUSD`.
10. **Accesibilidad mínima.** Íconos decorativos con `aria-hidden="true"`;
    botones de solo ícono con `aria-label`; estados de carga con `aria-busy`.

## Lo que NO es tu tarea

- No opinás de lógica de negocio, de cálculos ni de plata.
- No proponés refactors de arquitectura.
- No revisás `src/components/pdf/**` ni `src/app/api/**` (son documentos de
  impresión: el hex ahí es legítimo).

## Formato de salida

Empezá con un veredicto de una línea: `LIMPIO` o `N hallazgos`.

Después, una tabla:

| Severidad | archivo:línea | Regla | Qué encontré | Cómo se arregla |
| --- | --- | --- | --- | --- |

Severidad: `alta` = está en el prompt negativo explícito de Mateo (color
hardcodeado, borde de color, degradado, aviso nativo del navegador).
`media` = rompe una primitiva compartida. `baja` = pulido.

Cerrá con **una** frase sobre si la pantalla se siente parte del mismo sistema
que el resto. Sin adornos ni felicitaciones.
```

- [ ] **Paso 10: Escribir `docs/design-system.md`**

Es el **contrato** que van a leer las 22 tareas siguientes y el subagente. Debe tener estas secciones, escritas con el detalle suficiente para no tener que abrir el código:

1. **Principios** — los 9 puntos del prompt positivo y los 5 del negativo de este plan, copiados textuales.
2. **Tokens** — tabla de cada token con su valor en claro y oscuro, y para qué se usa. (Se completa con los valores reales en la Tarea 3; acá se deja la tabla con los nombres y una nota `pendiente Tarea 3` en los valores.)
3. **Primitivas** — qué existe, qué props tiene, cuándo usar cada una. (Se completa en las Tareas 4 a 7.)
4. **Recetas** — el patrón canónico de: página con encabezado, fila de KPIs, tabla con estado vacío, formulario con botón de guardar, acción destructiva con confirmación.
5. **Cómo NO hacerlo** — un antes/después real, usando el bloque de KPIs de `src/app/(dashboard)/ventas/[id]/page.tsx` (que hoy usa cuatro `Card` con `border-l-4` de cuatro colores distintos) como ejemplo de lo que se está eliminando.

- [ ] **Paso 11: Verificación**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

Esperado: todo en verde, 3 tests de la guardia PASS.

- [ ] **Paso 12: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests .claude/agents/ui-consistency.md docs/design-system.md
git commit -m "test: guardia de diseno monocromo + vitest + subagente ui-consistency"
```

---

# FASE 1 — Cimientos visuales

### Tarea 3: Tokens monocromos y modo oscuro real

Reescribir la paleta a escala neutra pura y **encender el modo oscuro**, que hoy está definido en CSS pero es código muerto: `next-themes` figura en `package.json` y no lo importa nadie, así que la clase `.dark` nunca se aplica.

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/providers/ThemeProvider.tsx`
- Create: `src/components/layout/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: `docs/design-system.md` (Tarea 2).
- Produces:
  - Tokens nuevos utilizables como clases Tailwind: `text-num-positive`, `text-num-negative`, `text-num-warning`, `bg-surface`, `border-strong`.
  - `<ThemeProvider>` — envuelve la app en `src/app/layout.tsx`.
  - `<ThemeToggle />` — sin props, se monta en el sidebar.
  - Variables de movimiento: `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 420ms`, `--ease-salida: cubic-bezier(0.16, 1, 0.3, 1)`.

- [ ] **Paso 1: Escribir el test que falla**

Crear `tests/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

/** Tokens que pueden tener croma: son los únicos lugares donde vive el color. */
const CON_COLOR_PERMITIDO = [
  "--num-positive",
  "--num-negative",
  "--num-warning",
  "--destructive",
];

function bloque(selector: string): string {
  const i = css.indexOf(selector);
  expect(i, `No encontré el bloque ${selector} en globals.css`).toBeGreaterThan(-1);
  const desde = css.indexOf("{", i);
  const hasta = css.indexOf("}", desde);
  return css.slice(desde + 1, hasta);
}

function declaraciones(texto: string): Array<{ nombre: string; valor: string }> {
  return [...texto.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => ({
    nombre: m[1],
    valor: m[2].trim(),
  }));
}

/** Segundo número de oklch(L C H) = croma. */
function croma(valor: string): number | null {
  const m = valor.match(/oklch\(\s*([\d.]+)\s+([\d.]+)/);
  return m ? Number.parseFloat(m[2]) : null;
}

describe("tokens monocromos", () => {
  for (const selector of [":root", ".dark"]) {
    it(`${selector}: solo los tokens de cifras tienen croma`, () => {
      const conColor = declaraciones(bloque(selector))
        .filter((d) => !CON_COLOR_PERMITIDO.includes(d.nombre))
        .filter((d) => {
          const c = croma(d.valor);
          return c !== null && c > 0.001;
        })
        .map((d) => `${d.nombre}: ${d.valor}`);
      expect(conColor, `Tokens con color fuera de las cifras en ${selector}`).toEqual([]);
    });

    it(`${selector}: define los tokens de cifras`, () => {
      const nombres = declaraciones(bloque(selector)).map((d) => d.nombre);
      for (const token of ["--num-positive", "--num-negative", "--num-warning"]) {
        expect(nombres, `Falta ${token} en ${selector}`).toContain(token);
      }
    });
  }

  it("expone los tokens de cifras a Tailwind vía @theme inline", () => {
    const tema = bloque("@theme inline");
    for (const token of ["--color-num-positive", "--color-num-negative", "--color-num-warning"]) {
      expect(tema).toContain(token);
    }
  });

  it("define los tokens de movimiento", () => {
    const raiz = bloque(":root");
    for (const token of ["--dur-fast", "--dur-base", "--dur-slow", "--ease-salida"]) {
      expect(raiz).toContain(token);
    }
  });

  it("toda animación tiene freno por prefers-reduced-motion", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
```

- [ ] **Paso 2: Correr el test para verlo fallar**

```bash
npx vitest run tests/tokens.test.ts
```

Esperado: FALLA. El `:root` actual tiene `--primary: oklch(0.45 0.12 195)` (teal, croma 0.12), varios `--chart-*` con croma alto, y no existe ningún `--num-*`.

- [ ] **Paso 3: Reemplazar el bloque `:root` de `src/app/globals.css`**

Reemplazar el `:root { … }` completo por:

```css
:root {
  --radius: 0.5rem;

  /* Superficies y texto — escala neutra pura (croma 0) */
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.16 0 0);
  --surface: oklch(0.975 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.16 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.16 0 0);

  /* Acción principal: negro sobre blanco */
  --primary: oklch(0.16 0 0);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.96 0 0);
  --secondary-foreground: oklch(0.22 0 0);
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.52 0 0);
  --accent: oklch(0.955 0 0);
  --accent-foreground: oklch(0.2 0 0);

  --border: oklch(0.9 0 0);
  --border-strong: oklch(0.78 0 0);
  --input: oklch(0.9 0 0);
  --ring: oklch(0.16 0 0);

  /* Cifras informativas — ÚNICO lugar de la interfaz con color */
  --num-positive: oklch(0.52 0.13 155);
  --num-negative: oklch(0.55 0.19 27);
  --num-warning: oklch(0.6 0.12 75);

  /* Acción destructiva (botón de borrar), no decoración */
  --destructive: oklch(0.55 0.19 27);

  /* Gráficos: escala de grises. Recharts se diferencia por trazo y etiqueta. */
  --chart-1: oklch(0.22 0 0);
  --chart-2: oklch(0.4 0 0);
  --chart-3: oklch(0.56 0 0);
  --chart-4: oklch(0.71 0 0);
  --chart-5: oklch(0.84 0 0);

  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.16 0 0);
  --sidebar-primary: oklch(0.16 0 0);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.955 0 0);
  --sidebar-accent-foreground: oklch(0.2 0 0);
  --sidebar-border: oklch(0.9 0 0);
  --sidebar-ring: oklch(0.16 0 0);

  /* Movimiento */
  --dur-fast: 120ms;
  --dur-base: 200ms;
  --dur-slow: 420ms;
  --ease-salida: cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Paso 4: Reemplazar el bloque `.dark`**

```css
.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.97 0 0);
  --surface: oklch(0.19 0 0);
  --card: oklch(0.19 0 0);
  --card-foreground: oklch(0.97 0 0);
  --popover: oklch(0.21 0 0);
  --popover-foreground: oklch(0.97 0 0);

  --primary: oklch(0.97 0 0);
  --primary-foreground: oklch(0.16 0 0);
  --secondary: oklch(0.26 0 0);
  --secondary-foreground: oklch(0.97 0 0);
  --muted: oklch(0.25 0 0);
  --muted-foreground: oklch(0.68 0 0);
  --accent: oklch(0.27 0 0);
  --accent-foreground: oklch(0.97 0 0);

  --border: oklch(0.3 0 0);
  --border-strong: oklch(0.44 0 0);
  --input: oklch(0.32 0 0);
  --ring: oklch(0.8 0 0);

  --num-positive: oklch(0.75 0.15 155);
  --num-negative: oklch(0.7 0.17 27);
  --num-warning: oklch(0.79 0.13 75);

  --destructive: oklch(0.7 0.17 27);

  --chart-1: oklch(0.95 0 0);
  --chart-2: oklch(0.78 0 0);
  --chart-3: oklch(0.62 0 0);
  --chart-4: oklch(0.47 0 0);
  --chart-5: oklch(0.35 0 0);

  --sidebar: oklch(0.17 0 0);
  --sidebar-foreground: oklch(0.97 0 0);
  --sidebar-primary: oklch(0.97 0 0);
  --sidebar-primary-foreground: oklch(0.16 0 0);
  --sidebar-accent: oklch(0.25 0 0);
  --sidebar-accent-foreground: oklch(0.97 0 0);
  --sidebar-border: oklch(0.3 0 0);
  --sidebar-ring: oklch(0.8 0 0);
}
```

- [ ] **Paso 5: Exponer los tokens nuevos a Tailwind**

Dentro del bloque `@theme inline { … }` que ya existe al inicio de `globals.css`, agregar estas líneas junto a las demás `--color-*`:

```css
  --color-surface: var(--surface);
  --color-border-strong: var(--border-strong);
  --color-num-positive: var(--num-positive);
  --color-num-negative: var(--num-negative);
  --color-num-warning: var(--num-warning);
```

- [ ] **Paso 6: Neutralizar el shimmer del skeleton**

En `globals.css`, la clase `.animate-skeleton-shimmer` y su variante `.dark` ya usan `oklch(… 0 0)` (neutras). Verificar que sigan así después de los cambios; no requieren edición.

- [ ] **Paso 7: Crear `src/components/providers/ThemeProvider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Paso 8: Crear `src/components/layout/ThemeToggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  // Evita el desajuste de hidratación: en el servidor no se conoce el tema.
  useEffect(() => setMontado(true), []);

  const oscuro = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={() => setTheme(oscuro ? "light" : "dark")}
    >
      {montado && oscuro ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
```

- [ ] **Paso 9: Montar el provider en `src/app/layout.tsx`**

Agregar el import y envolver. El `<html>` necesita `suppressHydrationWarning` porque `next-themes` escribe la clase antes de la hidratación:

```tsx
import { ThemeProvider } from "@/components/providers/ThemeProvider";
```

```tsx
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
```

- [ ] **Paso 10: Montar el toggle en el sidebar**

En `src/app/(dashboard)/layout.tsx`, importar `ThemeToggle` y ponerlo junto al `UserMenu`:

```tsx
import { ThemeToggle } from "@/components/layout/ThemeToggle";
```

```tsx
          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
            <div className="min-w-0 flex-1">
              <UserMenu />
            </div>
            <ThemeToggle />
          </div>
```

- [ ] **Paso 11: Correr el test para verlo pasar**

```bash
npx vitest run tests/tokens.test.ts
```

Esperado: PASS.

- [ ] **Paso 12: Verificación visual**

```bash
npm run dev
```

Comprobar en `http://localhost:3000`:
- No queda nada teal/verde azulado en la interfaz. El botón "Nueva venta" y el ítem activo del sidebar son negros.
- El toggle del sidebar cambia claro ↔ oscuro y **persiste al recargar**.
- El único color que se ve son las cifras (todavía no migradas — eso lo hacen las tareas de hoja).

- [ ] **Paso 13: Verificación completa y commit**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

```bash
git add src/app/globals.css src/app/layout.tsx "src/app/(dashboard)/layout.tsx" src/components/providers/ThemeProvider.tsx src/components/layout/ThemeToggle.tsx tests/tokens.test.ts
git commit -m "feat(ui): paleta monocroma en tokens y modo oscuro funcional"
```

---

### Tarea 4: Botones que nunca se quedan colgados

Pedido textual de Mateo: *"animaciones de cargas en botones de acciones (que no se queden colgadas ni congeladas)"*. Hoy 24 botones hacen `disabled={saving}` sin ningún indicador, y solo `ProductoForm` y `ProveedorForm` muestran un `Loader2` armado a mano.

La solución tiene dos partes: un prop `loading` en `Button` y un hook `useAsyncAction` con **perro guardián**, que garantiza que el estado se apague aunque la promesa nunca resuelva.

**Files:**
- Create: `src/components/ui/spinner.tsx`
- Modify: `src/components/ui/button.tsx`
- Create: `src/hooks/use-async-action.ts`
- Test: `tests/button-loading.test.tsx`
- Test: `tests/use-async-action.test.ts`

**Interfaces:**
- Consumes: tokens de la Tarea 3.
- Produces:
  - `<Spinner className?: string />` — círculo giratorio con `currentColor`, respeta `motion-reduce`.
  - `<Button loading?: boolean loadingText?: string … />` — cuando `loading` es `true`: muestra `Spinner`, queda `disabled`, expone `aria-busy="true"`, y **mantiene el ancho** (el texto no se reemplaza, salvo que se pase `loadingText`).
  - `useAsyncAction<TArgs extends unknown[], TResult>(fn, opciones?) => { run, loading }` donde `opciones?: { timeoutMs?: number }` (por defecto `15000`). `run` ignora invocaciones mientras hay una en vuelo y devuelve `undefined` en ese caso.

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `tests/button-loading.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button con estado de carga", () => {
  it("sin loading no muestra indicador y es clickeable", async () => {
    const alHacerClic = vi.fn();
    render(<Button onClick={alHacerClic}>Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).not.toHaveAttribute("aria-busy", "true");
    expect(boton.querySelector("[data-slot='spinner']")).toBeNull();
    await userEvent.click(boton);
    expect(alHacerClic).toHaveBeenCalledOnce();
  });

  it("con loading muestra el spinner, queda deshabilitado y marca aria-busy", () => {
    render(<Button loading>Guardar</Button>);
    const boton = screen.getByRole("button");
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(boton.querySelector("[data-slot='spinner']")).not.toBeNull();
  });

  it("con loading no dispara onClick", async () => {
    const alHacerClic = vi.fn();
    render(
      <Button loading onClick={alHacerClic}>
        Guardar
      </Button>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(alHacerClic).not.toHaveBeenCalled();
  });

  it("conserva el texto original si no se pasa loadingText", () => {
    render(<Button loading>Guardar</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Guardar");
  });

  it("usa loadingText cuando se lo pasan", () => {
    render(
      <Button loading loadingText="Guardando…">
        Guardar
      </Button>
    );
    expect(screen.getByRole("button")).toHaveTextContent("Guardando…");
  });

  it("respeta disabled propio aunque no esté cargando", () => {
    render(<Button disabled>Guardar</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

Crear `tests/use-async-action.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncAction } from "@/hooks/use-async-action";

describe("useAsyncAction", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("arranca sin cargar", () => {
    const { result } = renderHook(() => useAsyncAction(async () => "ok"));
    expect(result.current.loading).toBe(false);
  });

  it("marca loading mientras corre y lo apaga al terminar", async () => {
    let resolver: (v: string) => void = () => {};
    const promesa = new Promise<string>((res) => {
      resolver = res;
    });
    const { result } = renderHook(() => useAsyncAction(() => promesa));

    let devuelto: Promise<string | undefined>;
    act(() => {
      devuelto = result.current.run();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      resolver("listo");
      await devuelto;
    });
    expect(result.current.loading).toBe(false);
  });

  it("apaga loading aunque la promesa falle, y propaga el error", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => {
        throw new Error("explotó");
      })
    );
    await act(async () => {
      await expect(result.current.run()).rejects.toThrow("explotó");
    });
    expect(result.current.loading).toBe(false);
  });

  it("ignora clics repetidos mientras hay una acción en vuelo", async () => {
    const fn = vi.fn(
      () => new Promise<string>((res) => setTimeout(() => res("ok"), 100))
    );
    const { result } = renderHook(() => useAsyncAction(fn));

    await act(async () => {
      const a = result.current.run();
      const b = result.current.run();
      await expect(b).resolves.toBeUndefined();
      vi.advanceTimersByTime(100);
      await a;
    });
    expect(fn).toHaveBeenCalledOnce();
  });

  it("el perro guardián apaga loading si la promesa nunca resuelve", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(() => new Promise<void>(() => {}), { timeoutMs: 1000 })
    );
    act(() => {
      void result.current.run();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Paso 2: Correr los tests para verlos fallar**

```bash
npx vitest run tests/button-loading.test.tsx tests/use-async-action.test.ts
```

Esperado: FALLA — `Button` no acepta `loading` y `@/hooks/use-async-action` no existe.

- [ ] **Paso 3: Crear `src/components/ui/spinner.tsx`**

```tsx
import { cn } from "@/lib/utils";

/**
 * Único indicador de carga de la app. Hereda el color del texto,
 * así que sirve sobre cualquier variante de botón.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      data-slot="spinner"
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full",
        "border-2 border-current/25 border-t-current",
        "motion-reduce:animate-none",
        className
      )}
    />
  );
}
```

- [ ] **Paso 4: Agregar `loading` a `src/components/ui/button.tsx`**

Agregar el import del spinner y reemplazar la función `Button` (el `buttonVariants` queda igual):

```tsx
import { Spinner } from "@/components/ui/spinner"
```

```tsx
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Muestra el indicador de carga y bloquea el botón. */
    loading?: boolean
    /** Texto alternativo mientras carga. Si se omite, se conserva el original. */
    loadingText?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"

  // Con asChild el hijo es un elemento ajeno (Link, etc.): no le inyectamos spinner.
  const contenido = asChild ? (
    children
  ) : (
    <>
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </>
  )

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {contenido}
    </Comp>
  )
}
```

- [ ] **Paso 5: Crear `src/hooks/use-async-action.ts`**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OpcionesAsyncAction {
  /**
   * Perro guardián: si la promesa no resuelve en este tiempo, se apaga el
   * indicador igual. Existe para que un botón nunca quede congelado por una
   * request colgada. Por defecto 15 s.
   */
  timeoutMs?: number;
}

/**
 * Envuelve una acción asíncrona y expone su estado de carga.
 *
 * Garantías:
 * - `loading` siempre vuelve a `false`: en éxito, en error, y por timeout.
 * - Los clics repetidos mientras hay una acción en vuelo se ignoran
 *   (devuelven `undefined`), así no se duplican altas.
 * - No se actualiza el estado después de desmontar el componente.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opciones: OpcionesAsyncAction = {}
) {
  const { timeoutMs = 15_000 } = opciones;
  const [loading, setLoading] = useState(false);

  const enVuelo = useRef(false);
  const montado = useRef(true);
  const guardian = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (guardian.current) clearTimeout(guardian.current);
    };
  }, []);

  const apagar = useCallback(() => {
    enVuelo.current = false;
    if (guardian.current) {
      clearTimeout(guardian.current);
      guardian.current = null;
    }
    if (montado.current) setLoading(false);
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (enVuelo.current) return undefined;
      enVuelo.current = true;
      setLoading(true);
      guardian.current = setTimeout(apagar, timeoutMs);

      try {
        return await fnRef.current(...args);
      } finally {
        apagar();
      }
    },
    [apagar, timeoutMs]
  );

  return { run, loading };
}
```

- [ ] **Paso 6: Correr los tests para verlos pasar**

```bash
npx vitest run tests/button-loading.test.tsx tests/use-async-action.test.ts
```

Esperado: PASS.

- [ ] **Paso 7: Documentar en `docs/design-system.md`**

En la sección **Primitivas**, agregar la entrada de `Button`/`Spinner`/`useAsyncAction` con este ejemplo canónico, que es el que van a copiar las tareas de hoja:

````markdown
### Acción asíncrona

```tsx
const { run: guardar, loading } = useAsyncAction(async () => {
  const res = await fetch("/api/clientes", { method: "POST", body });
  if (!res.ok) throw new Error("No se pudo guardar el cliente");
  notificar.ok("Cliente guardado");
});

<Button loading={loading} loadingText="Guardando…" onClick={() => void guardar()}>
  Guardar cliente
</Button>
```

Nunca `disabled={saving}` a secas: el usuario no ve que algo está pasando.
````

- [ ] **Paso 8: Verificación completa y commit**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

```bash
git add src/components/ui/spinner.tsx src/components/ui/button.tsx src/hooks/use-async-action.ts tests/button-loading.test.tsx tests/use-async-action.test.ts docs/design-system.md
git commit -m "feat(ui): boton con estado de carga y hook useAsyncAction con perro guardian"
```

---

### Tarea 5: Toasts abajo a la derecha

Pedido textual: *"avisos de sistema no por visualización default del navegador el pop up, sino toast abajo a la derecha prolijo"*. La buena noticia: no hay ni un `alert()` ni un `confirm()` en el código, y `sonner` ya está montado. Pero está en `position="top-center"`, con `richColors` (verde/rojo/ámbar saturados, contra el prompt negativo) y `theme="light"` fijo, que rompe el modo oscuro de la Tarea 3.

**Files:**
- Modify: `src/components/ui/sonner.tsx`
- Create: `src/lib/notificar.ts`
- Test: `tests/notificar.test.ts`
- Test: `tests/toaster.test.tsx`

**Interfaces:**
- Consumes: tokens (Tarea 3), `ThemeProvider` (Tarea 3).
- Produces: `notificar` — objeto con `ok(mensaje, opciones?)`, `error(mensaje, opciones?)`, `info(mensaje, opciones?)`, `advertencia(mensaje, opciones?)`, y `promesa(promise, textos)` donde `textos: { cargando: string; ok: string | ((valor) => string); error: string | ((e) => string) }`. Todas devuelven el id del toast (`string | number`). `opciones?: { descripcion?: string; duracion?: number }`.

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `tests/notificar.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sonner", () => {
  const base = vi.fn(() => 1);
  return {
    toast: Object.assign(base, {
      success: vi.fn(() => 2),
      error: vi.fn(() => 3),
      warning: vi.fn(() => 4),
      promise: vi.fn(() => 5),
    }),
  };
});

import { toast } from "sonner";
import { notificar } from "@/lib/notificar";

describe("notificar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ok delega en toast.success", () => {
    notificar.ok("Guardado");
    expect(toast.success).toHaveBeenCalledWith("Guardado", expect.any(Object));
  });

  it("error delega en toast.error", () => {
    notificar.error("Falló");
    expect(toast.error).toHaveBeenCalledWith("Falló", expect.any(Object));
  });

  it("advertencia delega en toast.warning", () => {
    notificar.advertencia("Ojo");
    expect(toast.warning).toHaveBeenCalledWith("Ojo", expect.any(Object));
  });

  it("info delega en toast()", () => {
    notificar.info("Dato");
    expect(toast).toHaveBeenCalledWith("Dato", expect.any(Object));
  });

  it("traduce descripcion y duracion a la API de sonner", () => {
    notificar.ok("Guardado", { descripcion: "Cliente V-001", duracion: 8000 });
    expect(toast.success).toHaveBeenCalledWith("Guardado", {
      description: "Cliente V-001",
      duration: 8000,
    });
  });

  it("error acepta un Error y usa su message", () => {
    notificar.error(new Error("Sin stock"));
    expect(toast.error).toHaveBeenCalledWith("Sin stock", expect.any(Object));
  });

  it("error con valor desconocido usa un mensaje genérico", () => {
    notificar.error(undefined);
    expect(toast.error).toHaveBeenCalledWith(
      "Ocurrió un error inesperado",
      expect.any(Object)
    );
  });

  it("promesa delega en toast.promise con las claves de sonner", () => {
    const p = Promise.resolve("x");
    notificar.promesa(p, { cargando: "Guardando…", ok: "Listo", error: "Falló" });
    expect(toast.promise).toHaveBeenCalledWith(p, {
      loading: "Guardando…",
      success: "Listo",
      error: "Falló",
    });
  });
});
```

Crear `tests/toaster.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const capturado: Record<string, unknown> = {};
vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    Object.assign(capturado, props);
    return <div data-testid="toaster" />;
  },
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

import { Toaster } from "@/components/ui/sonner";

describe("Toaster", () => {
  it("se ubica abajo a la derecha", () => {
    render(<Toaster />);
    expect(capturado.position).toBe("bottom-right");
  });

  it("no usa richColors (paleta saturada de sonner)", () => {
    render(<Toaster />);
    expect(capturado.richColors).toBeFalsy();
  });

  it("sigue el tema resuelto en vez de fijar light", () => {
    render(<Toaster />);
    expect(capturado.theme).toBe("light");
  });
});
```

- [ ] **Paso 2: Correr los tests para verlos fallar**

```bash
npx vitest run tests/notificar.test.ts tests/toaster.test.tsx
```

Esperado: FALLA — `@/lib/notificar` no existe y el `Toaster` está en `top-center` con `richColors`.

- [ ] **Paso 3: Reescribir `src/components/ui/sonner.tsx`**

```tsx
"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Avisos de sistema: abajo a la derecha, monocromos y con la jerarquía dada
 * por el borde y el ícono, no por un fondo de color.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      richColors={false}
      closeButton
      duration={5000}
      gap={10}
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-popover text-popover-foreground shadow-sm",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton: "border-border bg-popover text-muted-foreground",
          success: "border-border",
          error: "border-destructive/50",
          warning: "border-border-strong",
          info: "border-border",
          loading: "border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
```

- [ ] **Paso 4: Crear `src/lib/notificar.ts`**

```ts
import { toast } from "sonner";

export interface OpcionesAviso {
  /** Segunda línea, más chica: contexto o número de comprobante. */
  descripcion?: string;
  /** Milisegundos en pantalla. Por defecto los 5000 del Toaster. */
  duracion?: number;
}

function aSonner(opciones: OpcionesAviso = {}) {
  return {
    ...(opciones.descripcion ? { description: opciones.descripcion } : {}),
    ...(opciones.duracion ? { duration: opciones.duracion } : {}),
  };
}

function mensajeDeError(valor: unknown): string {
  if (typeof valor === "string" && valor.trim()) return valor;
  if (valor instanceof Error && valor.message) return valor.message;
  return "Ocurrió un error inesperado";
}

export interface TextosPromesa<T> {
  cargando: string;
  ok: string | ((valor: T) => string);
  error: string | ((error: unknown) => string);
}

/**
 * Única puerta de avisos al usuario. Nada de alert/confirm/prompt del navegador:
 * todo sale como toast abajo a la derecha.
 */
export const notificar = {
  ok: (mensaje: string, opciones?: OpcionesAviso) =>
    toast.success(mensaje, aSonner(opciones)),

  error: (mensaje: unknown, opciones?: OpcionesAviso) =>
    toast.error(mensajeDeError(mensaje), aSonner(opciones)),

  advertencia: (mensaje: string, opciones?: OpcionesAviso) =>
    toast.warning(mensaje, aSonner(opciones)),

  info: (mensaje: string, opciones?: OpcionesAviso) =>
    toast(mensaje, aSonner(opciones)),

  /** Para acciones largas: un solo toast que pasa de cargando a resultado. */
  promesa: <T,>(promesa: Promise<T>, textos: TextosPromesa<T>) =>
    toast.promise(promesa, {
      loading: textos.cargando,
      success: textos.ok,
      error: textos.error,
    }),
};
```

- [ ] **Paso 5: Correr los tests para verlos pasar**

```bash
npx vitest run tests/notificar.test.ts tests/toaster.test.tsx
```

Esperado: PASS.

- [ ] **Paso 6: Verificación visual**

```bash
npm run dev
```

Entrar a `/clientes/nuevo`, guardar un cliente y confirmar que el aviso aparece **abajo a la derecha**, en gris, con botón de cerrar, y que se ve bien en claro y en oscuro.

> Los 14 archivos que hoy importan `toast` de `sonner` directamente **no se migran acá**. Cada tarea de hoja cambia los suyos a `notificar`. Esto es a propósito: mantiene las tareas independientes.

- [ ] **Paso 7: Verificación completa y commit**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

```bash
git add src/components/ui/sonner.tsx src/lib/notificar.ts tests/notificar.test.ts tests/toaster.test.tsx
git commit -m "feat(ui): toasts monocromos abajo a la derecha con fachada notificar"
```

---

### Tarea 6: Superficies y cifras — matar el tarjetón

Pedido textual: *"no uso excesivo de tarjetones"* y *"kpis informativos prolijos y competentes"*. Hoy hay 350+ usos de `<Card>`, y el patrón más repetido es la grilla de KPIs con ícono en cuadrito y `border-l-4` de color, copiada en cuatro páginas.

Se crean las primitivas que las reemplazan. `Card` **no se borra** (sigue siendo válida para diálogos y formularios), pero deja de ser la respuesta por defecto.

**Files:**
- Create: `src/components/ui/panel.tsx`
- Create: `src/components/ui/figure.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Modify: `src/components/ui/stat.tsx`
- Test: `tests/superficies.test.tsx`

**Interfaces:**
- Consumes: tokens (Tarea 3).
- Produces:
  - `<Panel className? children />` — superficie plana: `rounded-lg border border-border bg-card`. Sin sombra, sin degradado, sin borde de color.
  - `<PanelHeader title acciones? descripcion? />` — franja superior con regla inferior.
  - `<PanelBody className? children />` — relleno estándar.
  - `<Figure label valor tono? hint? alineacion? />` con `tono?: "neutro" | "positivo" | "negativo" | "alerta"` (por defecto `"neutro"`) y `alineacion?: "izquierda" | "derecha"` (por defecto `"izquierda"`).
  - `<FigureGrid columnas? children />` con `columnas?: 2 | 3 | 4` (por defecto `4`) — grilla **con divisores compartidos**, no cajas sueltas.
  - `<EmptyState titulo descripcion? accion? icono? />`.
  - `Stat` y `StatGrid` se conservan como alias de `Figure`/`FigureGrid` para no romper `dashboard` y `reportes`, que ya los usan.

- [ ] **Paso 1: Escribir el test que falla**

Crear `tests/superficies.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Figure, FigureGrid } from "@/components/ui/figure";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";

describe("Panel", () => {
  it("es una superficie plana sin borde de color ni degradado ni sombra", () => {
    const { container } = render(
      <Panel>
        <PanelBody>contenido</PanelBody>
      </Panel>
    );
    const clases = container.firstElementChild?.className ?? "";
    expect(clases).toContain("border-border");
    expect(clases).not.toMatch(/border-(?:l|r|t|b)-4/);
    expect(clases).not.toMatch(/bg-gradient/);
    expect(clases).not.toMatch(/shadow-(?:md|lg|xl)/);
  });

  it("PanelHeader muestra título, descripción y acciones", () => {
    render(
      <Panel>
        <PanelHeader
          title="Ventas del mes"
          descripcion="Últimos 30 días"
          acciones={<button>Exportar</button>}
        />
      </Panel>
    );
    expect(screen.getByText("Ventas del mes")).toBeInTheDocument();
    expect(screen.getByText("Últimos 30 días")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });
});

describe("Figure", () => {
  it("muestra label, valor y hint", () => {
    render(<Figure label="Total" valor="$ 1.000" hint="12 ventas" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$ 1.000")).toBeInTheDocument();
    expect(screen.getByText("12 ventas")).toBeInTheDocument();
  });

  it("la cifra usa fuente mono tabular", () => {
    render(<Figure label="Total" valor="$ 1.000" />);
    const clases = screen.getByText("$ 1.000").className;
    expect(clases).toContain("font-mono");
    expect(clases).toContain("tabular-nums");
  });

  it("aplica el color SOLO a la cifra según el tono", () => {
    render(<Figure label="Ganancia" valor="$ 500" tono="positivo" />);
    expect(screen.getByText("$ 500").className).toContain("text-num-positive");
    expect(screen.getByText("Ganancia").className).not.toContain("text-num-positive");
  });

  it("el tono neutro no pinta la cifra", () => {
    render(<Figure label="Total" valor="$ 500" />);
    expect(screen.getByText("$ 500").className).not.toMatch(/text-num-/);
  });

  it("FigureGrid separa con divisores, no con cajas sueltas", () => {
    const { container } = render(
      <FigureGrid columnas={3}>
        <Figure label="A" valor="1" />
        <Figure label="B" valor="2" />
        <Figure label="C" valor="3" />
      </FigureGrid>
    );
    const clases = container.firstElementChild?.className ?? "";
    expect(clases).toContain("divide-");
    expect(clases).toContain("border-border");
  });
});

describe("EmptyState", () => {
  it("muestra el título y la acción", () => {
    render(<EmptyState titulo="Sin ventas" accion={<button>Nueva venta</button>} />);
    expect(screen.getByText("Sin ventas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva venta" })).toBeInTheDocument();
  });
});

describe("compatibilidad", () => {
  it("Stat y StatGrid siguen funcionando", () => {
    render(
      <StatGrid>
        <Stat label="Total" value="$ 1.000" />
      </StatGrid>
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$ 1.000")).toBeInTheDocument();
  });

  it("Stat traduce el tone viejo al tono nuevo", () => {
    render(<Stat label="Ganancia" value="$ 500" tone="positive" />);
    expect(screen.getByText("$ 500").className).toContain("text-num-positive");
  });
});
```

- [ ] **Paso 2: Correr el test para verlo fallar**

```bash
npx vitest run tests/superficies.test.tsx
```

Esperado: FALLA — no existen `panel.tsx`, `figure.tsx` ni `empty-state.tsx`.

- [ ] **Paso 3: Crear `src/components/ui/panel.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Superficie de contenido del sistema. Reemplaza el uso genérico de Card:
 * plana, sin sombra, sin borde de color, sin degradado.
 */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  descripcion,
  acciones,
  className,
}: {
  title: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {descripcion && (
          <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}
```

- [ ] **Paso 4: Crear `src/components/ui/figure.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TonoCifra = "neutro" | "positivo" | "negativo" | "alerta";

const claseTono: Record<TonoCifra, string> = {
  neutro: "text-foreground",
  positivo: "text-num-positive",
  negativo: "text-num-negative",
  alerta: "text-num-warning",
};

/**
 * Cifra informativa. El color vive acá y solo acá: en el número, nunca en el
 * fondo ni en un borde decorativo.
 */
export function Figure({
  label,
  valor,
  hint,
  tono = "neutro",
  alineacion = "izquierda",
  className,
}: {
  label: ReactNode;
  valor: ReactNode;
  hint?: ReactNode;
  tono?: TonoCifra;
  alineacion?: "izquierda" | "derecha";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-4 py-4 sm:px-5",
        alineacion === "derecha" && "text-right",
        className
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums", claseTono[tono])}>
        {valor}
      </p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const claseColumnas: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Fila de cifras. Es UN bloque con divisores internos, no N tarjetas sueltas:
 * eso es lo que saca de encima el look de "tarjetón".
 */
export function FigureGrid({
  columnas = 4,
  className,
  children,
}: {
  columnas?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-card",
        claseColumnas[columnas],
        "sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {children}
    </div>
  );
}
```

> Nota de layout: con más de una fila de cifras (`columnas={4}` y 5+ hijos) los divisores no cierran prolijo. Si una hoja necesita más de 4 cifras, usá dos `FigureGrid` apilados en vez de forzar el wrap.

- [ ] **Paso 5: Crear `src/components/ui/empty-state.tsx`**

```tsx
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Estado vacío monocromo: borde punteado, sin ilustración ni color. */
export function EmptyState({
  titulo,
  descripcion,
  accion,
  icono: Icono,
  className,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className
      )}
    >
      {Icono && <Icono className="size-5 text-muted-foreground" aria-hidden="true" />}
      <p className="text-sm font-medium">{titulo}</p>
      {descripcion && (
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
```

- [ ] **Paso 6: Reescribir `src/components/ui/stat.tsx` como capa de compatibilidad**

`dashboard` y `reportes` ya importan `Stat`/`StatGrid`. En vez de romperlos, se convierten en envoltorio de las primitivas nuevas:

```tsx
import type { ReactNode } from "react";
import { Figure, FigureGrid, type TonoCifra } from "@/components/ui/figure";

/**
 * Compatibilidad con el sistema "libro mayor" anterior.
 * Código nuevo: usá Figure y FigureGrid directamente.
 */

type ToneViejo = "default" | "positive" | "warning" | "muted";

const mapaTono: Record<ToneViejo, TonoCifra> = {
  default: "neutro",
  positive: "positivo",
  warning: "alerta",
  muted: "neutro",
};

export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <FigureGrid columnas={4} className={className}>
      {children}
    </FigureGrid>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: ToneViejo;
  /** Ya no se usa: el punto de acento se eliminó del sistema. */
  accent?: boolean;
  className?: string;
}) {
  return (
    <Figure
      label={label}
      valor={value}
      hint={hint}
      tono={mapaTono[tone]}
      className={className}
    />
  );
}
```

- [ ] **Paso 7: Correr el test para verlo pasar**

```bash
npx vitest run tests/superficies.test.tsx
```

Esperado: PASS.

- [ ] **Paso 8: Documentar las recetas en `docs/design-system.md`**

Completar la sección **Primitivas** con `Panel`, `Figure`, `FigureGrid` y `EmptyState`, y la sección **Cómo NO hacerlo** con este antes/después real:

````markdown
❌ Antes (`src/app/(dashboard)/ventas/[id]/page.tsx`) — cuatro tarjetones con
línea de color, ícono en cuadrito y `hover:shadow-md`:

```tsx
<Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm text-muted-foreground">Ganancia</CardTitle>
    <TrendingUp className="h-5 w-5 text-green-500/70" />
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold tabular-nums text-green-600">{formatARS(x)}</p>
  </CardContent>
</Card>
```

✅ Después — un bloque, divisores compartidos, color solo en la cifra:

```tsx
<FigureGrid columnas={3}>
  <Figure label="Total" valor={formatARS(venta.total)} />
  <Figure label="Ganancia" valor={formatARS(venta.gananciaBruta)} tono="positivo"
          hint={`Margen ${venta.margenPorcentaje.toFixed(1)}%`} />
  <Figure label="Pago" valor={METODO_PAGO_LABEL[venta.metodoPago]} />
</FigureGrid>
```
````

- [ ] **Paso 9: Verificación completa y commit**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

```bash
git add src/components/ui/panel.tsx src/components/ui/figure.tsx src/components/ui/empty-state.tsx src/components/ui/stat.tsx tests/superficies.test.tsx docs/design-system.md
git commit -m "feat(ui): primitivas Panel, Figure y EmptyState en reemplazo del tarjeton"
```

---

### Tarea 7: Sistema de animación

Pedido: *"bien animada"*, sin caer en movimiento gratuito. La app ya tiene dos animaciones sueltas en `globals.css` (`skeleton-shimmer` y `ledger-in`); se formalizan en un sistema con freno por `prefers-reduced-motion` y se agrega el revelado escalonado para filas de tabla.

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/ui/reveal.tsx`
- Test: `tests/reveal.test.tsx`
- Test: `tests/animaciones.test.ts`

**Interfaces:**
- Consumes: variables de movimiento de la Tarea 3 (`--dur-*`, `--ease-salida`).
- Produces:
  - Clases CSS: `.anim-entrada` (fade + 6px de subida), `.anim-entrada-lateral` (fade + 8px desde la izquierda), `.anim-pulso-sutil` (para valores que se actualizan solos).
  - `<Reveal indice? as? className? children />` — aplica `.anim-entrada` con `animation-delay` de `indice * 35ms`, tope 12 (≈420 ms), y `as?: "div" | "tr" | "li"` (por defecto `"div"`).

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `tests/animaciones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

describe("sistema de animación", () => {
  it("define las clases del sistema", () => {
    for (const clase of [".anim-entrada", ".anim-entrada-lateral", ".anim-pulso-sutil"]) {
      expect(css, `Falta ${clase}`).toContain(clase);
    }
  });

  it("las animaciones usan las variables de duración y easing", () => {
    expect(css).toContain("var(--dur-slow)");
    expect(css).toContain("var(--ease-salida)");
  });

  it("hay un bloque de reduced-motion que apaga las animaciones del sistema", () => {
    const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(i).toBeGreaterThan(-1);
    const bloque = css.slice(i, i + 700);
    for (const clase of [".anim-entrada", ".anim-entrada-lateral", ".anim-pulso-sutil"]) {
      expect(bloque, `${clase} no está frenada en reduced-motion`).toContain(clase);
    }
  });
});
```

Crear `tests/reveal.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/ui/reveal";

describe("Reveal", () => {
  it("aplica la clase de entrada", () => {
    render(<Reveal>hola</Reveal>);
    expect(screen.getByText("hola").className).toContain("anim-entrada");
  });

  it("escalona el delay según el índice", () => {
    render(<Reveal indice={3}>fila</Reveal>);
    expect(screen.getByText("fila").style.animationDelay).toBe("105ms");
  });

  it("sin índice no agrega delay", () => {
    render(<Reveal>fila</Reveal>);
    expect(screen.getByText("fila").style.animationDelay).toBe("0ms");
  });

  it("topea el delay para que una lista larga no arranque tardísimo", () => {
    render(<Reveal indice={80}>fila</Reveal>);
    expect(screen.getByText("fila").style.animationDelay).toBe("420ms");
  });

  it("puede renderizar como tr para usarse en tablas", () => {
    render(
      <table>
        <tbody>
          <Reveal as="tr">
            <td>celda</td>
          </Reveal>
        </tbody>
      </table>
    );
    expect(screen.getByText("celda").closest("tr")?.className).toContain("anim-entrada");
  });
});
```

- [ ] **Paso 2: Correr los tests para verlos fallar**

```bash
npx vitest run tests/animaciones.test.ts tests/reveal.test.tsx
```

Esperado: FALLA.

- [ ] **Paso 3: Agregar el sistema de animación a `globals.css`**

Reemplazar el bloque que hoy empieza en `/* Sistema "libro mayor" — revelado escalonado de filas/bloques */` (las reglas `@keyframes ledger-in`, `.ledger-in` y su `@media`) por:

```css
/* ── Sistema de animación ─────────────────────────────────────────────
   Tres gestos y nada más. Todo entra, nada rebota.
   Cada clase tiene su freno en el bloque de reduced-motion de abajo. */

@keyframes anim-entrada {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}

@keyframes anim-entrada-lateral {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: none; }
}

@keyframes anim-pulso-sutil {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

/* Aparición de un bloque o de una fila de tabla. */
.anim-entrada {
  animation: anim-entrada var(--dur-slow) var(--ease-salida) both;
}

/* Aparición de un ítem de lista lateral (nav, filtros). */
.anim-entrada-lateral {
  animation: anim-entrada-lateral var(--dur-base) var(--ease-salida) both;
}

/* Valor que se está refrescando en segundo plano. */
.anim-pulso-sutil {
  animation: anim-pulso-sutil 1.6s ease-in-out infinite;
}

/* Alias del sistema anterior; el código viejo sigue andando. */
.ledger-in {
  animation: anim-entrada var(--dur-slow) var(--ease-salida) both;
}

@media (prefers-reduced-motion: reduce) {
  .anim-entrada,
  .anim-entrada-lateral,
  .anim-pulso-sutil,
  .ledger-in,
  .animate-skeleton-shimmer {
    animation: none !important;
  }
  .anim-entrada,
  .anim-entrada-lateral,
  .ledger-in {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Paso 4: Crear `src/components/ui/reveal.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const PASO_MS = 35;
const TOPE = 12;

/**
 * Revelado escalonado. En una lista, pasar el índice de la fila:
 * el escalonamiento se topea a los 12 elementos para que una tabla larga
 * no arranque a los cinco segundos.
 *
 * El freno de prefers-reduced-motion vive en la clase CSS, no acá.
 */
export function Reveal({
  indice = 0,
  as = "div",
  className,
  children,
}: {
  indice?: number;
  as?: "div" | "tr" | "li";
  className?: string;
  children: ReactNode;
}) {
  const Etiqueta = as;
  const retraso = Math.min(indice, TOPE) * PASO_MS;

  return (
    <Etiqueta
      className={cn("anim-entrada", className)}
      style={{ animationDelay: `${retraso}ms` }}
    >
      {children}
    </Etiqueta>
  );
}
```

- [ ] **Paso 5: Correr los tests para verlos pasar**

```bash
npx vitest run tests/animaciones.test.ts tests/reveal.test.tsx
```

Esperado: PASS.

- [ ] **Paso 6: Verificar que no se rompió el uso viejo de `ledger-in`**

```bash
grep -rn "ledger-in" --include=*.tsx src
```

Cada archivo que salga debe seguir compilando (el alias lo cubre). No hace falta migrarlos acá; lo hace cada tarea de hoja.

- [ ] **Paso 7: Documentar en `docs/design-system.md`**

Agregar la sección **Movimiento**: los tres gestos, cuándo usar cada uno, la regla de `Reveal` para listas, y la prohibición de animar `width`, `height` y `top/left` (solo `opacity` y `transform`).

- [ ] **Paso 8: Verificación completa y commit**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

```bash
git add src/app/globals.css src/components/ui/reveal.tsx tests/animaciones.test.ts tests/reveal.test.tsx docs/design-system.md
git commit -m "feat(ui): sistema de animacion con freno por reduced-motion"
```

---

# FASE 2 — Hojas

## Receta de hoja (procedimiento común)

Las Tareas 9 a 23 son todas la misma operación sobre distinto material. Este es el procedimiento; cada tarea lo instancia con sus archivos y sus detalles propios.

**Antes de empezar la tarea, leé estos dos documentos.** Son el contrato y te ahorran leer el resto del código:

```bash
cat docs/design-system.md
cat docs/mapa-app.md
```

**Los siete movimientos de una hoja:**

1. **Encabezado.** La página usa `<PageHeader overline="Sección · Página" title="…" description="…">` con las acciones como `children`. Si arma un `<h1>` suelto, se reemplaza.
2. **Cifras.** Toda grilla de KPIs en `Card` pasa a `<FigureGrid>` + `<Figure>`. El color se aplica al valor vía `tono`, nunca al fondo ni al borde. Se eliminan los íconos decorativos que acompañaban al KPI.
3. **Superficies.** Los bloques de contenido pasan de `Card`/`CardHeader`/`CardContent` a `Panel`/`PanelHeader`/`PanelBody`. `Card` solo sobrevive dentro de diálogos y formularios donde ya se ve bien.
4. **Tokens.** Se eliminan todas las clases de color de paleta y los hex. Equivalencias:

   | Antes | Después |
   | --- | --- |
   | `bg-white`, `bg-zinc-50` | `bg-card`, `bg-surface` |
   | `text-zinc-900`, `text-slate-900` | `text-foreground` |
   | `text-zinc-500`, `text-gray-500` | `text-muted-foreground` |
   | `border-zinc-200/300`, `border-gray-200` | `border-border` |
   | `bg-zinc-950 text-white` (bloque destacado) | `bg-primary text-primary-foreground` |
   | `text-green-600`, `text-emerald-600` (en una cifra) | `tono="positivo"` / `text-num-positive` |
   | `text-red-600` (en una cifra) | `tono="negativo"` / `text-num-negative` |
   | `text-amber-600` (en una cifra) | `tono="alerta"` / `text-num-warning` |
   | `text-blue-*`, `text-indigo-*`, `text-purple-*` | sin color: `text-foreground` |

5. **Carga.** Todo `fetch` de acción pasa por `useAsyncAction`; su botón recibe `loading` y `loadingText`. Se borran los `useState` de `saving`/`loading` que quedan sin uso.
6. **Avisos.** `import { toast } from "sonner"` pasa a `import { notificar } from "@/lib/notificar"`. `toast.success(x)` → `notificar.ok(x)`; `toast.error(x)` → `notificar.error(x)`; `toast(x)` → `notificar.info(x)`.
7. **Vacíos y movimiento.** Los "no hay nada" pasan a `<EmptyState>`. Las filas de tabla y los bloques que aparecen tras cargar se envuelven en `<Reveal indice={i} as="tr">`.

**Cierre obligatorio de toda tarea de hoja:**

- [ ] Borrar de `PENDIENTES` en `tests/design-guard.test.ts` **exactamente** las rutas de esta hoja. Ni una más.
- [ ] `npx vitest run` — la guardia tiene que pasar con esas rutas ya fuera de la lista.
- [ ] Revisar con el subagente: dispatch a `ui-consistency` con el prompt *"Revisá la hoja X. Archivos: …"*. Aplicar los hallazgos de severidad **alta** y **media**. Los **bajos** son criterio del ejecutor.
- [ ] `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
- [ ] `npm run dev` y mirar la pantalla en claro y en oscuro.
- [ ] Commit con mensaje `feat(ui): hoja <nombre> monocroma`.

**Si en el camino aparece algo que toca plata:** no lo toques, anotalo en `docs/pendientes-plata.md` y seguí.

---

### Tarea 8: Navegación agrupada

El sidebar es una lista plana de 15 ítems sin jerarquía, con el activo en `bg-primary/10 text-primary` y una barrita de acento. Se agrupa en las tres secciones que define `docs/mapa-app.md` y se pasa a un activo monocromo.

**Files:**
- Modify: `src/lib/nav-config.tsx`
- Modify: `src/components/layout/SidebarNav.tsx`
- Modify: `src/components/layout/MobileNav.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Test: `tests/nav.test.tsx`

**Interfaces:**
- Consumes: tokens (Tarea 3), `Reveal` (Tarea 7).
- Produces: `nav-config.tsx` exporta además `type GrupoNav = { titulo: string; items: NavItem[] }` y `gruposNav(esAdmin: boolean): GrupoNav[]`. Se conservan `navBase`, `navAdmin`, `navMobile` e `isActive` con la misma firma: `MobileNav` y cualquier otro consumidor no se rompen.

- [ ] **Paso 1: Escribir el test que falla**

Crear `tests/nav.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { gruposNav, isActive, navBase } from "@/lib/nav-config";

describe("gruposNav", () => {
  it("devuelve las tres secciones para un vendedor", () => {
    expect(gruposNav(false).map((g) => g.titulo)).toEqual([
      "Operación",
      "Mercadería",
      "Administración",
    ]);
  });

  it("no filtra rutas de admin para un vendedor", () => {
    const hrefs = gruposNav(false).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/usuarios");
    expect(hrefs).not.toContain("/estadisticas-vendedores");
  });

  it("suma las rutas de admin cuando corresponde", () => {
    const hrefs = gruposNav(true).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/usuarios");
    expect(hrefs).toContain("/estadisticas-vendedores");
  });

  it("no pierde ninguna ruta de navBase al agrupar", () => {
    const agrupadas = gruposNav(true).flatMap((g) => g.items.map((i) => i.href));
    for (const item of navBase) {
      expect(agrupadas, `Se perdió ${item.href} al agrupar`).toContain(item.href);
    }
  });

  it("ninguna ruta aparece en dos grupos", () => {
    const hrefs = gruposNav(true).flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("isActive", () => {
  it("marca la ruta exacta", () => {
    expect(isActive("/ventas", "/ventas", navBase)).toBe(true);
  });

  it("no marca el inicio desde una subruta", () => {
    expect(isActive("/ventas", "/", navBase)).toBe(false);
  });

  it("prefiere la ruta más específica", () => {
    expect(isActive("/ventas/nueva", "/ventas", navBase)).toBe(false);
    expect(isActive("/ventas/nueva", "/ventas/nueva", navBase)).toBe(true);
  });

  it("marca el padre en una subruta que no tiene ítem propio", () => {
    expect(isActive("/ventas/abc123", "/ventas", navBase)).toBe(true);
  });
});
```

- [ ] **Paso 2: Correr el test para verlo fallar**

```bash
npx vitest run tests/nav.test.tsx
```

Esperado: FALLA — `gruposNav` no existe.

- [ ] **Paso 3: Agregar `gruposNav` a `src/lib/nav-config.tsx`**

Al final del archivo, **sin tocar** `navBase`, `navAdmin`, `navMobile` ni `isActive`:

```tsx
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
```

- [ ] **Paso 4: Reescribir `src/components/layout/SidebarNav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { gruposNav, isActive, navAdmin, navBase } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === "ADMIN";
  const grupos = gruposNav(esAdmin);
  const todos = [...navBase, ...(esAdmin ? navAdmin : [])];

  return (
    <nav className="flex flex-col gap-5">
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    "duration-[--dur-fast]",
                    activo
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
  );
}
```

- [ ] **Paso 5: Aplicar la receta de hoja a `MobileNav.tsx` y al layout**

```bash
cat src/components/layout/MobileNav.tsx
```

Aplicar los movimientos 4 (tokens) y 7 (movimiento) de la receta. En `src/app/(dashboard)/layout.tsx`, el botón "+ Venta" del header móvil ya usa `bg-primary`: con los tokens nuevos queda negro, no hace falta tocarlo.

- [ ] **Paso 6: Correr el test para verlo pasar**

```bash
npx vitest run tests/nav.test.tsx
```

- [ ] **Paso 7: Cierre de hoja**

Seguir el **Cierre obligatorio de toda tarea de hoja**. Rutas a sacar de `PENDIENTES` (si están): `src/components/layout/MobileNav.tsx`, `src/components/layout/SidebarNav.tsx`.

Commit: `feat(ui): navegacion agrupada por seccion, activo monocromo`

---

### Tarea 9: Hoja Inicio

**Files:**
- Modify: `src/app/(dashboard)/page.tsx` (533 líneas)
- Test: `tests/dashboard-charts.test.ts`

**Interfaces:**
- Consumes: `Figure`/`FigureGrid` (Tarea 6), `Panel` (Tarea 6), `Reveal` (Tarea 7), `EmptyState` (Tarea 6), `notificar` (Tarea 5), tokens de gráfico `--chart-1..5` (Tarea 3).
- Produces: `src/lib/chart-theme.ts` con `COLORES_GRAFICO: string[]` (5 grises, leídos de las variables CSS) y `ejeGrafico` (props comunes de `XAxis`/`YAxis`). Lo reusa la Tarea 20 (Reportes).

- [ ] **Paso 1: Escribir el test que falla**

Crear `tests/dashboard-charts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COLORES_GRAFICO } from "@/lib/chart-theme";

describe("tema de gráficos", () => {
  it("tiene cinco series", () => {
    expect(COLORES_GRAFICO).toHaveLength(5);
  });

  it("todas las series salen de variables CSS, no de hex", () => {
    for (const color of COLORES_GRAFICO) {
      expect(color).toMatch(/^var\(--chart-[1-5]\)$/);
    }
  });

  it("no hay hex hardcodeado", () => {
    for (const color of COLORES_GRAFICO) {
      expect(color).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
```

- [ ] **Paso 2: Correr el test para verlo fallar**

```bash
npx vitest run tests/dashboard-charts.test.ts
```

- [ ] **Paso 3: Crear `src/lib/chart-theme.ts`**

```ts
/**
 * Tema de gráficos: escala de grises. Las series se distinguen por posición,
 * etiqueta y trazo, nunca solo por el tono (accesibilidad + regla monocroma).
 * Recharts acepta `var(--…)` como color de relleno y trazo.
 */
export const COLORES_GRAFICO = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Props compartidas de los ejes: tipografía chica, sin línea de eje. */
export const ejeGrafico = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  axisLine: { stroke: "var(--border)" },
  tickLine: false,
} as const;

/** Props del tooltip para que siga la superficie del tema. */
export const tooltipGrafico = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    fontSize: "12px",
    color: "var(--popover-foreground)",
  },
  cursor: { fill: "var(--accent)" },
} as const;
```

- [ ] **Paso 4: Reemplazar el `CHART_COLORS` del dashboard**

En `src/app/(dashboard)/page.tsx` está esta constante, que es el hex hardcodeado más visible del proyecto:

```tsx
const CHART_COLORS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ec4899", // pink
  "#3b82f6", // blue
];
```

Borrarla y usar el import:

```tsx
import { COLORES_GRAFICO, ejeGrafico, tooltipGrafico } from "@/lib/chart-theme";
```

Actualizar cada uso: `<Cell fill={CHART_COLORS[i % CHART_COLORS.length]} />` → `<Cell fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]} />`. En `<Bar>` poner `fill="var(--chart-1)"`. En `<XAxis>`/`<YAxis>` esparcir `{...ejeGrafico}`. En `<Tooltip>` esparcir `{...tooltipGrafico}`. En `<CartesianGrid>` poner `stroke="var(--border)"` y `strokeDasharray="3 3"`.

- [ ] **Paso 5: Aplicar los siete movimientos de la receta de hoja**

Puntos concretos de esta página:

- Los `<Stat>` existentes ya funcionan (la Tarea 6 los convirtió en `Figure`). Revisar que el `tone` de cada uno sea el correcto y quitar el prop `accent`, que ya no hace nada.
- El bloque de "Productos con stock bajo": la cifra de stock va con `tono="alerta"`; el resto de la fila, neutro.
- El bloque de "Últimas ventas" y el de stock bajo pasan a `Panel` + `PanelHeader` + `PanelBody`, con las filas en `<Reveal indice={i}>`.
- Los accesos rápidos del final (la grilla de módulos con ícono) se rehacen sin cuadraditos: una lista de enlaces con ícono en línea y regla divisoria.
- El manejo de `loadError` pasa a `EmptyState` con acción "Reintentar", más `notificar.error` al fallar el fetch.
- El pie chart de métodos de pago necesita etiquetas legibles en gris: agregar `label` con el nombre y el porcentaje, porque cinco grises sin etiqueta no se distinguen.

- [ ] **Paso 6: Correr el test para verlo pasar y cerrar la hoja**

```bash
npx vitest run tests/dashboard-charts.test.ts
```

Cierre obligatorio. Rutas a sacar de `PENDIENTES`: `src/app/(dashboard)/page.tsx`.

Commit: `feat(ui): hoja inicio monocroma con graficos en escala de grises`

---

### Tarea 10: Hoja Ventas — listado

**Files:**
- Modify: `src/app/(dashboard)/ventas/page.tsx`
- Modify: `src/app/(dashboard)/ventas/VentasTable.tsx` (232 líneas)

**Interfaces:**
- Consumes: `Panel`, `EmptyState`, `Reveal`, `Figure`, `notificar`, `useAsyncAction`.
- Produces: nada nuevo. Establece el **patrón canónico de tabla** que copian las Tareas 14 a 21: `Panel` > `PanelHeader` con filtros en `acciones` > `Table` > filas en `Reveal as="tr"` > `EmptyState` cuando no hay datos.

- [ ] **Paso 1: Leer los dos archivos**

```bash
cat "src/app/(dashboard)/ventas/page.tsx" "src/app/(dashboard)/ventas/VentasTable.tsx"
```

- [ ] **Paso 2: Aplicar los siete movimientos de la receta**

Puntos concretos:

- La tabla se envuelve en `Panel`; los filtros y el buscador van en `acciones` de `PanelHeader`.
- Columnas de plata (`total`, `ganancia`) alineadas a la derecha con `text-right font-mono tabular-nums`.
- El badge de estado de venta deja de tener color: `variant="outline"` para todos, y las anuladas se distinguen con `line-through text-muted-foreground` más el texto "Anulada".
- Filas en `<Reveal as="tr" indice={i}>`.
- Sin resultados → `EmptyState` con título "No hay ventas en este período" y acción "Nueva venta".

- [ ] **Paso 3: Escribir el patrón en `docs/design-system.md`**

En la sección **Recetas**, agregar "Tabla de listado" con el código real que quedó en `VentasTable.tsx` (la estructura `Panel` → `PanelHeader` → `Table` → `Reveal` → `EmptyState`). Es lo que van a copiar las hojas siguientes.

- [ ] **Paso 4: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: `src/app/(dashboard)/ventas/page.tsx`, `src/app/(dashboard)/ventas/VentasTable.tsx`.

Commit: `feat(ui): hoja ventas listado monocroma`

---

### Tarea 11: Hoja Ventas — detalle

Acá vive la peor concentración de lo que Mateo pidió eliminar: **cinco** `Card` con `border-l-4` de cinco colores distintos (`primary`, `green-500`, `blue-500`, `amber-500`, `blue-500`), cada una con su ícono de color y `hover:shadow-md`.

**Files:**
- Modify: `src/app/(dashboard)/ventas/[id]/page.tsx` (451 líneas)
- Modify: `src/components/ventas/TicketVenta.tsx`
- Modify: `src/components/ventas/GuardarDatosCliente.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `Panel`, `Figure`/`FigureGrid`, `notificar`, `useAsyncAction`.
- Produces: nada nuevo.

- [ ] **Paso 1: Confirmar los bloques a eliminar**

```bash
grep -n "border-l-4" "src/app/(dashboard)/ventas/[id]/page.tsx"
```

Esperado: 5 coincidencias.

- [ ] **Paso 2: Reemplazar la grilla de KPIs**

El bloque que arranca en el comentario `{/* ── KPIs ───…` y termina antes de `{/* ── Pago dividido …` se reemplaza por:

```tsx
      <FigureGrid columnas={venta.deudaConsignacion > 0 ? 4 : 3}>
        <Figure
          label="Total"
          valor={formatARS(venta.total)}
          hint={
            venta.descuento > 0
              ? `Sub. ${formatARS(venta.subtotal)} · Desc. ${formatARS(venta.descuento)}`
              : undefined
          }
        />
        <Figure
          label="Ganancia"
          valor={formatARS(venta.gananciaBruta)}
          tono="positivo"
          hint={`Costo ${formatARS(venta.costoTotal)} · Margen ${venta.margenPorcentaje.toFixed(1)}%`}
        />
        <Figure
          label="Pago"
          valor={METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago}
          hint={
            pagoDividido
              ? `+ ${METODO_PAGO_LABEL[venta.metodoPagoSecundario ?? ""] ?? venta.metodoPagoSecundario} (dividido)`
              : undefined
          }
        />
        {venta.deudaConsignacion > 0 && (
          <Figure
            label="Consignación"
            valor={formatARS(venta.deudaConsignacion)}
            tono="alerta"
            hint="Deuda a proveedores"
          />
        )}
      </FigureGrid>
```

Agregar el import:

```tsx
import { Figure, FigureGrid } from "@/components/ui/figure";
```

Quitar de los imports de `lucide-react` los íconos que quedaron sin uso (`DollarSign`, `TrendingUp`, `CreditCard`, y `Package` si no se usa en otro lado del archivo).

> ⚠️ Solo se mueven de lugar valores **ya calculados** (`venta.total`, `venta.gananciaBruta`, …). No se recalcula nada. Eso mantiene la tarea fuera de la regla de plata.

- [ ] **Paso 3: Reemplazar el panel de pago dividido**

El `<Card className="min-w-0 overflow-hidden border-l-4 border-l-blue-500 shadow-sm">` pasa a:

```tsx
        <Panel className="min-w-0">
          <PanelHeader
            title="Detalle pago dividido"
            acciones={<Badge variant="outline">2 medios</Badge>}
          />
          <PanelBody>
            {/* … el contenido interno se conserva tal cual, cambiando
                bg-muted/40 por bg-surface y sin tocar ningún cálculo … */}
          </PanelBody>
        </Panel>
```

- [ ] **Paso 4: Aplicar el resto de la receta**

- El encabezado a mano pasa a `PageHeader` con `overline={"Operación · Venta " + venta.numeroVenta}`.
- Las acciones (Imprimir ticket, Anular, Nueva venta) van como `children` del `PageHeader`; la de anular usa `useAsyncAction` + `loading` + `AlertDialog` de confirmación.
- `import { toast } from "sonner"` → `notificar`.
- La tabla de ítems pasa a `Panel` con las filas en `Reveal`.
- `TicketVenta.tsx`: es un documento de impresión. Se deja monocromo con tokens, pero **verificar que el bloque `@media print` de `globals.css` lo siga mostrando**: imprimí en el navegador para confirmarlo.

- [ ] **Paso 5: Verificar que no quedan bordes de color**

```bash
grep -rn "border-l-4\|border-r-4\|border-t-4\|border-b-4" src
```

Esperado: sin salida en toda la carpeta `src` (era el único archivo con 5 y el de reportes lo limpia la Tarea 20 — si esa todavía no corrió, la única coincidencia debe ser `reportes/page.tsx`).

- [ ] **Paso 6: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: `src/app/(dashboard)/ventas/[id]/page.tsx`, `src/components/ventas/TicketVenta.tsx`, `src/components/ventas/GuardarDatosCliente.tsx`.

Commit: `feat(ui): hoja detalle de venta sin tarjetones ni bordes de color`

---

### Tarea 12: Hoja Punto de venta — catálogo con y sin foto

Pedido textual: *"opción de ver catálogo con y sin foto, más cómodo el sistema de registro, la pantalla más completa, más prolija y dinámica, bien explicado el sistema de carga"*.

Hoy `ProductosGridPaginado` tiene una sola vista: grilla de 12 tarjetas con foto, 3 por fila. Con foto se ven 12 productos por pantalla; sin foto entran 25 en la misma superficie, que es lo que sirve cuando ya sabés el SKU. Se agregan **tres** vistas y la preferencia se recuerda.

**Files:**
- Create: `src/components/punto-venta/VistaCatalogoToggle.tsx`
- Create: `src/hooks/use-preferencia-local.ts`
- Modify: `src/components/punto-venta/ProductosGridPaginado.tsx` (407 líneas)
- Create: `src/components/punto-venta/GuiaCarga.tsx`
- Test: `tests/use-preferencia-local.test.ts`
- Test: `tests/vista-catalogo.test.tsx`

**Interfaces:**
- Consumes: `Panel`, `EmptyState`, `Reveal`, tokens, `notificar`.
- Produces:
  - `type VistaCatalogo = "fotos" | "lista" | "compacta"`.
  - `usePreferenciaLocal<T>(clave: string, inicial: T): [T, (v: T) => void]` — persiste en `localStorage`, tolera `localStorage` inaccesible (modo privado) devolviendo el valor en memoria.
  - `<VistaCatalogoToggle valor onCambiar />`.
  - `<GuiaCarga />` — panel plegable que explica el flujo de carga.

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `tests/use-preferencia-local.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePreferenciaLocal } from "@/hooks/use-preferencia-local";

describe("usePreferenciaLocal", () => {
  beforeEach(() => localStorage.clear());

  it("arranca con el valor inicial si no hay nada guardado", () => {
    const { result } = renderHook(() => usePreferenciaLocal("vista", "fotos"));
    expect(result.current[0]).toBe("fotos");
  });

  it("lee lo que había guardado", () => {
    localStorage.setItem("vista", JSON.stringify("compacta"));
    const { result } = renderHook(() => usePreferenciaLocal("vista", "fotos"));
    expect(result.current[0]).toBe("compacta");
  });

  it("persiste el valor nuevo", () => {
    const { result } = renderHook(() => usePreferenciaLocal("vista", "fotos"));
    act(() => result.current[1]("lista"));
    expect(result.current[0]).toBe("lista");
    expect(localStorage.getItem("vista")).toBe(JSON.stringify("lista"));
  });

  it("no explota si localStorage no está disponible", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const { result } = renderHook(() => usePreferenciaLocal("vista", "fotos"));
    expect(result.current[0]).toBe("fotos");
    act(() => result.current[1]("lista"));
    expect(result.current[0]).toBe("lista");
    spy.mockRestore();
  });

  it("cae al inicial si lo guardado es JSON roto", () => {
    localStorage.setItem("vista", "{no es json");
    const { result } = renderHook(() => usePreferenciaLocal("vista", "fotos"));
    expect(result.current[0]).toBe("fotos");
  });
});
```

Crear `tests/vista-catalogo.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VistaCatalogoToggle } from "@/components/punto-venta/VistaCatalogoToggle";

describe("VistaCatalogoToggle", () => {
  it("ofrece las tres vistas", () => {
    render(<VistaCatalogoToggle valor="fotos" onCambiar={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /con foto/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /lista/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /compacta/i })).toBeInTheDocument();
  });

  it("marca la vista activa", () => {
    render(<VistaCatalogoToggle valor="lista" onCambiar={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /lista/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: /con foto/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("avisa el cambio de vista", async () => {
    const alCambiar = vi.fn();
    render(<VistaCatalogoToggle valor="fotos" onCambiar={alCambiar} />);
    await userEvent.click(screen.getByRole("radio", { name: /compacta/i }));
    expect(alCambiar).toHaveBeenCalledWith("compacta");
  });

  it("es un radiogroup accesible", () => {
    render(<VistaCatalogoToggle valor="fotos" onCambiar={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: /vista del catálogo/i })).toBeInTheDocument();
  });
});
```

- [ ] **Paso 2: Correr los tests para verlos fallar**

```bash
npx vitest run tests/use-preferencia-local.test.ts tests/vista-catalogo.test.tsx
```

- [ ] **Paso 3: Crear `src/hooks/use-preferencia-local.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Preferencia de interfaz persistida en el navegador.
 * Tolera localStorage inaccesible (modo privado, cookies bloqueadas):
 * en ese caso la preferencia vive solo en memoria.
 *
 * Arranca SIEMPRE con el valor inicial y lee lo guardado en un efecto,
 * para no romper la hidratación del servidor.
 */
export function usePreferenciaLocal<T>(
  clave: string,
  inicial: T
): [T, (valor: T) => void] {
  const [valor, setValor] = useState<T>(inicial);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado !== null) setValor(JSON.parse(guardado) as T);
    } catch {
      // Sin acceso a localStorage o JSON roto: nos quedamos con el inicial.
    }
  }, [clave]);

  const guardar = useCallback(
    (nuevo: T) => {
      setValor(nuevo);
      try {
        localStorage.setItem(clave, JSON.stringify(nuevo));
      } catch {
        // Preferencia solo en memoria: no es motivo para molestar al usuario.
      }
    },
    [clave]
  );

  return [valor, guardar];
}
```

- [ ] **Paso 4: Crear `src/components/punto-venta/VistaCatalogoToggle.tsx`**

```tsx
"use client";

import { Image as IconoFoto, List, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type VistaCatalogo = "fotos" | "lista" | "compacta";

const OPCIONES: Array<{
  valor: VistaCatalogo;
  etiqueta: string;
  ayuda: string;
  icono: typeof List;
}> = [
  {
    valor: "fotos",
    etiqueta: "Con foto",
    ayuda: "Tarjetas con imagen. Para reconocer el producto de vista.",
    icono: IconoFoto,
  },
  {
    valor: "lista",
    etiqueta: "Lista",
    ayuda: "Filas con nombre, SKU, precio y stock. Sin imagen.",
    icono: List,
  },
  {
    valor: "compacta",
    etiqueta: "Compacta",
    ayuda: "Máxima densidad. Para cargar rápido cuando ya sabés el SKU.",
    icono: Rows3,
  },
];

export function VistaCatalogoToggle({
  valor,
  onCambiar,
  className,
}: {
  valor: VistaCatalogo;
  onCambiar: (v: VistaCatalogo) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Vista del catálogo"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5",
        className
      )}
    >
      {OPCIONES.map((opcion) => {
        const activo = valor === opcion.valor;
        const Icono = opcion.icono;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={opcion.etiqueta}
            title={opcion.ayuda}
            onClick={() => onCambiar(opcion.valor)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors",
              activo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icono className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{opcion.etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Paso 5: Correr los tests para verlos pasar**

```bash
npx vitest run tests/use-preferencia-local.test.ts tests/vista-catalogo.test.tsx
```

- [ ] **Paso 6: Cablear las tres vistas en `ProductosGridPaginado.tsx`**

En el componente:

```tsx
const [vista, setVista] = usePreferenciaLocal<VistaCatalogo>("shop.catalogo.vista", "fotos");
```

El `POR_PAGINA = 12` pasa a depender de la vista, porque sin foto entran muchos más productos por pantalla:

```tsx
const PRODUCTOS_POR_PAGINA: Record<VistaCatalogo, number> = {
  fotos: 12,
  lista: 25,
  compacta: 40,
};
```

Cuidado: al cambiar de vista cambia el tamaño de página, así que hay que volver a la página 1. Agregar:

```tsx
  const cambiarVista = (nueva: VistaCatalogo) => {
    setVista(nueva);
    setPage(1);
  };
```

Y las tres ramas de render:

- **`fotos`** — la grilla actual, sin cambios estructurales: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, imagen arriba. Se le sacan los colores de paleta (movimiento 4 de la receta) y el badge de stock pasa a `variant="outline"`, con la cifra de stock en `text-num-warning` solo si está bajo.
- **`lista`** — filas de 56 px: nombre + SKU a la izquierda, precio y stock a la derecha en `font-mono tabular-nums`, botón "Agregar" al final. Sin imagen.
- **`compacta`** — filas de 36 px, dos columnas en pantallas grandes (`lg:grid-cols-2`): SKU en mono, nombre truncado, precio. La fila entera es el botón de agregar.

En las tres, envolver cada ítem en `<Reveal indice={i}>`.

- [ ] **Paso 7: Crear `src/components/punto-venta/GuiaCarga.tsx`**

Pedido: *"bien explicado el sistema de carga"*. Panel plegable, cerrado por defecto salvo que el carrito esté vacío:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PASOS = [
  {
    titulo: "1 · Buscá el producto",
    detalle:
      "Escribí nombre o SKU en el buscador. Cambiá la vista del catálogo con los botones de arriba a la derecha: con foto para reconocerlo de vista, compacta para cargar rápido.",
  },
  {
    titulo: "2 · Agregalo al carrito",
    detalle:
      "Clic en el producto o en «Agregar». Si el producto ya está en el carrito, se suma a la cantidad existente en vez de duplicar la línea.",
  },
  {
    titulo: "3 · Ajustá cantidades y descuento",
    detalle:
      "Desde el carrito cambiás la cantidad de cada línea o la quitás. El descuento se aplica en porcentaje sobre el subtotal.",
  },
  {
    titulo: "4 · Elegí cliente y forma de pago",
    detalle:
      "El cliente es opcional (consumidor final). Si cobrás con dos medios, activá «Pago dividido»: los importes tienen que sumar el total de la venta.",
  },
  {
    titulo: "5 · Confirmá",
    detalle:
      "Si alguna cantidad supera el stock, el sistema avisa y te deja elegir entre ajustar o continuar igual. Al confirmar se descuenta stock y se abre el detalle con el ticket.",
  },
];

export function GuiaCarga({ abiertaPorDefecto = false }: { abiertaPorDefecto?: boolean }) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        Cómo se carga una venta
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-[--dur-base]",
            "motion-reduce:transition-none",
            abierta && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {abierta && (
        <ol className="anim-entrada divide-y divide-border border-t border-border">
          {PASOS.map((paso) => (
            <li key={paso.titulo} className="px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {paso.titulo}
              </p>
              <p className="mt-1 text-sm leading-6">{paso.detalle}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Paso 8: Rehacer el encabezado de `/ventas/nueva`**

En `src/app/(dashboard)/ventas/nueva/page.tsx`, el `<h1>` a mano se reemplaza por `PageHeader`, y se monta la guía:

```tsx
      <PageHeader
        overline="Operación · Punto de venta"
        title="Nueva venta"
        description="Buscá productos, armá el carrito y cobrá."
      />

      <GuiaCarga abiertaPorDefecto={items.length === 0} />
```

También: el `{error && <p className="mt-2 text-sm text-destructive">{error}</p>}` se elimina, porque el mismo mensaje ya sale por toast — mostrarlo dos veces es ruido. El `useState` de `error` se borra si no queda otro uso.

- [ ] **Paso 9: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: `src/components/punto-venta/ProductosGridPaginado.tsx`, `src/components/punto-venta/BuscadorProductos.tsx`, `src/app/(dashboard)/ventas/nueva/page.tsx`.

Verificación visual extra: probar las tres vistas, recargar y confirmar que la vista elegida se mantiene; probar en mobile.

Commit: `feat(pos): catalogo con tres vistas, preferencia persistida y guia de carga`

---

### Tarea 13: Hoja Punto de venta — carrito

`CarritoVenta.tsx` tiene 763 líneas y 22 usos de color de paleta. Es el componente más denso del proyecto y **toca plata**: calcula previsualizaciones de pago dividido, convierte USD, valida que los tramos sumen el total.

**Esta tarea es exclusivamente visual. No se toca ni una línea de aritmética.**

**Files:**
- Modify: `src/components/punto-venta/CarritoVenta.tsx`

**Interfaces:**
- Consumes: `Panel`, `Figure`, `Button` con `loading`, `notificar`, `useAsyncAction`.
- Produces: nada nuevo.

- [ ] **Paso 1: Marcar la frontera de plata antes de tocar nada**

```bash
grep -n "parseNum\|cotNum\|ars1Preview\|ars2Preview\|sumaPreview\|diffPreview\|handleConfirmar\|togglePagoDividido" src/components/punto-venta/CarritoVenta.tsx
```

**Todas esas funciones y variables son intocables.** Se pueden mover de lugar en el JSX y cambiarles las clases; su cuerpo no se modifica. Si algo parece un bug de cálculo, va a `docs/pendientes-plata.md`, no se arregla acá.

- [ ] **Paso 2: Aplicar los movimientos 3, 4, 5, 6 y 7 de la receta**

- Los `PanelSection` y `SummaryRow` internos (líneas 46 y 70) se reescriben sobre `Panel`/`PanelHeader`/`PanelBody` en vez de sus propias clases.
- El resumen de totales pasa a la forma de "estado de cuenta": Subtotal y Descuento como filas de texto, y el **Total** como bloque invertido `bg-primary text-primary-foreground` con la cifra en `font-mono text-2xl tabular-nums`. Un solo bloque destacado, no tres.
- La previsualización del pago dividido: `sumaPreview` y `diffPreview` se muestran con `Figure`; `diffPreview` va con `tono="negativo"` cuando no es cero y `tono="neutro"` cuando cuadra. **La condición se lee del valor ya calculado; no se recalcula.**
- El botón "Confirmar venta" recibe `loading={isLoading}` y `loadingText="Registrando venta…"`. `isLoading` ya llega por props desde `ventas/nueva/page.tsx`: no hace falta agregar estado nuevo.
- El botón "Cargar datos del cliente" del modal pasa a `useAsyncAction` con `loading`, reemplazando el `guardandoCliente` actual.
- `import { toast } from "sonner"` → `notificar`. El `errorCliente` que hoy se muestra inline pasa a `notificar.error`.

- [ ] **Paso 3: Verificar que la lógica de plata quedó intacta**

```bash
git diff src/components/punto-venta/CarritoVenta.tsx | grep "^[-+]" | grep -v "^[-+][-+]" | grep -i "parsefloat\|totales\.\|\* cot\|/ cot\|toFixed\|Math\."
```

Esperado: **sin salida**. Si aparece cualquier línea, revertila: estás tocando plata.

- [ ] **Paso 4: Probar el flujo completo a mano**

```bash
npm run dev
```

En `/ventas/nueva`: agregar dos productos, aplicar 10 % de descuento, activar pago dividido, poner un tramo en USD con cotización, y confirmar que **los importes mostrados son idénticos a los de antes del cambio**. Comparar contra una captura tomada previamente si hace falta.

- [ ] **Paso 5: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: `src/components/punto-venta/CarritoVenta.tsx`.

Commit: `feat(pos): carrito monocromo con resumen tipo estado de cuenta`

---

### Tarea 14: Hoja Clientes

**Files:**
- Modify: `src/app/(dashboard)/clientes/page.tsx`
- Modify: `src/app/(dashboard)/clientes/ClientesTable.tsx`
- Modify: `src/app/(dashboard)/clientes/nuevo/page.tsx`
- Modify: `src/app/(dashboard)/clientes/[id]/page.tsx`
- Modify: `src/components/forms/ClienteForm.tsx`

**Interfaces:**
- Consumes: el patrón de tabla que quedó documentado en `docs/design-system.md` §Recetas, `Figure`, `Panel`, `EmptyState`, `notificar`, `useAsyncAction`.
- Produces: el **patrón canónico de formulario**, que copian las Tareas 15, 16 y 18: `Panel` > `PanelHeader` > `PanelBody` con `<Form>` de react-hook-form > botones al pie alineados a la derecha, el principal con `loading`.

- [ ] **Paso 1: Aplicar los siete movimientos de la receta**

Puntos concretos:

- `/clientes/[id]`: las métricas del cliente (total de compras, cantidad, ticket promedio, última compra) pasan a `FigureGrid columnas={4}`, todas en `tono="neutro"` — son informativas, no hay bueno ni malo.
- `ClienteForm.tsx`: `disabled={isLoading}` (línea 181) pasa a `loading={isLoading} loadingText="Guardando…"`.
- El histórico de compras del cliente usa el patrón de tabla con `EmptyState` "Todavía no compró nada".

- [ ] **Paso 2: Documentar el patrón de formulario**

Agregar a `docs/design-system.md` §Recetas la sección "Formulario", con el código real que quedó en `ClienteForm.tsx`.

- [ ] **Paso 3: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las cinco de arriba que figuren en la lista.

Commit: `feat(ui): hoja clientes monocroma`

---

### Tarea 15: Hoja Productos

`ProductoForm.tsx` es el archivo más largo del proyecto (768 líneas) y tiene 30 usos de `<Card>` y dos spinners a mano.

**Files:**
- Modify: `src/app/(dashboard)/productos/page.tsx`
- Modify: `src/app/(dashboard)/productos/ProductosTable.tsx`
- Modify: `src/app/(dashboard)/productos/nuevo/page.tsx`
- Modify: `src/app/(dashboard)/productos/[id]/editar/page.tsx`
- Modify: `src/components/forms/ProductoForm.tsx`
- Modify: `src/components/productos/NuevoProductoCliente.tsx`

**Interfaces:**
- Consumes: los patrones de tabla y formulario ya documentados, `Spinner`, `useAsyncAction`, `notificar`.
- Produces: nada nuevo.

- [ ] **Paso 1: Reemplazar los spinners a mano**

```bash
grep -n "Loader2" src/components/forms/ProductoForm.tsx
```

Las cuatro coincidencias pasan a `<Spinner />` (import desde `@/components/ui/spinner`), o directamente desaparecen cuando el botón que las contenía ahora usa `loading`. Quitar `Loader2` del import de `lucide-react` si queda sin uso.

- [ ] **Paso 2: Subida de imagen**

`imagenUploading` pasa a `useAsyncAction`, y el botón de subir recibe `loading` + `loadingText="Subiendo…"`. El área de arrastrar/soltar se rehace monocroma: borde punteado `border-border`, y `border-border-strong` mientras hay un archivo encima.

> **Las fotos de producto conservan su color real.** El `<img>` no lleva ningún filtro.

- [ ] **Paso 3: Aplicar el resto de la receta**

- Las 30 `<Card>` se revisan una por una: las que son secciones del formulario pasan a `Panel`; las que son un simple contenedor con borde se reemplazan por un `div` con `border-border`.
- La tabla de productos: el badge de stock deja de tener color; la **cifra** de stock va con `tono="alerta"` si está por debajo del mínimo y `tono="negativo"` si es cero.
- La carga masiva (`/api/productos/carga-masiva`) usa `notificar.promesa` para un solo toast que va de "Procesando archivo…" al resultado.

- [ ] **Paso 4: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las seis de arriba que figuren.

Commit: `feat(ui): hoja productos monocroma`

---

### Tarea 16: Hoja Proveedores

**Files:**
- Modify: `src/app/(dashboard)/proveedores/page.tsx`
- Modify: `src/app/(dashboard)/proveedores/ProveedoresTable.tsx`
- Modify: `src/app/(dashboard)/proveedores/nuevo/page.tsx`
- Modify: `src/app/(dashboard)/proveedores/[id]/page.tsx` (498 líneas, 36 usos de `<Card>`)
- Modify: `src/components/forms/ProveedorForm.tsx`
- Modify: `src/components/proveedores/NuevoProveedorCliente.tsx`

**Interfaces:**
- Consumes: patrones de tabla y formulario, `chart-theme` (Tarea 9), `Figure`, `Panel`.
- Produces: nada nuevo.

- [ ] **Paso 1: Aplicar los siete movimientos de la receta**

Puntos concretos:

- `/proveedores/[id]` es la segunda peor concentración de tarjetones (36 `<Card>`). Su bloque de analytics pasa a **dos** `FigureGrid` apilados en vez de una grilla de tarjetas.
- Los gráficos de esa página usan `COLORES_GRAFICO`, `ejeGrafico` y `tooltipGrafico` de `@/lib/chart-theme`.
- El badge de tipo de proveedor (`REGULAR` / `CONSIGNACIÓN`) deja de tener color: `variant="outline"` para regular, `variant="default"` (negro) para consignación.
- Los dos spinners a mano de `ProveedorForm.tsx` pasan a `loading` en el `Button`.

- [ ] **Paso 2: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las seis de arriba que figuren.

Commit: `feat(ui): hoja proveedores monocroma`

---

### Tarea 17: Hoja Consignación y rendiciones

Acá está el único degradado del proyecto: `rendicion-preview.tsx` tiene un `bg-gradient-to-br from-primary to-emerald-600 text-white`. Y `rendiciones/[id]/page.tsx` es el archivo con más color hardcodeado de toda la app (61 usos).

**Files:**
- Modify: `src/app/(dashboard)/consignacion/page.tsx`
- Modify: `src/app/(dashboard)/consignacion/ConsignacionDashboard.tsx`
- Modify: `src/app/(dashboard)/consignacion/rendiciones/page.tsx`
- Modify: `src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx`
- Modify: `src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx`
- Modify: `src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx` (512 líneas)
- Modify: `src/components/consignacion/rendicion-params.tsx`
- Modify: `src/components/consignacion/rendicion-preview.tsx`

**Interfaces:**
- Consumes: `Panel`, `Figure`/`FigureGrid`, `Button` con `loading`, `notificar`.
- Produces: nada nuevo.

- [ ] **Paso 1: Matar el degradado**

En `src/components/consignacion/rendicion-preview.tsx`, la tarjeta "A Rendir":

```tsx
<Card className="border-none shadow-md bg-gradient-to-br from-primary to-emerald-600 text-white overflow-hidden">
```

pasa a un bloque invertido plano, que es el gesto de "cifra final" del sistema:

```tsx
        <div className="rounded-lg bg-primary px-5 py-4 text-primary-foreground">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/70">
            A rendir
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
            {formatARS(preview.totalARendir)}
          </p>
          <p className="mt-1 text-xs text-primary-foreground/70">
            Neto al proveedor (ventas en ARS)
          </p>
          {usdEquivalent != null && (
            {/* … el bloque de equivalente USD se conserva, con
                text-primary-foreground/70 en vez de text-primary-foreground/70 sobre gradiente … */}
          )}
        </div>
```

Quitar el `font-black` de las cifras de ese archivo: pasa a `font-semibold`.

- [ ] **Paso 2: Verificar que no quedan degradados**

```bash
grep -rn "bg-gradient" src
```

Esperado: sin salida.

- [ ] **Paso 3: Aplicar el resto de la receta**

- `rendiciones/[id]/page.tsx`: los 61 colores hardcodeados salen con la tabla de equivalencias del movimiento 4. Los estados de rendición (`PENDIENTE`/`PARCIAL`/`PAGADO`) se distinguen por `variant` del badge y por texto, no por color.
- El botón de generar rendición (`rendicion-params.tsx:107`) y el de confirmar (`rendicion-preview.tsx:252`) reciben `loading` + `loadingText`.
- La descarga de PDF (`RendicionPDFDownload.tsx:39`) recibe `loading` + `loadingText="Generando PDF…"`.

> ⚠️ `src/components/pdf/RendicionPDF.tsx` **no se toca**: es un documento de impresión y está excluido de la guardia.

- [ ] **Paso 4: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las ocho de arriba que figuren.

Commit: `feat(ui): hoja consignacion monocroma, sin degradados`

---

### Tarea 18: Hoja Compras

**Files:**
- Modify: `src/app/(dashboard)/compras/page.tsx`
- Modify: `src/app/(dashboard)/compras/ComprasTable.tsx` (470 líneas, 20 `<Card>`)
- Modify: `src/app/(dashboard)/compras/ComprasSkeletons.tsx`
- Modify: `src/app/(dashboard)/compras/nueva/page.tsx` (541 líneas)
- Modify: `src/app/(dashboard)/compras/[id]/page.tsx` (386 líneas)

**Interfaces:**
- Consumes: patrones de tabla y formulario, `Panel`, `Figure`, `notificar`, `useAsyncAction`.
- Produces: nada nuevo.

- [ ] **Paso 1: Aplicar los siete movimientos de la receta**

Puntos concretos:

- El estado de orden (`PENDIENTE` / `PARCIAL` / `RECIBIDO` / `CANCELADO`) se representa con badge `variant="outline"` + texto, más una barra de progreso monocroma (`Progress`, que ya existe) para la recepción parcial. Sin colores.
- La paginación (`ComprasTable.tsx:451` y `:462`) mantiene `disabled` pero suma `loading` al botón que está cargando.
- El formulario de compra nueva usa el patrón de formulario; el botón de guardar (`nueva/page.tsx:528`) recibe `loading` + `loadingText="Registrando compra…"`.
- `ComprasSkeletons.tsx` usa `animate-skeleton-shimmer`, que ya es neutro: verificar que no tenga color propio.

> ⚠️ La recepción parcial de mercadería mueve cantidades y costos. **No se toca esa lógica**; solo su presentación.

- [ ] **Paso 2: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las cinco de arriba que figuren.

Commit: `feat(ui): hoja compras monocroma`

---

### Tarea 19: Hoja Caja chica

**Files:**
- Modify: `src/app/(dashboard)/caja-chica/page.tsx` (460 líneas)
- Modify: `src/app/(dashboard)/caja-chica/loading.tsx`
- Modify: `src/components/caja-chica/balance-cards.tsx`
- Modify: `src/components/caja-chica/caja-selector.tsx`
- Modify: `src/components/caja-chica/monthly-closure.tsx`
- Modify: `src/components/caja-chica/transaction-form.tsx`
- Modify: `src/components/caja-chica/transaction-list.tsx`
- Modify: `src/components/caja-chica/CajaChicaSkeleton.tsx`

**Interfaces:**
- Consumes: `Figure`/`FigureGrid`, `Panel`, `EmptyState`, `Button` con `loading`, `notificar`, `useAsyncAction`.
- Produces: nada nuevo.

- [ ] **Paso 1: Renombrar el concepto en pantalla**

`balance-cards.tsx` es literalmente el patrón que Mateo pidió eliminar. El archivo se conserva (para no romper imports) pero su contenido pasa a `FigureGrid` + `Figure`, y **el nombre del componente exportado no cambia** para mantener la tarea acotada. Dejar este comentario arriba del archivo:

```tsx
/**
 * Balance de caja. El nombre "cards" es histórico: ya no son tarjetas,
 * es una fila de cifras con divisores compartidos (ver docs/design-system.md).
 */
```

- [ ] **Paso 2: Tonos de las cifras de caja**

Esta es la hoja donde la regla "color solo en números" más se nota:

- Ingresos → `tono="positivo"`.
- Egresos → `tono="negativo"`.
- Saldo → `tono="neutro"` si es positivo, `tono="negativo"` si es menor a cero. La condición se lee del valor ya calculado.
- Saldo en USD → `tono="neutro"`, con el equivalente en ARS como `hint`.

- [ ] **Paso 3: Aplicar el resto de la receta**

- Los tres botones con `disabled={saving}` (`page.tsx:413`, `page.tsx:449`, `transaction-form.tsx:189`) y el de `monthly-closure.tsx:94` pasan a `useAsyncAction` + `loading`.
- El cierre mensual es una acción irreversible: además del `loading`, confirmar con `AlertDialog` antes de ejecutar.
- `transaction-list.tsx`: patrón de tabla, montos alineados a la derecha en mono, `EmptyState` "Sin movimientos en este período".

> ⚠️ El cierre mensual (`/api/caja-chica/cierre-mensual`) mueve saldos entre períodos. **No se toca su lógica ni su payload.**

- [ ] **Paso 4: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las ocho de arriba que figuren.

Commit: `feat(ui): hoja caja chica monocroma`

---

### Tarea 20: Hoja Reportes

643 líneas, 30 `<Card>`, 20 colores hardcodeados y el último `border-l-4` que queda en el proyecto (el de la sección de dólares, `border-l-slate-600`).

**Files:**
- Modify: `src/app/(dashboard)/reportes/page.tsx`

**Interfaces:**
- Consumes: `chart-theme` (Tarea 9), `Figure`/`FigureGrid`, `Panel`, `Button` con `loading`, `notificar`.
- Produces: nada nuevo.

- [ ] **Paso 1: Eliminar el último borde de color**

```tsx
<Card className="overflow-hidden border-l-4 border-l-slate-600 shadow-sm">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-base">
      <DollarSign className="h-4 w-4 text-slate-600" />
      Dólares en ventas (POS)
```

pasa a:

```tsx
              <Panel>
                <PanelHeader title="Dólares en ventas (POS)" />
                <PanelBody>
                  {/* … las tres cifras internas pasan a FigureGrid columnas={3} … */}
                </PanelBody>
              </Panel>
```

- [ ] **Paso 2: Verificar en todo el proyecto**

```bash
grep -rn "border-l-4\|border-r-4\|border-t-4\|border-b-4\|bg-gradient" src
```

Esperado: **sin salida**. Este es el momento en que el prompt negativo de Mateo queda cumplido en todo el repo.

- [ ] **Paso 3: Gráficos en gris con series distinguibles**

Todos los `recharts` de esta página usan `COLORES_GRAFICO`, `ejeGrafico` y `tooltipGrafico`. Cinco grises no alcanzan por sí solos: cada serie tiene que llevar además

- `<Legend />` con el nombre de la serie,
- en líneas, `strokeDasharray` distinto por serie (`""`, `"4 3"`, `"1 3"`, `"8 3"`, `"2 2"`),
- en tortas, `label` con nombre y porcentaje.

Este es el punto de accesibilidad del rediseño: **ninguna serie se distingue solo por el tono**.

- [ ] **Paso 4: Aplicar el resto de la receta**

- La grilla de KPIs ya usa `Stat`/`StatGrid`, que la Tarea 6 convirtió: revisar los `tone` y quitar los `accent`.
- Los botones de exportar (Excel y PDF) usan `notificar.promesa` con "Generando reporte…" y `loading` en el botón.
- Los comparativos contra el período anterior (`ComparativaHint`) son el mejor lugar para el color de cifra: variación positiva → `text-num-positive`, negativa → `text-num-negative`, con flecha además del color.

> ⚠️ `src/app/api/reportes/**` y `src/components/pdf/ReportesPDF.tsx` **no se tocan**.

- [ ] **Paso 5: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: `src/app/(dashboard)/reportes/page.tsx`.

Commit: `feat(ui): hoja reportes monocroma con graficos accesibles en gris`

---

### Tarea 21: Hoja Usuarios y estadísticas

**Files:**
- Modify: `src/app/(dashboard)/usuarios/page.tsx`
- Modify: `src/app/(dashboard)/usuarios/UsuariosList.tsx`
- Modify: `src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx` (324 líneas)
- Modify: `src/app/(dashboard)/usuarios/UsuariosSkeleton.tsx`
- Modify: `src/app/(dashboard)/usuarios/loading.tsx`
- Modify: `src/app/(dashboard)/estadisticas-vendedores/page.tsx` (587 líneas, 38 `<Card>`)
- Modify: `src/app/(dashboard)/estadisticas-vendedores/EstadisticasVendedoresSkeleton.tsx`
- Modify: `src/app/(dashboard)/estadisticas-vendedores/loading.tsx`
- Modify: `src/components/layout/CambiarPasswordDialog.tsx`
- Modify: `src/components/layout/UserMenu.tsx`

**Interfaces:**
- Consumes: `chart-theme`, `Figure`/`FigureGrid`, `Panel`, `EmptyState`, `Button` con `loading`, `notificar`, `useAsyncAction`.
- Produces: nada nuevo.

- [ ] **Paso 1: Aplicar los siete movimientos de la receta**

Puntos concretos:

- `estadisticas-vendedores` es la página con más `<Card>` del proyecto (38). El ranking de vendedores pasa a **una tabla**, no a 38 tarjetas: número de posición, nombre, ventas, monto, ticket promedio, todo en mono alineado a la derecha.
- El badge de rol (`ADMIN` / `VENDEDOR`) sin color: `variant="default"` (negro) para admin, `variant="outline"` para vendedor.
- Los tres botones con `disabled={saving}` (`UsuarioFormDialog.tsx:316`, `CambiarPasswordDialog.tsx:124`, y el de reenviar invitación de `UsuariosList`) pasan a `useAsyncAction` + `loading`.
- La invitación por mail está apagada hoy: si la UI muestra un estado de "correo pendiente de configuración", se rehace con el patrón de `EmptyState` en vez de un aviso de color.
- Eliminar un usuario: `AlertDialog` de confirmación + `loading` en el botón destructivo.

- [ ] **Paso 2: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las diez de arriba que figuren.

Commit: `feat(ui): hoja usuarios y estadisticas monocroma`

---

### Tarea 22: Hoja Ayuda y acceso

Las páginas de acceso son lo primero que se ve del sistema. Hoy son `Card` centradas genéricas.

**Files:**
- Modify: `src/app/(dashboard)/ayuda/page.tsx` (244 líneas, 16 `<Card>`)
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/forgot-password/page.tsx`
- Modify: `src/app/set-password/page.tsx`

**Interfaces:**
- Consumes: `Panel`, `Button` con `loading`, `notificar`, `Reveal`.
- Produces: nada nuevo.

- [ ] **Paso 1: Rehacer la página de ayuda**

Los 16 `<Card>` de módulos con ícono son exactamente el patrón "tarjetón" prohibido. Se reemplazan por una **lista de definición**: cada módulo es un bloque con título, descripción, pasos numerados y un enlace, separados por regla. Sin íconos en cuadraditos, sin `CheckCircle2` verde.

Los pasos numerados usan el mismo tratamiento que `GuiaCarga` (Tarea 12): overline mono con el número, texto abajo. Es consistente y ya está probado.

- [ ] **Paso 2: Rehacer las tres pantallas de acceso**

Estructura común para `login`, `forgot-password` y `set-password`:

- Fondo `bg-background`, contenedor centrado de `max-w-sm`.
- Marca arriba con el mismo tratamiento del sidebar: overline mono "Gestión" + "Shop" en semibold.
- El formulario en un `Panel` sin sombra.
- El botón principal (`login/page.tsx:88`, `forgot-password/page.tsx:78`, `set-password/page.tsx:124`) pasa de `disabled={loading}` a `loading={loading}` con `loadingText` propio: `"Entrando…"`, `"Enviando…"`, `"Guardando…"`.
- Los errores pasan a `notificar.error`; se elimina el mensaje inline duplicado.
- El bloque entero entra con `.anim-entrada`.

> ⚠️ No se toca ni la lógica de `next-auth`, ni la de tokens, ni la validación de contraseña. Es solo presentación.

- [ ] **Paso 3: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las cuatro de arriba que figuren.

Verificación visual extra: probar el login con credenciales equivocadas y confirmar que el error sale por toast abajo a la derecha y el botón se destraba solo.

Commit: `feat(ui): hoja ayuda y pantallas de acceso monocromas`

---

### Tarea 23: Hoja Muestra pedidos

El demo de `/muestra-pedidos` ya tiene la estética correcta — de hecho es de donde sale la dirección visual de todo este plan — pero está escrito con `zinc-*` y `bg-white` hardcodeados (158 usos entre sus cuatro archivos), así que **no funciona en modo oscuro** y no comparte primitivas con el resto.

**Files:**
- Modify: `src/components/pedidos-demo/demo-ui.tsx`
- Modify: `src/components/pedidos-demo/NuevaVentaDemo.tsx` (332 líneas, 72 colores)
- Modify: `src/components/pedidos-demo/PedidoDetalleDemo.tsx` (321 líneas, 50 colores)
- Modify: `src/components/pedidos-demo/PedidosBandejaDemo.tsx` (250 líneas, 36 colores)
- Modify: `src/app/muestra-pedidos/layout.tsx`
- Modify: `src/app/muestra-pedidos/loading.tsx`
- Modify: `src/app/muestra-pedidos/error.tsx`
- Modify: `src/app/muestra-pedidos/not-found.tsx`

**Interfaces:**
- Consumes: `Panel`, `Figure`, `Spinner`, `Button` con `loading`, `Reveal`, tokens.
- Produces: nada nuevo. El demo deja de tener primitivas propias.

- [ ] **Paso 1: Traducir los colores del demo a tokens**

Tabla de equivalencias específica de estos archivos:

| Antes | Después |
| --- | --- |
| `bg-white` | `bg-card` |
| `bg-zinc-50`, `bg-zinc-100` | `bg-surface`, `bg-muted` |
| `bg-zinc-950 text-white` | `bg-primary text-primary-foreground` |
| `border-zinc-200` | `border-border` |
| `border-zinc-300`, `border-zinc-400` | `border-border`, `border-border-strong` |
| `text-zinc-950` | `text-foreground` |
| `text-zinc-800` | `text-foreground` |
| `text-zinc-600`, `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-300` (sobre fondo negro) | `text-primary-foreground/70` |
| `hover:bg-zinc-800` (en botón negro) | `hover:bg-primary/90` |

- [ ] **Paso 2: Reemplazar las primitivas propias del demo**

- `DemoSection` → `Panel` + `PanelHeader` + `PanelBody`. La función se conserva como envoltorio fino para no reescribir los tres consumidores.
- `ResumenImportes` → `FigureGrid columnas={3}`, donde la tercera cifra ("Saldo pendiente") es el bloque invertido `bg-primary text-primary-foreground`. Ese gesto ya está definido en el sistema por la Tarea 17.
- `DemoSkeleton` → usa `animate-skeleton-shimmer` con `bg-muted`.
- Los dos spinners a mano (`NuevaVentaDemo.tsx:279`, `PedidoDetalleDemo.tsx:229`) desaparecen: los botones pasan a `loading` + `loadingText`.

- [ ] **Paso 3: Verificar el modo oscuro**

```bash
npm run dev
```

Entrar a `/muestra-pedidos/nueva-venta`, cambiar a modo oscuro con el toggle del sidebar y confirmar que **todo** el demo responde. Antes de esta tarea quedaba en blanco fijo.

- [ ] **Paso 4: Cierre de hoja**

Rutas a sacar de `PENDIENTES`: las ocho de arriba que figuren.

Commit: `feat(ui): demo de pedidos sobre tokens compartidos, con modo oscuro`

---

# FASE 3 — Cierre

### Tarea 24: Guardia en cero y guía portable

**Files:**
- Modify: `tests/design-guard.test.ts`
- Create: `docs/guia-estilos-portable.md`
- Modify: `docs/design-system.md`
- Modify: `docs/mapa-app.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `docs/guia-estilos-portable.md`, el entregable que Mateo pidió llevarse a otro proyecto.

- [ ] **Paso 1: Exigir que la lista de pendientes esté vacía**

En `tests/design-guard.test.ts`, agregar este test dentro del `describe` existente:

```ts
  it("no quedan archivos con deuda visual pendiente", () => {
    expect(
      PENDIENTES,
      `Todavía hay hojas sin migrar:\n  ${PENDIENTES.join("\n  ")}`
    ).toEqual([]);
  });
```

- [ ] **Paso 2: Correr la guardia**

```bash
npx vitest run tests/design-guard.test.ts
```

Esperado: PASS con `PENDIENTES` vacío. **Si falla, la tarea de hoja correspondiente no está terminada: volvé a esa tarea antes de seguir.**

- [ ] **Paso 3: Barrido final de patrones prohibidos**

```bash
grep -rn "border-l-4\|border-r-4\|border-t-4\|border-b-4\|bg-gradient\|font-black" src
grep -rn "from \"sonner\"" --include=*.tsx --include=*.ts src | grep -v "src/components/ui/sonner.tsx" | grep -v "src/lib/notificar.ts"
grep -rn "disabled={\(saving\|loading\|isLoading\|guardando\)}" --include=*.tsx src
```

Las tres deben salir vacías. La segunda confirma que todo aviso pasa por `notificar`; la tercera, que no quedó ningún botón que se deshabilita sin mostrar nada.

- [ ] **Paso 4: Escribir `docs/guia-estilos-portable.md`**

Es la guía que se lleva a otro proyecto, así que **no puede depender de Shop**. Secciones obligatorias:

1. **Qué es este sistema en una frase** — interfaz de gestión monocroma donde el color es información, no decoración.
2. **Los 9 principios positivos y los 5 negativos**, copiados de este plan.
3. **Los tokens**, con los valores `oklch` reales de claro y oscuro (copiar de `src/app/globals.css`), listos para pegar en otro `globals.css`. Incluir el bloque `@theme inline`.
4. **Las seis primitivas** (`Panel`, `Figure`/`FigureGrid`, `EmptyState`, `Button` con `loading`, `Spinner`, `Reveal`) con su código completo. Son componentes sin dependencias de dominio: se copian y andan, solo necesitan `cn` de `clsx` + `tailwind-merge`.
5. **Los dos hooks** (`useAsyncAction`, `usePreferenciaLocal`) con su código completo.
6. **La fachada de avisos** (`notificar` + configuración del `Toaster`), con el código completo.
7. **El sistema de animación**: los tres `@keyframes`, las tres clases, el bloque de `reduced-motion`, y la regla de animar solo `opacity` y `transform`.
8. **Las cinco recetas**: página con encabezado, fila de cifras, tabla de listado, formulario, acción destructiva.
9. **El tema de gráficos**: escala de grises + la regla de que ninguna serie se distingue solo por el tono.
10. **La guardia de diseño**: el código completo de `tests/design-guard.test.ts` y cómo adoptarla en un proyecto nuevo (lista de pendientes que arranca llena y se vacía).
11. **Antes / después** — el ejemplo de los cuatro tarjetones con `border-l-4` de `ventas/[id]` convertidos en un `FigureGrid`.

- [ ] **Paso 5: Cerrar `docs/design-system.md` y `docs/mapa-app.md`**

- `design-system.md`: llenar los valores de token que quedaron como `pendiente Tarea 3` y verificar que las cinco recetas tengan código real, no descripciones.
- `mapa-app.md`: actualizar la sección 4 ("Deudas visuales por archivo"), que ahora tiene que decir que está en cero, y la sección 2 con las primitivas nuevas y sus usos.

- [ ] **Paso 6: Revisión final con el subagente**

Dispatch a `ui-consistency` con: *"Revisá la coherencia del sistema completo. Leé docs/design-system.md y revisá una página de cada hoja: `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/ventas/[id]/page.tsx`, `src/app/(dashboard)/caja-chica/page.tsx` y `src/components/pedidos-demo/NuevaVentaDemo.tsx`. Decime si se sienten parte del mismo sistema."*

Aplicar los hallazgos de severidad alta y media.

- [ ] **Paso 7: Verificación completa**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

- [ ] **Paso 8: Recorrida visual completa**

```bash
npm run dev
```

Recorrer las 13 rutas del dashboard más las 4 públicas, **en claro y en oscuro**, y confirmar:

- [ ] No hay ni un color fuera de las cifras.
- [ ] Todo botón de acción muestra su spinner y se destraba.
- [ ] Todo aviso sale abajo a la derecha.
- [ ] Ninguna pantalla parece de otro sistema.
- [ ] Con `prefers-reduced-motion` activado en el sistema operativo, nada se mueve.

- [ ] **Paso 9: Commit final**

```bash
git add tests/design-guard.test.ts docs/
git commit -m "docs: guia de estilos portable y guardia de diseno en cero"
```

---

## Notas de ejecución

**Orden.** Las Tareas 1 a 7 son secuenciales y obligatorias: las hojas dependen de las primitivas. Las Tareas 8 a 23 son independientes entre sí — tocan archivos disjuntos — así que se pueden hacer en cualquier orden, aunque **de a una por vez**. La Tarea 24 va última.

**Conflictos.** Las únicas tareas que tocan un archivo compartido después de la Fase 1 son la 9 y la 20 (ambas usan `chart-theme.ts`, pero solo la 9 lo crea) y las que borran de `PENDIENTES` en `tests/design-guard.test.ts`. Si se ejecutan en paralelo en worktrees distintos, ese array va a dar conflicto de merge: resolverlo es trivial (unión de las eliminaciones), pero es la razón por la que conviene ir de a una.

**Lo que queda para después.** El plan de pagos y señas: modelo `PagoVenta`, `estadoPago` real, cobros parciales, historial y saldo. Requiere migración de Prisma y toca plata, así que arranca creando el subagente `security-auditor` y pasa por él antes de darse por terminado (AGENTS.md §3). El buzón `docs/pendientes-plata.md` que crea la Tarea 1 va a llegar a ese plan con todo lo que se haya ido encontrando en el camino.

---

## Self-Review

**1. Cobertura del pedido de Mateo**

| Pedido | Tarea |
| --- | --- |
| Cambios estéticos página por página | 9 a 23 |
| Dividir tareas por hojas (secciones) | Agrupamiento en Tarea 1 §5, aplicado en 9-23 |
| Revisar todas las páginas por arriba primero | Tarea 1 |
| Informe de estructura para no releer el código | Tarea 1 → `docs/mapa-app.md` |
| Profesional y bien animada | Tareas 3, 6, 7 |
| Compatible con Codex, una tarea por vez | Regla de ejecución en el encabezado; cada tarea es autocontenida |
| Qué subagentes crear | Sección "Subagentes"; se crea `ui-consistency` en la Tarea 2 |
| Blanco y negro | Tarea 3 (tokens croma 0) + guardia en Tarea 2 |
| Colores en números informativos | Tarea 6 (`Figure` con `tono`), aplicado en cada hoja |
| No uso excesivo de tarjetones | Tarea 6 (`Panel`/`FigureGrid`), aplicado en 9-23 |
| KPIs prolijos y competentes | Tarea 6 |
| Animaciones de carga en botones, que no se cuelguen | Tarea 4 (`loading` + perro guardián de `useAsyncAction`) |
| Toast abajo a la derecha, no pop-up del navegador | Tarea 5 |
| Catálogo con y sin foto, registro más cómodo y explicado | Tarea 12 |
| No cards con líneas de colores | Guardia (Tarea 2) + eliminación en 11, 17, 20 |
| Evitar estilos que parezcan vibecoding | Prompt negativo en Global Constraints + subagente `ui-consistency` |
| Informe de estilos reutilizable en otro proyecto | Tarea 24 → `docs/guia-estilos-portable.md` |
| Seguimiento de pago con señas y % | **Fuera de alcance por decisión del 2026-09-10.** Queda documentado en `docs/pendientes-plata.md` y en "Lo que queda para después". |

**2. Placeholders**

Sin "TBD" ni "implementar después". Los cinco archivos nuevos de primitiva (`spinner`, `panel`, `figure`, `empty-state`, `reveal`), los tres hooks/librerías (`use-async-action`, `use-preferencia-local`, `notificar`, `chart-theme`), el `VistaCatalogoToggle`, la `GuiaCarga`, el `ThemeProvider`, el `ThemeToggle`, la guardia de diseño y los tokens completos van con código íntegro. Las tareas de hoja no llevan código completo porque son transformaciones sobre archivos que ya existen: llevan las rutas exactas, la tabla de equivalencias, los puntos concretos a cambiar y los `grep` que verifican el resultado.

**3. Consistencia de tipos**

- `TonoCifra = "neutro" | "positivo" | "negativo" | "alerta"` — definido en la Tarea 6, usado en 9, 11, 14, 15, 19, 20.
- `Stat`/`StatGrid` mantienen su firma vieja (`label`, `value`, `tone`, `hint`) porque `dashboard` y `reportes` ya los importan; el mapeo `tone → tono` está en la Tarea 6.
- `useAsyncAction(fn, opciones?)` devuelve `{ run, loading }` — Tarea 4, consumido en 11-22.
- `notificar.ok / error / advertencia / info / promesa` — Tarea 5, consumido en 9-23.
- `VistaCatalogo = "fotos" | "lista" | "compacta"` — Tarea 12, usado solo ahí.
- `gruposNav(esAdmin: boolean): GrupoNav[]` — Tarea 8, usado solo en `SidebarNav`.
- `PENDIENTES: string[]` — Tarea 2, modificado por cada tarea de hoja, vaciado en la 24.
- `COLORES_GRAFICO`, `ejeGrafico`, `tooltipGrafico` — Tarea 9, consumidos en 16, 20, 21.
