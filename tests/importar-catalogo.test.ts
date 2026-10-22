import { describe, expect, it } from "vitest";
import { CATALOGO_HEADERS, decimalCatalogo, validarCatalogo } from "@/lib/importarCatalogo";

const fila = (overrides: Record<number, unknown> = {}) => ["A-1", "Producto", "", "Accesorios", "0", "1250.50", "3", "0", "Proveedor", "N", "", ""].map((value, index) => overrides[index] ?? value);
describe("catálogo completo", () => {
  it("conserva importes exactos, costo cero y stock mínimo cero", () => {
    const result = validarCatalogo([CATALOGO_HEADERS, fila({ 5: "1.250,50" })], new Set());
    expect(result.errores).toEqual([]);
    expect(result.productos[0]).toMatchObject({ precioVenta: "1250.50", precioCompra: "0.00", stockMinimo: 0 });
  });
  it.each(["12abc", "1e3", "-10", "NaN", "1.234", "100000000", "1,2,3"])("rechaza monto ambiguo/inválido %s", (value) => {
    expect(() => decimalCatalogo(value, "99999999.99")).toThrow();
  });
  it("reporta filas incompletas y SKU repetido sin omitirlos", () => {
    const result = validarCatalogo([CATALOGO_HEADERS, fila(), fila(), fila({ 0: "B", 1: "" })], new Set());
    expect(result.errores).toHaveLength(2);
    expect(result.errores[0]).toContain("Fila 3");
    expect(result.errores[1]).toContain("Fila 4");
  });
  it.each([{ 6: "1.5" }, { 6: "-1" }, { 9: "quizás" }, { 9: "S", 8: "" }, { 9: "S", 10: "101" }, { 11: "javascript:alert(1)" }])("valida stock, consignación e imagen", (overrides) => {
    expect(validarCatalogo([CATALOGO_HEADERS, fila(overrides)], new Set()).errores).toHaveLength(1);
  });
  it("requiere precio venta y no importa la plantilla vacía", () => {
    expect(validarCatalogo([CATALOGO_HEADERS], new Set()).errores).toHaveLength(1);
    expect(validarCatalogo([["SKU", "Nombre"], ["A", "Producto"]], new Set()).errores[0]).toContain("Precio venta");
  });
});
