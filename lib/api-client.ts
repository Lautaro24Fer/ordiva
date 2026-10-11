import { IS_DEMO } from "@/lib/demo/flag";

/**
 * Cliente mínimo para la API JSON desde componentes de cliente. La sesión
 * viaja en la cookie httpOnly (same-origin); nunca se manejan tokens en JS.
 */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

export async function apiRequest<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  // Demo: la API corre en el navegador contra localStorage (ver lib/demo).
  if (IS_DEMO) {
    const { demoApi } = await import("@/lib/demo/client");
    const res = await demoApi(url, method, body);
    return toApiResult<T>(res.status, res.body);
  }

  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    return toApiResult<T>(res.status, await res.json().catch(() => null));
  } catch {
    return { ok: false, status: 0, message: "Error de conexión. Revisá tu internet y probá de nuevo." };
  }
}

function toApiResult<T>(status: number, payload: unknown): ApiResult<T> {
  if (status >= 200 && status < 300) return { ok: true, status, data: payload as T };

  if (status === 401) return { ok: false, status, message: "Tu sesión expiró. Volvé a ingresar." };
  const error = (payload as { error?: { message?: string; details?: { message?: string }[] } } | null)?.error;
  const message = error?.details?.[0]?.message ?? error?.message ?? "Ocurrió un error. Probá de nuevo.";
  return { ok: false, status, message };
}
