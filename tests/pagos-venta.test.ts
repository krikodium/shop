import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  estadoDePago,
  montoPorPorcentaje,
  montoSugerido,
  saldoPendiente,
  totalPagado,
  validarMontoPago,
} from "@/lib/calculadores/pagosVenta";

const pago = (montoArs: string) => ({ montoArs });

describe("totalPagado", () => {
  it("sin pagos es cero", () => {
    expect(totalPagado([]).toFixed(2)).toBe("0.00");
  });

  it("suma varios cobros", () => {
    expect(totalPagado([pago("100.50"), pago("200.25")]).toFixed(2)).toBe("300.75");
  });

  it("suma sin error de punto flotante", () => {
    // Con number, 0.1 + 0.2 da 0.30000000000000004 y el saldo nunca cierra.
    expect(totalPagado([pago("0.1"), pago("0.2")]).toFixed(2)).toBe("0.30");
  });

  it("acepta Decimal, number y string mezclados", () => {
    const pagos = [
      { montoArs: new Prisma.Decimal("10.01") },
      { montoArs: 20.02 },
      { montoArs: "30.03" },
    ];
    expect(totalPagado(pagos).toFixed(2)).toBe("60.06");
  });
});

describe("saldoPendiente", () => {
  it("es el total cuando no se cobró nada", () => {
    expect(saldoPendiente("1000.00", []).toFixed(2)).toBe("1000.00");
  });

  it("descuenta la seña", () => {
    expect(saldoPendiente("1000.00", [pago("400.00")]).toFixed(2)).toBe("600.00");
  });

  it("cierra exacto con dos cobros que suman el total", () => {
    expect(saldoPendiente("1000.00", [pago("333.33"), pago("666.67")]).toFixed(2)).toBe(
      "0.00"
    );
  });

  it("nunca es negativo si se cobró de más", () => {
    expect(saldoPendiente("100.00", [pago("150.00")]).toFixed(2)).toBe("0.00");
  });
});

describe("estadoDePago", () => {
  it("sin cobros es PENDIENTE", () => {
    expect(estadoDePago("1000.00", [])).toBe("PENDIENTE");
  });

  it("con una seña es PARCIAL", () => {
    expect(estadoDePago("1000.00", [pago("500.00")])).toBe("PARCIAL");
  });

  it("con el total cobrado es PAGADO", () => {
    expect(estadoDePago("1000.00", [pago("1000.00")])).toBe("PAGADO");
  });

  it("un centavo menos sigue siendo PARCIAL", () => {
    expect(estadoDePago("1000.00", [pago("999.99")])).toBe("PARCIAL");
  });

  it("cobrado de más también es PAGADO", () => {
    expect(estadoDePago("1000.00", [pago("1200.00")])).toBe("PAGADO");
  });
});

describe("validarMontoPago", () => {
  it("acepta un cobro menor al saldo", () => {
    expect(validarMontoPago("500.00", "1000.00")).toEqual({ ok: true });
  });

  it("acepta cancelar exactamente el saldo", () => {
    expect(validarMontoPago("1000.00", "1000.00")).toEqual({ ok: true });
  });

  it("rechaza cobrar más que el saldo", () => {
    const r = validarMontoPago("1000.01", "1000.00");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("supera el saldo");
  });

  it("rechaza cero y negativos", () => {
    expect(validarMontoPago("0", "1000.00").ok).toBe(false);
    expect(validarMontoPago("-50", "1000.00").ok).toBe(false);
  });

  it("rechaza más de dos decimales", () => {
    const r = validarMontoPago("10.999", "1000.00");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("dos decimales");
  });

  it("rechaza cobrar sobre una venta ya saldada", () => {
    const r = validarMontoPago("10.00", "0");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("saldada");
  });

  it("rechaza un importe que no es número", () => {
    expect(validarMontoPago("abc", "1000.00").ok).toBe(false);
  });
});

describe("montoPorPorcentaje", () => {
  it("calcula la mitad", () => {
    expect(montoPorPorcentaje("1000.00", 50).toFixed(2)).toBe("500.00");
  });

  it("redondea a dos decimales con redondeo comercial", () => {
    // 333.25 * 50% = 166.625 -> 166.63
    expect(montoPorPorcentaje("333.25", 50).toFixed(2)).toBe("166.63");
  });

  it("el 100 % es el total exacto", () => {
    expect(montoPorPorcentaje("1234.56", 100).toFixed(2)).toBe("1234.56");
  });

  it("rechaza porcentajes fuera de rango", () => {
    expect(() => montoPorPorcentaje("100", -1)).toThrow();
    expect(() => montoPorPorcentaje("100", 101)).toThrow();
  });

  it("dos señas del 50 % sin tope se pasan por un centavo", () => {
    // 333,25 / 2 = 166,625 -> 166,63. El saldo queda en 166,62.
    const mitad = montoPorPorcentaje("333.25", 50);
    const saldo = saldoPendiente("333.25", [{ montoArs: mitad }]);
    expect(saldo.toFixed(2)).toBe("166.62");
    expect(validarMontoPago(mitad, saldo).ok).toBe(false);
  });
});

describe("montoSugerido", () => {
  it("acota el porcentaje al saldo, así el segundo 50 % siempre entra", () => {
    const primera = montoSugerido("333.25", 50, "333.25");
    const saldo = saldoPendiente("333.25", [{ montoArs: primera }]);
    const segunda = montoSugerido("333.25", 50, saldo);

    expect(segunda.toFixed(2)).toBe("166.62");
    expect(validarMontoPago(segunda, saldo).ok).toBe(true);
    expect(saldoPendiente("333.25", [{ montoArs: primera }, { montoArs: segunda }]).toFixed(2)).toBe("0.00");
  });

  it("el 100 % sobre una venta sin cobros es el total", () => {
    expect(montoSugerido("1000.00", 100, "1000.00").toFixed(2)).toBe("1000.00");
  });

  it("nunca propone más que el saldo", () => {
    expect(montoSugerido("1000.00", 100, "250.00").toFixed(2)).toBe("250.00");
  });
});
