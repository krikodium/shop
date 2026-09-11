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

function escaparRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Busca `selector` como inicio de regla real (al comienzo de una línea,
 * espacios iniciales permitidos, seguido de espacios opcionales y `{`), no
 * como substring en cualquier posición. Evita falsos positivos como
 * `.dark` matcheando dentro de `.dark .animate-skeleton-shimmer {` o de
 * `@custom-variant dark (&:is(.dark *));`.
 */
function bloque(selector: string): string {
  const patron = new RegExp(`^[ \\t]*${escaparRegExp(selector)}[ \\t]*\\{`, "m");
  const m = css.match(patron);
  expect(m, `No encontré el bloque ${selector} en globals.css`).not.toBeNull();
  const i = m!.index!;
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
