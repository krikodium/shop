import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const mocks = vi.hoisted(() => ({
  tx: {
    user: { findUnique: vi.fn() },
    venta: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    pagoVenta: { findUnique: vi.fn(), create: vi.fn() },
    producto: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    cliente: { findUnique: vi.fn(), update: vi.fn() },
    movimientoStock: { create: vi.fn() },
    pedido: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    itemVenta: { update: vi.fn() },
    eventoPedido: { findUnique: vi.fn(), create: vi.fn() },
  },
  transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
import { registrarPagoVenta } from "@/lib/registrarPagoVenta";
import { procesarVenta } from "@/lib/procesarVenta";
import { registrarEventoPedido } from "@/lib/pedidos";
import { huella, validarMoneda } from "@/lib/calculadores/finanzasServidor";
import { pagoSchema } from "@/lib/validaciones/ventaSchema";
const dec = (x: string) => new Prisma.Decimal(x);
const pago = {
  ventaId: "v",
  usuarioId: "u",
  montoArs: "166.62",
  metodoPago: "EFECTIVO" as const,
  claveIdempotencia: "1234567890123456",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((fn: (tx: typeof mocks.tx) => unknown) =>
    fn(mocks.tx),
  );
  mocks.tx.user.findUnique.mockResolvedValue({ id: "u", role: "VENDEDOR" });
  mocks.tx.venta.findUnique.mockResolvedValue({
    id: "v",
    total: dec("333.25"),
    anulada: false,
    pagos: [{ montoArs: dec("166.63") }],
  });
  mocks.tx.pagoVenta.findUnique.mockResolvedValue(null);
  mocks.tx.pagoVenta.create.mockResolvedValue({ id: "p" });
});
describe("Cobros transaccionales", () => {
  it("cobra el último centavo sin recalcular la seña y usa Serializable", async () => {
    const r = await registrarPagoVenta(pago);
    expect(r.saldoPendiente).toBe("0.00");
    expect(r.totalPagado).toBe("333.25");
    expect(r.estadoPago).toBe("PAGADO");
    expect(mocks.transaction.mock.calls[0][1].isolationLevel).toBe(
      "Serializable",
    );
  });
  it("rechaza sobrecobro antes de escribir", async () => {
    await expect(
      registrarPagoVenta({ ...pago, montoArs: "166.63" }),
    ).rejects.toThrow("supera el saldo");
    expect(mocks.tx.pagoVenta.create).not.toHaveBeenCalled();
  });
  it("reintento con misma clave y datos no vuelve a cobrar", async () => {
    mocks.tx.pagoVenta.findUnique.mockResolvedValue({
      id: "original",
      huellaSolicitud: huella({
        ...pagoSchema.parse(pago),
        ventaId: pago.ventaId,
        usuarioId: pago.usuarioId,
      }),
    });
    const r = await registrarPagoVenta(pago);
    expect(r.pagoId).toBe("original");
    expect(mocks.tx.pagoVenta.create).not.toHaveBeenCalled();
  });
  it("misma clave con importe diferente se rechaza", async () => {
    mocks.tx.pagoVenta.findUnique.mockResolvedValue({
      id: "original",
      huellaSolicitud: "otro",
    });
    await expect(registrarPagoVenta(pago)).rejects.toThrow("otros datos");
  });
  it("viewer no puede cobrar aunque conozca el id", async () => {
    mocks.tx.user.findUnique.mockResolvedValue({ id: "u", role: "VIEWER" });
    await expect(registrarPagoVenta(pago)).rejects.toThrow("permiso");
    expect(mocks.tx.pagoVenta.create).not.toHaveBeenCalled();
  });
  it("USD exige equivalente exacto y cotización propia", () => {
    expect(() =>
      validarMoneda({
        montoArs: "125.56",
        montoUsd: "0.10",
        cotizacionUsd: "1255.5555",
      }),
    ).not.toThrow();
    expect(() =>
      validarMoneda({
        montoArs: "125.55",
        montoUsd: "0.10",
        cotizacionUsd: "1255.5555",
      }),
    ).toThrow("coincidir");
    expect(() =>
      validarMoneda({ montoArs: "1.00", montoUsd: "1.00", cotizacionUsd: "0" }),
    ).toThrow("positivos");
  });
});
describe("Alta desde catálogo servidor", () => {
  const venta = {
    usuarioId: "u",
    clienteId: "c",
    items: [{ productoId: "x", cantidad: 2, modalidad: "ENCARGO" as const }],
    descuento: "0",
    totalEsperado: "666.50",
    metodoPago: "EFECTIVO" as const,
    cobroInicial: { montoArs: "0", metodoPago: "EFECTIVO" as const },
    claveIdempotencia: "uuid-operacion-venta",
  };
  beforeEach(() => {
    mocks.tx.venta.findUnique.mockResolvedValue(null);
    mocks.tx.cliente.findUnique.mockResolvedValue({
      id: "c",
      nombre: "Ana",
      telefono: "123",
      totalCompras: dec("0"),
      cantidadCompras: 0,
    });
    mocks.tx.producto.findUnique.mockResolvedValue({
      id: "x",
      activo: true,
      nombre: "Anillo",
      sku: "A1",
      precioVenta: dec("333.25"),
      precioCompra: dec("100.50"),
      enConsignacion: false,
      stockActual: 0,
    });
    mocks.tx.venta.create.mockResolvedValue({ id: "v", fecha: new Date() });
    mocks.tx.venta.findUniqueOrThrow.mockResolvedValue({ id: "v" });
  });
  it("ignora precios/costos adulterados y el encargo no toca stock", async () => {
    await procesarVenta({
      ...venta,
      items: [
        { ...venta.items[0], precioUnitario: 1, subtotal: 1, costoUnitario: 0 },
      ],
    } as never);
    const d = mocks.tx.venta.create.mock.calls[0][0].data;
    expect(d.total.toFixed(2)).toBe("666.50");
    expect(d.costoTotal.toFixed(2)).toBe("201.00");
    expect(d.estadoPago).toBe("PENDIENTE");
    expect(mocks.tx.producto.update).not.toHaveBeenCalled();
    expect(mocks.tx.movimientoStock.create).not.toHaveBeenCalled();
  });
  it("rechaza un aumento del catálogo antes de registrar venta o cobros", async () => {
    mocks.tx.producto.findUnique.mockResolvedValue({
      id: "x",
      activo: true,
      nombre: "Anillo",
      sku: "A1",
      precioVenta: dec("500.00"),
      precioCompra: dec("100.50"),
      enConsignacion: false,
      stockActual: 2,
    });
    await expect(
      procesarVenta({ ...venta, cobroInicial: undefined }),
    ).rejects.toThrow("Los precios cambiaron");
    expect(mocks.tx.venta.create).not.toHaveBeenCalled();
    expect(mocks.tx.pagoVenta.create).not.toHaveBeenCalled();
    expect(mocks.tx.producto.update).not.toHaveBeenCalled();
    expect(mocks.tx.cliente.update).not.toHaveBeenCalled();
  });
  it("rechaza también una baja del catálogo sin reconfirmar", async () => {
    await expect(
      procesarVenta({ ...venta, totalEsperado: "700.00" }),
    ).rejects.toThrow("Los precios cambiaron");
    expect(mocks.tx.venta.create).not.toHaveBeenCalled();
  });
  it("el contrato exige el importe que la operadora confirmó", async () => {
    const { totalEsperado, ...sinConfirmacion } = venta;
    void totalEsperado;
    await expect(procesarVenta(sinConfirmacion as never)).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("encargo requiere nombre de clienta y acepta cualquier nombre libre sin ficha previa", async () => {
    mocks.tx.cliente.findUnique.mockResolvedValue({ id: "c" });
    await expect(procesarVenta(venta)).rejects.toThrow("nombre de la clienta");
    expect(mocks.tx.venta.create).not.toHaveBeenCalled();

    const ok = await procesarVenta({
      ...venta,
      clienteId: null,
      clienteNombre: "Lucía Nueva",
    });
    expect(ok).toEqual({ id: "v" });
  });
  it("consignación en pedidos rechazada explícitamente", async () => {
    mocks.tx.producto.findUnique.mockResolvedValue({
      id: "x",
      activo: true,
      enConsignacion: true,
    });
    await expect(procesarVenta(venta)).rejects.toThrow("consignación");
  });
  it("permite registrar venta inmediata aunque el producto figure sin stock si se confirma ignorarStock", async () => {
    mocks.tx.producto.findUniqueOrThrow.mockResolvedValue({
      id: "x",
      nombre: "Anillo",
      stockActual: 0,
    });
    const ok = await procesarVenta({
      ...venta,
      items: [{ productoId: "x", cantidad: 1, modalidad: "INMEDIATA" }],
      totalEsperado: "333.25",
      cobroInicial: undefined,
      ignorarStock: true,
    });
    expect(ok).toEqual({ id: "v" });
    expect(mocks.tx.producto.update).toHaveBeenCalledWith({
      where: { id: "x" },
      data: { stockActual: 0 },
    });
  });
});
describe("Entregas y cantidades", () => {
  const evento = {
    tipo: "ENTREGA" as const,
    itemId: "item",
    cantidad: 1,
    claveIdempotencia: "uuid-evento-pedido",
  };
  beforeEach(() => {
    mocks.tx.pedido.findUnique.mockResolvedValue({
      id: "pedido",
      venta: {
        anulada: false,
        total: dec("333.25"),
        pagos: [],
        items: [
          {
            id: "item",
            modalidad: "ENCARGO",
            cantidad: 2,
            cantidadRecibida: 1,
            cantidadEntregada: 0,
            seguimientoEstado: "LISTO",
          },
        ],
      },
    });
  });
  it("no entrega saldo por vendedor con excepción inventada", async () => {
    await expect(
      registrarEventoPedido(
        "pedido",
        { ...evento, excepcionSaldo: true, motivoExcepcion: "Autorizo" },
        "u",
      ),
    ).rejects.toThrow("administrador");
    expect(mocks.tx.itemVenta.update).not.toHaveBeenCalled();
  });
  it("no entrega unidades que todavía no recibió", async () => {
    await expect(
      registrarEventoPedido("pedido", { ...evento, cantidad: 2 }, "u"),
    ).rejects.toThrow("no recibida");
  });
  it("no modifica un ítem de otro pedido", async () => {
    await expect(
      registrarEventoPedido("pedido", { ...evento, itemId: "ajeno" }, "u"),
    ).rejects.toThrow("de este pedido");
  });
});

describe("Cancelación protegida", () => {
  const cancelacion = {
    tipo: "CANCELACION" as const,
    notas: "Clienta desistió del encargo",
    claveIdempotencia: "uuid-cancelacion-pedido",
  };
  beforeEach(() => {
    mocks.tx.user.findUnique.mockResolvedValue({ id: "u", role: "ADMIN" });
    mocks.tx.pedido.findUnique.mockResolvedValue({
      id: "pedido",
      venta: {
        anulada: false,
        total: dec("333.25"),
        pagos: [{ montoArs: dec("100") }],
        items: [{ cantidadEntregada: 0 }],
      },
    });
  });
  it("no cancela cobros sin devolución", async () => {
    await expect(
      registrarEventoPedido("pedido", cancelacion, "u"),
    ).rejects.toThrow("devolución trazable");
    expect(mocks.tx.venta.update).not.toHaveBeenCalled();
  });
  it("requiere administrador incluso si no hubo cobros", async () => {
    mocks.tx.user.findUnique.mockResolvedValue({ id: "u", role: "VENDEDOR" });
    await expect(
      registrarEventoPedido("pedido", cancelacion, "u"),
    ).rejects.toThrow("administrador");
    expect(mocks.tx.venta.update).not.toHaveBeenCalled();
  });
});

describe("Flujo flexible y coordinación de pedidos", () => {
  beforeEach(() => {
    mocks.tx.pedido.findMany.mockResolvedValue([
      {
        id: "pedido",
        venta: {
          anulada: false,
          total: dec("333.25"),
          pagos: [],
          items: [
            {
              id: "item",
              productoNombre: "Mesa Ratona",
              modalidad: "ENCARGO",
              cantidad: 2,
              cantidadRecibida: 0,
              cantidadEntregada: 0,
              seguimientoEstado: "PENDIENTE",
            },
          ],
        },
        eventos: [],
      },
    ]);
    mocks.tx.pedido.findUnique.mockResolvedValue({
      id: "pedido",
      venta: {
        anulada: false,
        total: dec("333.25"),
        pagos: [],
        items: [
          {
            id: "item",
            productoNombre: "Mesa Ratona",
            modalidad: "ENCARGO",
            cantidad: 2,
            cantidadRecibida: 0,
            cantidadEntregada: 0,
            seguimientoEstado: "PENDIENTE",
          },
        ],
      },
    });
  });

  it("permite registrar recepción directa desde PENDIENTE sin pasos ficticios", async () => {
    // Simulamos prisma.pedido.findMany fuera de la transacción para obtenerPedidos
    const prismaMod = await import("@/lib/prisma");
    (prismaMod.prisma as unknown as Record<string, unknown>).pedido = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "pedido",
          venta: {
            anulada: false,
            total: dec("333.25"),
            pagos: [],
            items: [],
          },
          eventos: [],
        },
      ]),
    };
    (prismaMod.prisma as unknown as Record<string, unknown>).user = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    await registrarEventoPedido(
      "pedido",
      {
        tipo: "RECEPCION",
        itemId: "item",
        cantidad: 2,
        claveIdempotencia: "uuid-recepcion-directa",
      },
      "u",
    );
    expect(mocks.tx.itemVenta.update).toHaveBeenCalledWith({
      where: { id: "item" },
      data: {
        cantidadRecibida: { increment: 2 },
        seguimientoEstado: "LISTO",
      },
    });
  });

  it("actualiza responsable y fecha prometida mediante evento COORDINACION trazable", async () => {
    const prismaMod = await import("@/lib/prisma");
    (prismaMod.prisma as unknown as Record<string, unknown>).pedido = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "pedido",
          venta: {
            anulada: false,
            total: dec("333.25"),
            pagos: [],
            items: [],
          },
          eventos: [],
        },
      ]),
    };
    (prismaMod.prisma as unknown as Record<string, unknown>).user = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    await registrarEventoPedido(
      "pedido",
      {
        tipo: "COORDINACION",
        responsable: "Taller Norte",
        fechaPrometida: "2026-11-15T12:00:00-03:00",
        claveIdempotencia: "uuid-coord-pedido-1",
      },
      "u",
    );
    expect(mocks.tx.pedido.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pedido" },
        data: expect.objectContaining({
          responsable: "Taller Norte",
        }),
      }),
    );
    expect(mocks.tx.eventoPedido.create).toHaveBeenCalled();
  });
});

