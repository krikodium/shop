import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { usePreferenciaLocal } from "@/hooks/use-preferencia-local";

// El hook guarda en memoria los valores que el navegador no dejó persistir,
// a nivel módulo: cada test usa su propia clave para no pisarse.
let n = 0;
const claveNueva = () => `test-preferencia-${++n}`;

describe("usePreferenciaLocal", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("sin nada guardado devuelve el valor inicial", () => {
    const clave = claveNueva();
    const { result } = renderHook(() => usePreferenciaLocal(clave, "fotos"));
    expect(result.current[0]).toBe("fotos");
  });

  it("en el render del servidor (y la hidratación) usa el inicial aunque haya algo guardado", () => {
    const clave = claveNueva();
    window.localStorage.setItem(clave, JSON.stringify("lista"));
    function Muestra() {
      const [valor] = usePreferenciaLocal(clave, "fotos");
      return <span>{valor}</span>;
    }
    expect(renderToString(<Muestra />)).toContain("fotos");
  });

  it("lee lo que ya estaba guardado", () => {
    const clave = claveNueva();
    window.localStorage.setItem(clave, JSON.stringify("compacta"));
    const { result } = renderHook(() => usePreferenciaLocal(clave, "fotos"));
    expect(result.current[0]).toBe("compacta");
  });

  it("persiste el valor nuevo y re-renderiza", () => {
    const clave = claveNueva();
    const { result } = renderHook(() => usePreferenciaLocal(clave, "fotos"));
    act(() => result.current[1]("lista"));
    expect(result.current[0]).toBe("lista");
    expect(window.localStorage.getItem(clave)).toBe(JSON.stringify("lista"));
  });

  it("mantiene sincronizados dos usos de la misma clave", () => {
    const clave = claveNueva();
    const a = renderHook(() => usePreferenciaLocal(clave, 1));
    const b = renderHook(() => usePreferenciaLocal(clave, 1));
    act(() => a.result.current[1](7));
    expect(b.result.current[0]).toBe(7);
  });

  it("si localStorage tira error al leer, usa el inicial sin explotar", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const clave = claveNueva();
    const { result } = renderHook(() => usePreferenciaLocal(clave, "fotos"));
    expect(result.current[0]).toBe("fotos");
  });

  it("si localStorage tira error al guardar, el cambio igual se ve (queda en memoria)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const clave = claveNueva();
    const { result } = renderHook(() => usePreferenciaLocal(clave, "fotos"));
    expect(() => act(() => result.current[1]("lista"))).not.toThrow();
    expect(result.current[0]).toBe("lista");
  });

  it("con JSON roto guardado devuelve el inicial", () => {
    const clave = claveNueva();
    window.localStorage.setItem(clave, "{esto no es json");
    const { result } = renderHook(() => usePreferenciaLocal(clave, "fotos"));
    expect(result.current[0]).toBe("fotos");
  });
});
