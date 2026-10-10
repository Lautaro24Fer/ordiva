import "server-only";
import { prisma } from "@/lib/prisma";
import { isExclusionViolation } from "@/lib/db-errors";
import { conflict, notFound, unprocessable } from "@/lib/errors";
import { localDayRange, toLocalDate } from "@/lib/time";
import type { CreatePublicAppointmentInput } from "@/schemas/appointments";
import {
  assertWithinHorizon,
  isOnSlotGrid,
  loadBookingContext,
} from "@/modules/availability/availability.service";
import { requireOwnedBusiness } from "@/modules/businesses/businesses.service";

const MINUTE_MS = 60_000;

const SLOT_TAKEN = () =>
  conflict("SLOT_UNAVAILABLE", "Ese horario ya no está disponible, elegí otro");

/**
 * Crea una reserva pública. El servidor es la fuente de verdad: resuelve el
 * negocio y el servicio, valida grilla, aviso mínimo y horizonte, calcula
 * `endAt` y el snapshot de precio/duración. La no superposición la garantiza
 * el EXCLUDE de PostgreSQL de forma atómica (sin check-then-insert).
 */
export async function createPublicAppointment(
  slug: string,
  input: CreatePublicAppointmentInput,
  now: Date = new Date(),
) {
  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) throw unprocessable("INVALID_START", "Horario inválido");

  // La fecha local se deriva del instante en la zona del negocio.
  const ctx = await loadBookingContext(slug, input.serviceId, (timezone) => toLocalDate(startAt, timezone));
  const { rule, service, hours, date } = ctx;

  if (startAt.getTime() < now.getTime() + rule.minNoticeMinutes * MINUTE_MS) {
    throw unprocessable(
      "INSUFFICIENT_NOTICE",
      `Las reservas requieren al menos ${rule.minNoticeMinutes} minutos de anticipación`,
    );
  }
  assertWithinHorizon(date, ctx.business.timezone, now, rule.maxAdvanceDays);

  const onGrid = isOnSlotGrid(startAt, {
    date,
    timezone: ctx.business.timezone,
    hours,
    durationMinutes: service.durationMinutes,
    slotIntervalMinutes: rule.slotIntervalMinutes,
  });
  if (!onGrid) {
    throw unprocessable("NOT_A_VALID_SLOT", "El horario no corresponde a un turno ofrecido por el negocio");
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        businessId: ctx.business.id,
        serviceId: service.id,
        customerName: input.customerName,
        customerContact: input.customerContact,
        startAt,
        endAt: new Date(startAt.getTime() + service.durationMinutes * MINUTE_MS),
        status: "CONFIRMED",
        serviceDurationMinutes: service.durationMinutes,
        servicePrice: service.price,
      },
      select: { id: true, startAt: true, endAt: true, status: true },
    });

    // Respuesta sin datos personales (ni siquiera los del propio solicitante).
    return {
      id: appointment.id,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price.toFixed(2),
      },
    };
  } catch (error) {
    if (isExclusionViolation(error)) throw SLOT_TAKEN();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

const adminAppointmentSelect = {
  id: true,
  customerName: true,
  customerContact: true,
  startAt: true,
  endAt: true,
  status: true,
  serviceDurationMinutes: true,
  servicePrice: true,
  service: { select: { id: true, name: true } },
} as const;

type AdminAppointmentRow = {
  startAt: Date;
  endAt: Date;
  servicePrice: { toFixed(decimals: number): string };
};

function serializeAdminAppointment<T extends AdminAppointmentRow>(row: T) {
  return {
    ...row,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    servicePrice: row.servicePrice.toFixed(2),
  };
}

/** Turnos de un día local del negocio, solo si el negocio es del usuario. */
export async function listAppointments(userId: number, businessId: number, date: string) {
  const business = await requireOwnedBusiness(userId, businessId);
  const range = localDayRange(date, business.timezone);
  if (!range) throw unprocessable("INVALID_DATE", "Fecha inválida");

  const rows = await prisma.appointment.findMany({
    where: { businessId, startAt: { gte: range.start, lt: range.end } },
    select: adminAppointmentSelect,
    orderBy: { startAt: "asc" },
  });
  return rows.map(serializeAdminAppointment);
}

/**
 * Transiciones permitidas: CONFIRMED → CANCELLED | COMPLETED. El filtro por
 * estado actual va en el mismo UPDATE, así dos cambios concurrentes no pueden
 * aplicarse ambos. Nunca se reactiva un turno ni se borra.
 */
export async function updateAppointmentStatus(
  userId: number,
  businessId: number,
  appointmentId: number,
  status: "CANCELLED" | "COMPLETED",
) {
  const ownedWhere = { id: appointmentId, businessId, business: { ownerId: userId } };

  const { count } = await prisma.appointment.updateMany({
    where: { ...ownedWhere, status: "CONFIRMED" },
    data: { status },
  });

  const appointment = await prisma.appointment.findFirst({ where: ownedWhere, select: adminAppointmentSelect });
  if (!appointment) throw notFound("Turno no encontrado");
  if (count === 0) {
    throw conflict("INVALID_STATUS_TRANSITION", "Solo se pueden modificar turnos confirmados");
  }
  return serializeAdminAppointment(appointment);
}
