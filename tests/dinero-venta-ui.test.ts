import { describe, expect, it } from "vitest";
import {
  escala,
  importe,
  porcentajeCentavos,
  convertirUsd,
} from "@/components/punto-venta/dinero-venta";

describe("importes de venta en la UI", () => {
  it("redondea el centavo impar del descuento comercial y conserva el total", () => {
    const subtotal = escala("333.25");
    const descuento = porcentajeCentavos(subtotal, "50");
    expect(importe(descuento)).toBe("166.63");
    expect(importe(subtotal - descuento)).toBe("166.62");
  });
  it("suma décimas sin tolerancias ni centavos residuales", () => {
    expect(importe(escala("0.10") + escala("0.20"))).toBe("0.30");
  });
  it("convierte USD con cotización de cuatro decimales y ROUND_HALF_UP", () => {
    expect(importe(convertirUsd("0.01", "1.5000"))).toBe("0.02");
    expect(importe(convertirUsd("12.34", "1234.5678"))).toBe("15234.57");
  });
  it("rechaza negativos, exponentes, decimales sobrantes y cotización cero", () => {
    for (const valor of ["-1", "1e3", "0.001", "", "abc"])
      expect(() => escala(valor)).toThrow();
    expect(() => convertirUsd("10", "0")).toThrow();
  });
});
