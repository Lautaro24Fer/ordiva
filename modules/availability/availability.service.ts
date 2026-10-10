import "server-only";
import { prisma } from "@/lib/prisma";
import { notFound, unprocessable } from "@/lib/errors";
import { localDayOfWeek, toLocalTimeLabel } from "@/lib/time";
import { DEFAULT_BOOKING_RULE } from "@/modules/businesses/businesses.service";
import {
  candidateSlots,
  computeSlots,
  isWithinHorizon,
  openingIntervals,
  type Interval,
} from "./compute-slots";

/** Estados que ocupan agenda (coinciden con el WHERE del EXCLUDE en SQL). */
export const BLOCKING_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

/**
 * Resuelve negocio + servicio activo del negocio + regla + franjas del día.
 * Un servicio inexistente, inactivo o de otro negocio responde igual (404).
 * `localDate` puede ser una fecha local o una función que la deriva de la
 * zona horaria del negocio (p. ej. a partir de un instante).
 */
export async function loadBookingContext(
  slug: string,
  serviceId: number,
  localDate: string | ((timezone: string) => string),
) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, timezone: true, bookingRule: true },
  });
  if (!business) throw notFound("Negocio no encontrado");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true },
    select: { id: true, name: true, durationMinutes: true, price: true },
  });
  if (!service) throw notFound("Servicio no encontrado");

  const date = typeof localDate === "string" ? localDate : localDate(business.timezone);
  const rule = business.bookingRule ?? DEFAULT_BOOKING_RULE;
  const dayOfWeek = localDayOfWeek(date, business.timezone);
  if (dayOfWeek === null) throw unprocessable("INVALID_DATE", "Fecha inválida");

  const hours = await prisma.businessHours.findMany({
    where: { businessId: business.id, dayOfWeek },
    select: { startTime: true, endTime: true },
  });

  return { business, service, rule, hours, date };
}

export function assertWithinHorizon(date: string, timezone: string, now: Date, maxAdvanceDays: number) {
  if (!isWithinHorizon(date, timezone, now, maxAdvanceDays)) {
    throw unprocessable(
      "OUTSIDE_BOOKING_WINDOW",
      `Solo se puede reservar desde hoy y hasta ${maxAdvanceDays} días en adelante`,
    );
  }
}

/** Turnos que ocupan agenda y se cruzan con [from, to). */
export function findBusyIntervals(businessId: number, from: Date, to: Date): Promise<Interval[]> {
  return prisma.appointment.findMany({
    where: {
      businessId,
      status: { in: [...BLOCKING_STATUSES] },
      startAt: { lt: to },
      endAt: { gt: from },
    },
    select: { startAt: true, endAt: true },
  });
}

export async function getAvailability(slug: string, serviceId: number, date: string, now: Date = new Date()) {
  const { business, service, rule, hours } = await loadBookingContext(slug, serviceId, date);
  assertWithinHorizon(date, business.timezone, now, rule.maxAdvanceDays);

  const openings = openingIntervals(date, business.timezone, hours);
  const busy =
    openings.length === 0
      ? []
      : await findBusyIntervals(business.id, openings[0].startAt, openings[openings.length - 1].endAt);

  const slots = computeSlots({
    date,
    timezone: business.timezone,
    hours,
    durationMinutes: service.durationMinutes,
    slotIntervalMinutes: rule.slotIntervalMinutes,
    minNoticeMinutes: rule.minNoticeMinutes,
    busy,
    now,
  });

  return {
    date,
    timezone: business.timezone,
    serviceId: service.id,
    durationMinutes: service.durationMinutes,
    slots: slots.map((slot) => ({
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      label: toLocalTimeLabel(slot.startAt, business.timezone),
    })),
  };
}

/** ¿`startAt` coincide exactamente con un inicio de la grilla de ese día? */
export function isOnSlotGrid(
  startAt: Date,
  input: Parameters<typeof candidateSlots>[0],
): boolean {
  return candidateSlots(input).some((slot) => slot.startAt.getTime() === startAt.getTime());
}
