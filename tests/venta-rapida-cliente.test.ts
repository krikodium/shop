import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  tx: {
    user: { findUnique: vi.fn() },
    venta: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
    cliente: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    producto: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    movimientoStock: { create: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { ventaSchema } from "@/lib/validaciones/ventaSchema";
import { procesarVenta } from "@/lib/procesarVenta";
import { huella } from "@/lib/calculadores/finanzasServidor";

const venta = {
  usuarioId: "operadora",
  nuevoCliente: { nombre: "  Ana Pérez  ", telefono: "  1155558888  ", email: "" },
  items: [{ productoId: "producto", cantidad: 1, modalidad: "INMEDIATA" as const }],
  descuento: "0",
  totalEsperado: "333.25",
  metodoPago: "EFECTIVO" as const,
  cobroInicial: { montoArs: "333.25", metodoPago: "EFECTIVO" as const },
  claveIdempotencia: "venta-planilla-uuid-001",
};
const decimal = (valor: string) => new Prisma.Decimal(valor);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx));
  mocks.tx.user.findUnique.mockResolvedValue({ id: "operadora", role: "VENDEDOR" });
  mocks.tx.venta.findUnique.mockResolvedValue(null);
  mocks.tx.venta.findMany.mockResolvedValue([]);
  mocks.tx.cliente.create.mockResolvedValue({
    id: "clienta-nueva", nombre: "Ana Pérez", telefono: "1155558888",
    totalCompras: decimal("0"), cantidadCompras: 0,
  });
  mocks.tx.producto.findUnique.mockResolvedValue({
    id: "producto", activo: true, nombre: "Bandeja", sku: "BAN-01",
    precioVenta: decimal("333.25"), precioCompra: decimal("100.00"),
    enConsignacion: false, stockActual: 2,
  });
  mocks.tx.producto.findUniqueOrThrow.mockResolvedValue({ id: "producto", stockActual: 2 });
  mocks.tx.venta.create.mockResolvedValue({ id: "venta", fecha: new Date("2026-10-29T15:00:00Z") });
  mocks.tx.venta.findUniqueOrThrow.mockResolvedValue({ id: "venta", clienteId: "clienta-nueva" });
});

