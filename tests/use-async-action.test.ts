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

  it("marca demorado a los avisoMs sin apagar loading, y no antes", async () => {
    let resolver: (v: string) => void = () => {};
    const promesa = new Promise<string>((res) => {
      resolver = res;
    });
    const { result } = renderHook(() =>
      useAsyncAction(() => promesa, { avisoMs: 1000 })
    );

    act(() => {
      void result.current.run();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));

    // Con `shouldAdvanceTime`, el reloj simulado también avanza con el
    // tiempo real de ejecución del test: para no ser frágil por un par de
    // ms de por medio, chequeamos "bastante antes" y "bastante después" en
    // vez del límite exacto de 1000ms.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.demorado).toBe(false);
    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.demorado).toBe(true);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolver("listo");
    });
  });

  it("mientras está demorado, un segundo run() se ignora y fn se llama una sola vez", async () => {
    let resolver: (v: string) => void = () => {};
    const fn = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolver = res;
        })
    );
    const { result } = renderHook(() => useAsyncAction(fn, { avisoMs: 1000 }));

    act(() => {
      void result.current.run();
    });
    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.demorado).toBe(true);

    let segundo: Promise<string | undefined>;
    act(() => {
      segundo = result.current.run();
    });
    await expect(segundo!).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledOnce();

    await act(async () => {
      resolver("listo");
    });
  });

  it("si la acción demorada resuelve, loading y demorado vuelven a false y un nuevo run() vuelve a invocar fn", async () => {
    let resolver: (v: string) => void = () => {};
    const fn = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolver = res;
        })
    );
    const { result } = renderHook(() => useAsyncAction(fn, { avisoMs: 1000 }));

    let primero: Promise<string | undefined>;
    act(() => {
      primero = result.current.run();
    });
    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.demorado).toBe(true);

    await act(async () => {
      resolver("listo");
      await primero;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.demorado).toBe(false);

    act(() => {
      void result.current.run();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("una acción que termina antes de avisoMs nunca marca demorado", async () => {
    let resolver: (v: string) => void = () => {};
    const promesa = new Promise<string>((res) => {
      resolver = res;
    });
    const { result } = renderHook(() =>
      useAsyncAction(() => promesa, { avisoMs: 1000 })
    );

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
    expect(result.current.demorado).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.demorado).toBe(false);
  });
});
