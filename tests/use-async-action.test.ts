import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncAction } from "@/hooks/use-async-action";

describe("useAsyncAction", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("arranca sin cargar", () => {
    const { result } = renderHook(() => useAsyncAction(async () => "ok"));
    expect(result.current.loading).toBe(false);
  });

  it("marca loading mientras corre y lo apaga al terminar", async () => {
    let resolver: (v: string) => void = () => {};
    const promesa = new Promise<string>((res) => {
      resolver = res;
    });
    const { result } = renderHook(() => useAsyncAction(() => promesa));

    let devuelto: Promise<string | undefined>;
    act(() => {
      devuelto = result.current.run();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      resolver("listo");
      await devuelto;
    });
    expect(result.current.loading).toBe(false);
  });

  it("apaga loading aunque la promesa falle, y propaga el error", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => {
        throw new Error("explotó");
      })
    );
    await act(async () => {
      await expect(result.current.run()).rejects.toThrow("explotó");
    });
    expect(result.current.loading).toBe(false);
  });

  it("ignora clics repetidos mientras hay una acción en vuelo", async () => {
    const fn = vi.fn(
      () => new Promise<string>((res) => setTimeout(() => res("ok"), 100))
    );
    const { result } = renderHook(() => useAsyncAction(fn));

    await act(async () => {
      const a = result.current.run();
      const b = result.current.run();
      await expect(b).resolves.toBeUndefined();
      vi.advanceTimersByTime(100);
      await a;
    });
    expect(fn).toHaveBeenCalledOnce();
  });

  it("el perro guardián apaga loading si la promesa nunca resuelve", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(() => new Promise<void>(() => {}), { timeoutMs: 1000 })
    );
    act(() => {
      void result.current.run();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.loading).toBe(false);
  });
});
