import { describe, expect, it } from "vitest";
import {
  calcularMargen,
  generarSku,
  normalizarSku,
} from "@/components/productos/producto-form-utils";

describe("generarSku", () => {
  it("arma un código a partir del nombre, sin acentos ni signos", () => {
    expect(generarSku("Sillón de living")).toBe("SILLON-LIVING");
    expect(generarSku("Mesa ratona 60x60")).toBe("MESA-RATONA-60X60");
  });

  it("descarta palabras vacías pero no se queda sin nada", () => {
    expect(generarSku("de la")).toBe("DE-LA");
  });

  it("es determinista", () => {
    expect(generarSku("Banqueta alta")).toBe(generarSku("Banqueta alta"));
  });

  it("cae a un valor usable con nombre vacío o solo símbolos", () => {
    expect(generarSku("")).toBe("SKU");
    expect(generarSku("!!! ???")).toBe("SKU");
  });

  it("acepta un sufijo para desempatar", () => {
    expect(generarSku("Mesa ratona", 2)).toBe("MESA-RATONA-2");
  });

  it("limita el largo de la base y no deja guion colgando", () => {
    const sku = generarSku("Aparador escandinavo nogal reforzado");
    expect(sku.length).toBeLessThanOrEqual(24);
    expect(sku.endsWith("-")).toBe(false);
  });
});

describe("normalizarSku", () => {
  it("recorta y pasa a mayúsculas", () => {
    expect(normalizarSku("  mesa-01 ")).toBe("MESA-01");
  });
});

describe("calcularMargen", () => {
  it("calcula ganancia y margen sobre el precio de venta", () => {
    const margen = calcularMargen(600, 1000);
    expect(margen).not.toBeNull();
    expect(margen?.ganancia).toBe(400);
    expect(margen?.porcentaje).toBeCloseTo(40, 10);
  });

  it("devuelve null sin precio de compra, en cero o negativo", () => {
    expect(calcularMargen(null, 1000)).toBeNull();
    expect(calcularMargen(undefined, 1000)).toBeNull();
    expect(calcularMargen(0, 1000)).toBeNull();
    expect(calcularMargen(-5, 1000)).toBeNull();
  });

  it("devuelve null sin precio de venta válido", () => {
    expect(calcularMargen(600, null)).toBeNull();
    expect(calcularMargen(600, 0)).toBeNull();
    expect(calcularMargen(600, Number.NaN)).toBeNull();
  });

  it("informa margen negativo cuando se vende por debajo del costo", () => {
    const margen = calcularMargen(1000, 800);
    expect(margen?.ganancia).toBe(-200);
    expect(margen?.porcentaje).toBeCloseTo(-25, 10);
  });
});
