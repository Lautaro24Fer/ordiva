import { DateTime } from "luxon";

export type BookingDay = {
  /** Fecha local "YYYY-MM-DD" en la zona del negocio. */
  date: string;
  /** Día de la semana abreviado, por ejemplo "mar". */
  weekday: string;
  /** Día y mes, por ejemplo "13 oct". */
  label: string;
  /** Hay franjas de atención configuradas para ese día de la semana. */
  isOpen: boolean;
};

/** Tope de días mostrados en la UI aunque la regla permita más. */
export const MAX_DAYS_SHOWN = 60;

/**
 * Días reservables desde hoy (en la zona del negocio) hasta el horizonte.
 * Que un día esté abierto no garantiza turnos libres: eso lo decide la
 * disponibilidad al consultarla.
 */
export function buildBookingDays(
  now: Date,
  timezone: string,
  maxAdvanceDays: number,
  openDaysOfWeek: ReadonlySet<number>,
): BookingDay[] {
  const today = DateTime.fromJSDate(now, { zone: timezone }).setLocale("es-AR").startOf("day");
  const count = Math.min(maxAdvanceDays, MAX_DAYS_SHOWN);

  return Array.from({ length: count }, (_, offset) => {
    const day = today.plus({ days: offset });
    return {
      date: day.toISODate()!,
      weekday: day.toFormat("ccc").replace(".", ""),
      label: day.toFormat("d LLL").replace(".", ""),
      isOpen: openDaysOfWeek.has(day.weekday % 7),
    };
  });
}
