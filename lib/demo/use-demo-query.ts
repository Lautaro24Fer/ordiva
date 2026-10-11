"use client";

import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { demoRepos } from "@/lib/demo/client";
import { getDemoState, subscribeDemoState } from "@/lib/demo/store";
import { AppError } from "@/lib/errors";
import type { Repositories } from "@/modules/repositories";

export type DemoQueryResult<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "not-found" };

/**
 * Lee datos del modo demo con los mismos servicios que usan las páginas del
 * servidor. Vuelve a leer cuando cambia el store (una mutación hecha con
 * `apiRequest`, o en otra pestaña) o cuando cambia `key` (los argumentos).
 *
 * En el servidor y durante la hidratación devuelve "loading": localStorage
 * solo existe en el navegador.
 */
export function useDemoQuery<T>(key: string, load: (repos: Repositories) => Promise<T | null>): DemoQueryResult<T> {
  const state = useSyncExternalStore(subscribeDemoState, getDemoState, () => null);
  const [result, setResult] = useState<{ key: string; value: DemoQueryResult<T> }>();
  const [error, setError] = useState<unknown>();

  const run = useEffectEvent(() => load(demoRepos));

  useEffect(() => {
    if (state === null) return;
    let active = true;
    run().then(
      (data) => {
        if (active) setResult({ key, value: data === null ? { status: "not-found" } : { status: "ready", data } });
      },
      (reason: unknown) => {
        if (!active) return;
        // Un 404 de dominio (negocio inexistente o ajeno) se muestra como "no encontrado".
        if (reason instanceof AppError && reason.status === 404) {
          setResult({ key, value: { status: "not-found" } });
        } else {
          setError(reason);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [key, state]);

  // Un error inesperado sube al error boundary más cercano, como en el servidor.
  if (error) throw error;
  // Mientras se recalcula para otro `key`, no se muestran datos del anterior.
  if (!result || result.key !== key) return { status: "loading" };
  return result.value;
}
