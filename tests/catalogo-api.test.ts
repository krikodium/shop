import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { CATALOGO_HEADERS } from "@/lib/importarCatalogo";
const mock = vi.hoisted(() => ({ auth: vi.fn(), findProducts: vi.fn(), findProviders: vi.fn(), findCategories: vi.fn(), transaction: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { producto: { findMany: mock.findProducts }, proveedor: { findMany: mock.findProviders }, categoria: { findMany: mock.findCategories }, $transaction: mock.transaction } }));
import { POST } from "@/app/api/productos/carga-masiva/route";
function request(modo = "preview", rows: unknown[][] = [["A", "Producto", "", "Accesorios", "0", "100.50", "2", "0", "Proveedor", "N", "", ""]]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([CATALOGO_HEADERS, ...rows]), "Productos");
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const file = new File([bytes], "catalogo.xlsx");
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes });
  const form = { get: (key: string) => key === "file" ? file : modo };
  return { formData: async () => form } as Request;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  mock.findProducts.mockResolvedValue([]);
  mock.findProviders.mockResolvedValue([]);
  mock.findCategories.mockResolvedValue([]);
});
describe("API catálogo", () => {
  it("exige sesión de administrador", async () => {
    mock.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    mock.auth.mockResolvedValue({ user: { role: "VENDEDOR" } });
    expect((await POST(request())).status).toBe(403);
    expect(mock.findProducts).not.toHaveBeenCalled();
  });
  it("preview no escribe y expone referencias a crear", async () => {
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ creados: 0, errores: 0, validos: 1, nuevasCategorias: ["Accesorios"], nuevosProveedores: ["Proveedor"] });
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("no inicia escritura si hay una fila inválida", async () => {
    const response = await POST(request("importar", [["A", "Nombre", "", "", "", "12abc"]]));
    expect(response.status).toBe(400);
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("crea catálogo, referencias y stock con auditoría en una transacción", async () => {
    const tx = { categoria: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "cat" }) }, proveedor: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "prov" }) }, producto: { create: vi.fn().mockResolvedValue({ id: "p" }) }, movimientoStock: { create: vi.fn() } };
    mock.transaction.mockImplementation((callback) => callback(tx));
    expect(await (await POST(request("importar"))).json()).toMatchObject({ creados: 1 });
    expect(tx.producto.create).toHaveBeenCalledWith({ data: expect.objectContaining({ precioVenta: "100.50", precioCompra: "0.00", categoriaId: "cat", proveedorId: "prov", stockMinimo: 0 }) });
    expect(tx.movimientoStock.create).toHaveBeenCalledWith({ data: expect.objectContaining({ usuario: "admin", cantidad: 2, stockAnterior: 0 }) });
  });
});
