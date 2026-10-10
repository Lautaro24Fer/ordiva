import { DateTime } from "luxon";

/** "HH:mm" 24h con ancho fijo (00:00..23:59). */
export const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Fecha local "YYYY-MM-DD". */
export const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIanaZone(zone: string): boolean {
  return DateTime.local().setZone(zone).isValid;
}

/**
 * Convierte fecha local + "HH:mm" en la zona IANA dada a un instante UTC.
 *
 * Política DST (documentada):
 * - Hora local inexistente (salto de primavera): devuelve `null`; no se corre
 *   silenciosamente a otra hora.
 * - Hora local ambigua (retroceso de otoño): se toma la primera ocurrencia
 *   (offset más temprano), que es el comportamiento de Luxon.
 */
export function localDateTimeToUtc(
  localDate: string,
  time: string,
  zone: string,
): Date | null {
  if (!LOCAL_DATE_REGEX.test(localDate) || !HH_MM_REGEX.test(time)) return null;

  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone });

  if (!dt.isValid) return null;
  // Luxon desplaza horas inexistentes hacia adelante: detectar y rechazar.
  if (
    dt.year !== year ||
    dt.month !== month ||
    dt.day !== day ||
    dt.hour !== hour ||
    dt.minute !== minute
  ) {
    return null;
  }
  return dt.toJSDate();
}

/** Día de la semana de una fecha local con convención 0=domingo..6=sábado. */
export function localDayOfWeek(localDate: string, zone: string): number | null {
  const dt = DateTime.fromISO(localDate, { zone });
  if (!dt.isValid) return null;
  return dt.weekday % 7; // Luxon: 1=lunes..7=domingo
}

/** Fecha local "YYYY-MM-DD" de un instante en la zona dada. */
export function toLocalDate(instant: Date, zone: string): string {
  return DateTime.fromJSDate(instant, { zone }).toISODate()!;
}

/** Suma días a una fecha local "YYYY-MM-DD" (aritmética de calendario). */
export function addLocalDays(localDate: string, days: number): string {
  return DateTime.fromISO(localDate, { zone: "UTC" }).plus({ days }).toISODate()!;
}

/** Instantes [inicio, fin) del día local completo en la zona dada. */
export function localDayRange(localDate: string, zone: string): { start: Date; end: Date } | null {
  if (!LOCAL_DATE_REGEX.test(localDate)) return null;
  const day = DateTime.fromISO(localDate, { zone });
  if (!day.isValid) return null;
  // startOf("day") resuelve zonas donde la medianoche no existe por DST.
  const start = day.startOf("day");
  return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() };
}

/** "HH:mm" local de un instante en la zona dada (etiqueta para UI). */
export function toLocalTimeLabel(instant: Date, zone: string): string {
  return DateTime.fromJSDate(instant, { zone }).toFormat("HH:mm");
}

/** Minutos desde medianoche de un "HH:mm" válido. */
export function hhmmToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
