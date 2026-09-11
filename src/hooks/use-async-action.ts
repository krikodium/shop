"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export interface OpcionesAsyncAction {
  /**
   * Pasado este tiempo sin que la acción termine, el hook expone
   * `demorado: true` como aviso. No apaga `loading` ni libera la acción en
   * vuelo — solo informa que está tardando. Por defecto 8 s.
   */
  avisoMs?: number;
}

/**
 * Envuelve una acción asíncrona y expone su estado de carga.
 *
 * Garantías:
 * - `loading` queda en `true` hasta que la promesa realmente termina (éxito
 *   o error). Nunca se apaga ni se libera la acción en vuelo antes de eso
 *   — a diferencia de un timeout que "cancela" el indicador, acá no hay
 *   ninguna ventana en la que el botón vuelva a estar habilitado con la
 *   request original todavía viva. Es deliberado: en altas de plata (venta,
 *   cierre de caja, rendición) rehabilitar el botón mientras el POST
 *   original sigue en curso permite un segundo clic que dispara un POST
 *   concurrente y duplica la operación.
 * - Los clics repetidos mientras hay una acción en vuelo se ignoran
 *   (devuelven `undefined`), así no se duplican altas.
 * - `demorado` es puramente informativo: se enciende a los `avisoMs` si la
 *   acción sigue en curso, y vuelve a `false` cuando termina o al arrancar
 *   una nueva.
 * - No se actualiza el estado después de desmontar el componente.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opciones: OpcionesAsyncAction = {}
) {
  const { avisoMs = 8_000 } = opciones;
  const [loading, setLoading] = useState(false);
  const [demorado, setDemorado] = useState(false);

  const enVuelo = useRef(false);
  const montado = useRef(true);
  const aviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  // Sincronizamos el ref en `useLayoutEffect` (no en el cuerpo del render,
  // que es lo que prohíbe `react-hooks/refs`, y no en un `useEffect` pasivo,
  // que dejaría una ventana entre el commit y el efecto donde un click
  // podría llegar a invocar todavía la `fn` vieja): `run` siempre llama a la
  // versión más reciente de `fn`, sin que su propia identidad cambie en
  // cada render.
  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useLayoutEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (aviso.current) clearTimeout(aviso.current);
    };
  }, []);

  const terminar = useCallback(() => {
    enVuelo.current = false;
    if (aviso.current) {
      clearTimeout(aviso.current);
      aviso.current = null;
    }
    if (montado.current) {
      setLoading(false);
      setDemorado(false);
    }
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (enVuelo.current) return undefined;
      enVuelo.current = true;
      setLoading(true);
      setDemorado(false);
      aviso.current = setTimeout(() => {
        if (montado.current) setDemorado(true);
      }, avisoMs);

      try {
        return await fnRef.current(...args);
      } finally {
        terminar();
      }
    },
    [terminar, avisoMs]
  );

  return { run, loading, demorado };
}
