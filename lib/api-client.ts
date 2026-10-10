/**
 * Cliente mínimo para la API JSON desde componentes de cliente. La sesión
 * viaja en la cookie httpOnly (same-origin); nunca se manejan tokens en JS.
 */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

export async function apiRequest<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data: payload as T };

    if (res.status === 401) return { ok: false, status: 401, message: "Tu sesión expiró. Volvé a ingresar." };
    const details = payload?.error?.details as { message?: string }[] | undefined;
    const message = details?.[0]?.message ?? payload?.error?.message ?? "Ocurrió un error. Probá de nuevo.";
    return { ok: false, status: res.status, message };
  } catch {
    return { ok: false, status: 0, message: "Error de conexión. Revisá tu internet y probá de nuevo." };
  }
}
