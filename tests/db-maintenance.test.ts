import { describe, expect, it } from "vitest";
import { BUSINESS_TABLES, databaseTarget, maintenanceOptions, snapshotHash, verifySnapshot } from "../scripts/db-maintenance";
describe("reset seguro", () => {
  it("simula por defecto y exige opciones conocidas", () => {
    expect(maintenanceOptions([]).apply).toBe(false);
    expect(maintenanceOptions(["--apply", "--confirm-target", "db:5432/shop"]).apply).toBe(true);
    expect(() => maintenanceOptions(["--force"])).toThrow();
    expect(() => maintenanceOptions(["--backup", "--apply"])).toThrow();
  });
  it("nunca muestra credenciales ni parámetros", () => {
    expect(databaseTarget("postgres://user:secret@db:5432/shop?token=secret")).toBe("db:5432/shop");
  });
  it("rechaza un schema de prueba antes de conectarse a public", () => {
    expect(() => databaseTarget("postgres://user:secret@db/shop?schema=shop_test")).toThrow("schema=public");
    expect(databaseTarget("postgres://user:secret@db/shop?schema=public")).toBe("db:5432/shop");
  });
  it("preserva accesos y contempla relaciones de productos y pagos", () => {
    expect(BUSINESS_TABLES).not.toContain("User");
    expect(BUSINESS_TABLES).not.toContain("PasswordToken");
    expect(BUSINESS_TABLES).not.toContain("JornadaLaboral");
    expect(BUSINESS_TABLES.indexOf("PagoVenta")).toBeLessThan(BUSINESS_TABLES.indexOf("Venta"));
    expect(BUSINESS_TABLES.indexOf("ProductoParteProveedor")).toBeLessThan(BUSINESS_TABLES.indexOf("Producto"));
    expect(BUSINESS_TABLES.indexOf("EventoPedido")).toBeLessThan(BUSINESS_TABLES.indexOf("Pedido"));
    expect(BUSINESS_TABLES.indexOf("Pedido")).toBeLessThan(BUSINESS_TABLES.indexOf("Venta"));
  });
  it("conserva JSON numeric literal y rechaza alteración o tabla arbitraria", () => {
    const tables = { Producto: ['{"id":"p","precioVenta":99999999.99}'] };
    const backup = { format: "shop-reset-v1", target: "db", schema: "schema", tables, checksum: snapshotHash(tables) };
    expect(verifySnapshot(backup).tables.Producto[0]).toContain("99999999.99");
    expect(() => verifySnapshot({ ...backup, tables: { Producto: [] } })).toThrow();
    const unknown = { Evil: ['{"id":"a"}'] };
    expect(() => verifySnapshot({ ...backup, tables: unknown, checksum: snapshotHash(unknown) })).toThrow();
  });
});
