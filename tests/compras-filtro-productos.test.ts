import { describe, expect, it } from "vitest";
import { construirWhereProductos } from "@/lib/filtros/productos";

/**
 * El filtro de productos por proveedor es lo que impide cargar mercadería de
 * un proveedor en la orden de otro. Los casos combinados (proveedor + texto)
 * son los que se rompen solos si alguien vuelve a poner dos `OR` hermanos.
 */
describe("construirWhereProductos", () => {
  it("sin filtros, solo trae activos", () => {
    expect(construirWhereProductos({})).toEqual({ activo: true });
  });

  it("activo=false levanta el filtro de activos", () => {
    expect(construirWhereProductos({ activo: "false" })).toEqual({});
  });

  it("proveedorId matchea proveedor principal O alguna parte suya", () => {
    const where = construirWhereProductos({ proveedorId: "prov-1" });
    expect(where.AND).toEqual([
      {
        OR: [
          { proveedorId: "prov-1" },
          { partesProveedor: { some: { proveedorId: "prov-1" } } },
        ],
      },
    ]);
    // El OR del proveedor no queda al nivel raíz, donde se pisaría con el de texto.
    expect(where.OR).toBeUndefined();
  });

  it("solo texto busca por nombre o SKU", () => {
    const where = construirWhereProductos({ q: "tornillo" });
    expect(where.AND).toEqual([
      {
        OR: [
          { nombre: { contains: "tornillo", mode: "insensitive" } },
          { sku: { contains: "tornillo", mode: "insensitive" } },
        ],
      },
    ]);
  });

  it("proveedor + texto conserva LAS DOS condiciones dentro de un AND", () => {
    const where = construirWhereProductos({ proveedorId: "prov-1", q: "caño" });
    expect(Array.isArray(where.AND)).toBe(true);
    const condiciones = where.AND as Array<Record<string, unknown>>;
    expect(condiciones).toHaveLength(2);

    const [porProveedor, porTexto] = condiciones;
    expect(porProveedor.OR).toEqual([
      { proveedorId: "prov-1" },
      { partesProveedor: { some: { proveedorId: "prov-1" } } },
    ]);
    expect(porTexto.OR).toEqual([
      { nombre: { contains: "caño", mode: "insensitive" } },
      { sku: { contains: "caño", mode: "insensitive" } },
    ]);
    // Ninguna de las dos se perdió por colisión de claves.
    expect(where.OR).toBeUndefined();
  });

  it("el texto se normaliza: espacios sueltos no generan condición", () => {
    const where = construirWhereProductos({ proveedorId: "prov-1", q: "   " });
    expect(where.AND).toHaveLength(1);
  });

  it("recorta el texto antes de buscar", () => {
    const where = construirWhereProductos({ q: "  perno  " });
    const [porTexto] = where.AND as Array<Record<string, unknown>>;
    expect(porTexto.OR).toEqual([
      { nombre: { contains: "perno", mode: "insensitive" } },
      { sku: { contains: "perno", mode: "insensitive" } },
    ]);
  });

  it("combina proveedor y texto con el resto de los filtros escalares", () => {
    const where = construirWhereProductos({
      proveedorId: "prov-1",
      q: "caño",
      categoriaId: "cat-9",
      enConsignacion: "true",
      stockBajo: "sin",
    });
    expect(where.categoriaId).toBe("cat-9");
    expect(where.enConsignacion).toBe(true);
    expect(where.stockActual).toBe(0);
    expect(where.activo).toBe(true);
    expect(where.AND).toHaveLength(2);
  });

  it("enConsignacion=false filtra los que no están en consignación", () => {
    expect(construirWhereProductos({ enConsignacion: "false" }).enConsignacion).toBe(false);
  });

  it("proveedorId vacío no agrega condición de proveedor", () => {
    expect(construirWhereProductos({ proveedorId: "" })).toEqual({ activo: true });
  });
});
