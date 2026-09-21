import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = process.cwd();
const DIRS_ESCANEADOS = ["src"];

/**
 * Rutas excluidas: documentos de impresión/PDF, donde el hex es legítimo.
 * Con "/" como separador (ver nota de `archivosAEscanear`), consistente
 * entre Windows y CI.
 */
const EXCLUIDOS = ["src/components/pdf", "src/app/api"];

/**
 * Archivos que todavía arrastran deuda visual del diseño viejo.
 * Cada tarea de hoja del plan de rediseño borra SUS PROPIAS rutas de acá.
 * La tarea final exige que este array quede vacío.
 */
export const PENDIENTES: string[] = [
  "src/app/(dashboard)/compras/[id]/page.tsx",
  "src/app/(dashboard)/consignacion/ConsignacionDashboard.tsx",
  "src/app/(dashboard)/consignacion/rendiciones/RendicionesTable.tsx",
  "src/app/(dashboard)/consignacion/rendiciones/[id]/page.tsx",
  "src/app/(dashboard)/consignacion/rendiciones/nueva/page.tsx",
  "src/app/(dashboard)/productos/[id]/editar/page.tsx",
  "src/app/(dashboard)/productos/page.tsx",
  "src/app/(dashboard)/proveedores/[id]/page.tsx",
  "src/app/(dashboard)/usuarios/UsuarioFormDialog.tsx",
  "src/app/(dashboard)/usuarios/UsuariosList.tsx",
  "src/app/muestra-pedidos/error.tsx",
  "src/app/muestra-pedidos/layout.tsx",
  "src/app/muestra-pedidos/loading.tsx",
  "src/app/muestra-pedidos/not-found.tsx",
  "src/components/consignacion/rendicion-params.tsx",
  "src/components/consignacion/rendicion-preview.tsx",
  "src/components/pedidos-demo/NuevaVentaDemo.tsx",
  "src/components/pedidos-demo/PedidoDetalleDemo.tsx",
  "src/components/pedidos-demo/PedidosBandejaDemo.tsx",
  "src/components/pedidos-demo/demo-ui.tsx",
  "src/components/punto-venta/CarritoVenta.tsx",
  "src/components/punto-venta/ProductosGridPaginado.tsx",
];

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
    .map((f) => relative(RAIZ, f).split(sep).join("/"))
    .filter((f) => !EXCLUIDOS.some((ex) => f.startsWith(ex + "/") || f === ex));
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