describe("Ficha de clienta en el registro de venta", () => {
  it("exige nombre y al menos una vía de contacto validada antes de tocar la base", async () => {
    for (const nuevoCliente of [
      { nombre: " ", telefono: "1155558888" },
      { nombre: "Ana", telefono: " ", email: "" },
      { nombre: "Ana", email: "correo inválido" },
      { nombre: "Ana", telefono: "1".repeat(101) },
    ]) {
      await expect(procesarVenta({ ...venta, nuevoCliente })).rejects.toThrow();
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("acepta solo email como contacto y normaliza espacios", () => {
    const input = ventaSchema.parse({ ...venta, nuevoCliente: { nombre: " Ana ", email: " ana@example.com " } });
    expect(input.nuevoCliente).toEqual({ nombre: "Ana", email: "ana@example.com" });
    expect(ventaSchema.parse({ ...venta, nuevoCliente: { nombre: "Ana", telefono: "1155558888", email: " " } }).nuevoCliente?.email).toBe("");
  });

  it("rechaza mandar a la vez una ficha existente y otra nueva", async () => {
    await expect(procesarVenta({ ...venta, clienteId: "existente" })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("guarda ficha y venta dentro de la misma transacción, vinculadas y sin consentimiento de marketing implícito", async () => {
    await procesarVenta(venta);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0][1].isolationLevel).toBe("Serializable");
    expect(mocks.tx.cliente.create).toHaveBeenCalledWith({ data: {
      nombre: "Ana Pérez", telefono: "1155558888", email: null, recibeNotificaciones: false,
    } });
    const data = mocks.tx.venta.create.mock.calls[0][0].data;
    expect(data.clienteId).toBe("clienta-nueva");
    expect(data.total.toFixed(2)).toBe("333.25");
    expect(mocks.tx.cliente.update.mock.calls[0][0].data.cantidadCompras).toBe(1);
    expect(mocks.tx.cliente.update.mock.calls[0][0].data.totalCompras.toFixed(2)).toBe("333.25");
  });

  it("un reintento confirmado devuelve la venta sin crear ni actualizar otra ficha", async () => {
    mocks.tx.venta.findUnique.mockResolvedValue({
      id: "venta-previa", huellaSolicitud: huella({ ...ventaSchema.parse(venta), usuarioId: venta.usuarioId }),
    });
    const result = await procesarVenta(venta);
    expect(result.id).toBe("venta-previa");
    expect(mocks.tx.cliente.create).not.toHaveBeenCalled();
    expect(mocks.tx.cliente.update).not.toHaveBeenCalled();
    expect(mocks.tx.venta.create).not.toHaveBeenCalled();
  });

  it("una operadora VIEWER no crea fichas como efecto lateral de una venta rechazada", async () => {
    mocks.tx.user.findUnique.mockResolvedValue({ id: "operadora", role: "VIEWER" });
    await expect(procesarVenta(venta)).rejects.toThrow("permiso");
    expect(mocks.tx.cliente.create).not.toHaveBeenCalled();
  });

  it("un fallo posterior al alta se propaga a la transacción y no confirma venta ni estadísticas", async () => {
    mocks.tx.producto.findUnique.mockResolvedValue({ activo: false });
    await expect(procesarVenta(venta)).rejects.toThrow("inactivo");
    expect(mocks.tx.cliente.create).toHaveBeenCalledTimes(1);
    expect(mocks.tx.venta.create).not.toHaveBeenCalled();
    expect(mocks.tx.cliente.update).not.toHaveBeenCalled();
    // La excepción no se captura dentro del callback: PostgreSQL revierte su alta.
    await expect(mocks.transaction.mock.results[0].value).rejects.toThrow("inactivo");
  });
});

describe("Pago dividido en el registro de venta", () => {
  const dividida = {
    ...venta,
    metodoPago: "EFECTIVO" as const,
    metodoPagoSecundario: "TRANSFERENCIA" as const,
  };

  it("guarda el desglose en Venta cuando los dos medios cubren la venta entera", async () => {
    await procesarVenta({
      ...dividida,
      cobroInicial: { montoArs: "333.25", metodoPago: "EFECTIVO" },
      montoPago1Ars: "100.00",
      montoPago2Ars: "233.25",
    });
    const data = mocks.tx.venta.create.mock.calls[0][0].data;
    expect(data.metodoPagoSecundario).toBe("TRANSFERENCIA");
    expect(data.montoPago1Ars.toFixed(2)).toBe("100.00");
    expect(data.montoPago2Ars.toFixed(2)).toBe("233.25");
    expect(data.pagos.create).toHaveLength(2);
    expect(data.estadoPago).toBe("PAGADO");
  });

  it("una seña dividida no se guarda como desglose de la venta, solo como cobros", async () => {
    await procesarVenta({
      ...dividida,
      cobroInicial: { montoArs: "200.00", metodoPago: "EFECTIVO" },
      montoPago1Ars: "120.00",
      montoPago2Ars: "80.00",
    });
    const data = mocks.tx.venta.create.mock.calls[0][0].data;
    // El ticket y el panel de detalle leen estas columnas como el pago de la
    // venta entera: con una seña dirían que quedó saldada.
    expect(data.metodoPagoSecundario).toBeNull();
    expect(data.montoPago1Ars).toBeNull();
    expect(data.montoPago2Ars).toBeNull();
    expect(data.cotizacionUsd).toBeNull();
    // La división no se pierde: queda completa en los dos cobros.
    expect(data.pagos.create).toHaveLength(2);
    expect(data.pagos.create[0].montoArs.toFixed(2)).toBe("120.00");
    expect(data.pagos.create[0].metodoPago).toBe("EFECTIVO");
    expect(data.pagos.create[1].montoArs.toFixed(2)).toBe("80.00");
    expect(data.pagos.create[1].metodoPago).toBe("TRANSFERENCIA");
    expect(data.estadoPago).toBe("PARCIAL");
  });

  it("rechaza tramos que no suman lo cobrado hoy", async () => {
    await expect(
      procesarVenta({
        ...dividida,
        cobroInicial: { montoArs: "200.00", metodoPago: "EFECTIVO" },
        montoPago1Ars: "120.00",
        montoPago2Ars: "90.00",
      }),
    ).rejects.toThrow("sumar lo cobrado hoy");
    expect(mocks.tx.venta.create).not.toHaveBeenCalled();
  });
});
