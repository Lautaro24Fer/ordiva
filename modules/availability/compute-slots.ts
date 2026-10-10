/**
 * Cálculo puro de disponibilidad (sin I/O). Toda la información, incluido
 * `now`, llega por parámetro para que el resultado sea determinista.
 */
import { addLocalDays, localDateTimeToUtc, toLocalDate } from "@/lib/time";

export type Interval = { startAt: Date; endAt: Date };

export type ComputeSlotsInput = {
  /** Fecha local "YYYY-MM-DD" en la zona del negocio. */
  date: string;
  timezone: string;
  /** Franjas del día de la semana de `date`, en hora local "HH:mm". */
  hours: { startTime: string; endTime: string }[];
  durationMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  /** Turnos que ocupan agenda (CONFIRMED/COMPLETED) del mismo negocio. */
  busy: Interval[];
  now: Date;
};

const MINUTE_MS = 60_000;

/** Intervalos semiabiertos [start, end): adyacentes no se solapan. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

/**
 * Convierte las franjas locales a instantes UTC para esa fecha. Una franja
 * cuyo inicio o cierre no existe en esa fecha (salto DST) se descarta: no se
 * corre a otro horario silenciosamente.
 */
export function openingIntervals(date: string, timezone: string, hours: ComputeSlotsInput["hours"]): Interval[] {
  const intervals: Interval[] = [];
  for (const h of hours) {
    const startAt = localDateTimeToUtc(date, h.startTime, timezone);
    const endAt = localDateTimeToUtc(date, h.endTime, timezone);
    if (startAt && endAt && endAt > startAt) intervals.push({ startAt, endAt });
  }
  return intervals.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Grilla de inicios posibles: cada `slotIntervalMinutes` desde la apertura de
 * cada franja, en tiempo absoluto, y solo si el servicio completo termina
 * antes del cierre de esa misma franja (no cruza descansos ni fin de jornada).
 */
export function candidateSlots(input: Omit<ComputeSlotsInput, "busy" | "now" | "minNoticeMinutes">): Interval[] {
  const durationMs = input.durationMinutes * MINUTE_MS;
  const stepMs = input.slotIntervalMinutes * MINUTE_MS;
  const slots: Interval[] = [];

  for (const opening of openingIntervals(input.date, input.timezone, input.hours)) {
    for (
      let start = opening.startAt.getTime();
      start + durationMs <= opening.endAt.getTime();
      start += stepMs
    ) {
      slots.push({ startAt: new Date(start), endAt: new Date(start + durationMs) });
    }
  }
  return slots;
}

/** Slots libres, con aviso mínimo cumplido, ordenados ascendentemente. */
export function computeSlots(input: ComputeSlotsInput): Interval[] {
  const earliest = input.now.getTime() + input.minNoticeMinutes * MINUTE_MS;

  return candidateSlots(input)
    .filter((slot) => slot.startAt.getTime() >= earliest)
    .filter((slot) => !input.busy.some((booking) => overlaps(slot, booking)))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Horizonte de reserva: desde hoy (en la zona del negocio) hasta
 * hoy + maxAdvanceDays − 1, ambos inclusive.
 */
export function isWithinHorizon(date: string, timezone: string, now: Date, maxAdvanceDays: number): boolean {
  const today = toLocalDate(now, timezone);
  const lastDay = addLocalDays(today, maxAdvanceDays - 1);
  return date >= today && date <= lastDay;
}
