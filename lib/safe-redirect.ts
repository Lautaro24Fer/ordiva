/**
 * Solo permite redirigir a rutas internas ("/dashboard/..."). Evita open
 * redirects con valores como "https://otro.sitio" o "//otro.sitio".
 */
export function safeInternalPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
