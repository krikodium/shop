"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferencia de UI guardada en `localStorage` (vista del catálogo, un panel
 * plegado…). Nada de datos de negocio: si el navegador no deja guardar, la
 * preferencia vive en memoria mientras dure la pestaña y listo.
 *
 * Por qué `useSyncExternalStore` y no `useState` + `useEffect`:
 * - La garantía que importa es la de hidratación: el HTML del servidor y el
 *   primer render del cliente tienen que coincidir. `getServerSnapshot`
 *   devuelve `null` ("no hay nada guardado"), así que tanto en el servidor
 *   como durante la hidratación el hook devuelve `inicial`. Recién después de
 *   hidratar React lee `getSnapshot` (el `localStorage` real) y re-renderiza.
 *   Es exactamente el "arranca con el inicial y lee en un efecto", sin un
 *   `setState` dentro de un efecto (que el lint del React Compiler marca con
 *   `react-hooks/set-state-in-effect`).
 * - Además se entera de cambios hechos en otra pestaña (evento `storage`) y
 *   de otros componentes que usen la misma clave.
 *
 * Tolerancia a fallos: `localStorage` inaccesible (modo privado, cookies
 * bloqueadas, cuota llena) y JSON roto nunca explotan: se usa `inicial`.
 */

/** Valores escritos que el navegador no dejó persistir. Tienen prioridad. */
const memoria = new Map<string, string>();
const oyentes = new Map<string, Set<() => void>>();

function leerCrudo(clave: string): string | null {
  const enMemoria = memoria.get(clave);
  if (enMemoria !== undefined) return enMemoria;
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function avisar(clave: string) {
  oyentes.get(clave)?.forEach((oyente) => oyente());
}

function parsear<T>(crudo: string | null, inicial: T): T {
  if (crudo === null) return inicial;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    return inicial;
  }
}

export function usePreferenciaLocal<T>(
  clave: string,
  inicial: T
): [T, (valor: T) => void] {
  const suscribir = useCallback(
    (oyente: () => void) => {
      let delClave = oyentes.get(clave);
      if (!delClave) {
        delClave = new Set();
        oyentes.set(clave, delClave);
      }
      delClave.add(oyente);

      const alCambiarStorage = (evento: StorageEvent) => {
        if (evento.key !== null && evento.key !== clave) return;
        memoria.delete(clave);
        oyente();
      };
      window.addEventListener("storage", alCambiarStorage);

      return () => {
        delClave.delete(oyente);
        window.removeEventListener("storage", alCambiarStorage);
      };
    },
    [clave]
  );

  // El snapshot es el string crudo: es un primitivo, estable entre lecturas,
  // así `useSyncExternalStore` no entra en un bucle de re-renders.
  const crudo = useSyncExternalStore(
    suscribir,
    () => leerCrudo(clave),
    () => null
  );

  // Pensado para preferencias chicas (un string, un booleano): parsear en
  // cada render es trivial y evita depender de la identidad de `inicial`.
  const valor = parsear(crudo, inicial);

  const guardar = useCallback(
    (nuevo: T) => {
      const serializado = JSON.stringify(nuevo);
      try {
        window.localStorage.setItem(clave, serializado);
        memoria.delete(clave);
      } catch {
        memoria.set(clave, serializado);
      }
      avisar(clave);
    },
    [clave]
  );

  return [valor, guardar];
}
