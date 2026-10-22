import { describe, expect, it } from "vitest";
import { resumenCobros, resumenVentas } from "@/lib/resumenFinanciero";
import { fechaNegocio, inicioDiaNegocio, siguienteDia } from "@/lib/fechasNegocio";

describe("resumen comercial", () => {
  it("separa venta, cobros y saldo con decimales exactos", () => {
    const resumen = resumenVentas([
      { total: "333.25", gananciaBruta: "100.05", pagos: [{ montoArs: "166.63" }, { montoArs: "100.00" }] },
      { total: "0.30", gananciaBruta: "0.20", pagos: [{ montoArs: "0.10" }, { montoArs: "0.20" }] },
    ]);
    expect(resumen).toMatchObject({ totalVentas: "333.55", totalCobradoVentas: "266.93", saldoPendiente: "66.62", totalGanancia: "100.25" });
  });
  it("agrupa cobros posteriores sin tratar el total vendido como recibido", () => {
    const resumen = resumenCobros([
      { montoArs: "100000.00", montoUsd: "100.00", metodoPago: "EFECTIVO" },
      { montoArs: "120000.00", montoUsd: "100.00", metodoPago: "EFECTIVO" },
      { montoArs: "0.30", montoUsd: null, metodoPago: "TRANSFERENCIA" },
    ]);
    expect(resumen.totalCobrado).toBe("220000.30");
    expect(resumen.totalUsd).toBe("200.00");
    expect(resumen.porMetodo.EFECTIVO).toEqual({ total: "220000.00", cantidad: 2 });
  });
  it("respeta el día de Buenos Aires aunque el servidor esté en UTC", () => {
    expect(fechaNegocio(new Date("2026-10-01T02:59:59Z"))).toBe("2026-09-30");
    expect(inicioDiaNegocio("2026-10-01").toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(siguienteDia("2026-09-30")).toBe("2026-10-01");
  });
});
