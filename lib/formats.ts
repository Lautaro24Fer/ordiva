/**
 * Formatos y validaciones sin dependencias: seguros para importar desde
 * componentes de cliente (no arrastran Luxon ni código de servidor).
 */

/** "HH:mm" 24h con ancho fijo (00:00..23:59). */
export const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Fecha local "YYYY-MM-DD". */
export const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Identificador IANA válido según Intl (misma fuente que usa Luxon). */
export function isValidIanaZone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Minutos desde medianoche de un "HH:mm" válido. */
export function hhmmToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
