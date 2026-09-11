"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OpcionesAsyncAction {
  /**
   * Perro guardián: si la promesa no resuelve en este tiempo, se apaga el
   * indicador igual. Existe para que un botón nunca quede congelado por una
   * request colgada. Por defecto 15 s.
   */
  timeoutMs?: number;
}

/**
 * Envuelve una acción asíncrona y expone su estado de carga.
 *
 * Garantías:
 * - `loading` siempre vuelve a `false`: en éxito, en error, y por timeout.
 * - Los clics repetidos mientras hay una acción en vuelo se ignoran
 *   (devuelven `undefined`), así no se duplican altas.
 * - No se actualiza el estado después de desmontar el componente.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opciones: OpcionesAsyncAction = {}
) {
  const { timeoutMs = 15_000 } = opciones;
  const [loading, setLoading] = useState(false);

  const enVuelo = useRef(false);
  const montado = useRef(true);
  const guardian = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  // `useEffectEvent` no sirve acá: la función que devuelve solo se puede
  // invocar desde un Effect o desde otro Effect Event, y `run` se dispara
  // desde un click, no desde un efecto (regla `react-hooks/rules-of-hooks`).
  // En su lugar, sincronizamos el ref en un efecto (nunca en el cuerpo del
  // render, que es lo que prohíbe `react-hooks/refs`): `run` sigue llamando
  // siempre a la versión más reciente de `fn`, sin que su propia identidad
  // cambie en cada render.
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (guardian.current) clearTimeout(guardian.current);
    };
  }, []);

  const apagar = useCallback(() => {
    enVuelo.current = false;
    if (guardian.current) {
      clearTimeout(guardian.current);
      guardian.current = null;
    }
    if (montado.current) setLoading(false);
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (enVuelo.current) return undefined;
      enVuelo.current = true;
      setLoading(true);
      guardian.current = setTimeout(apagar, timeoutMs);

      try {
        return await fnRef.current(...args);
      } finally {
        apagar();
      }
    },
    [apagar, timeoutMs]
  );

  return { run, loading };
}
