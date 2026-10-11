import { conflict, notFound, unprocessable } from "@/lib/errors";
import { localDayRange, toLocalDate } from "@/lib/time";
import type { CreatePublicAppointmentInput } from "@/schemas/appointments";
import {
  assertWithinHorizon,
  isOnSlotGrid,
  loadBookingContext,
} from "@/modules/availability/availability.service";
import { requireOwnedBusiness } from "@/modules/businesses/businesses.service";
import { ConstraintViolation, type AdminAppointmentRow, type Repositories } from "@/modules/repositories";

const MINUTE_MS = 60_000;

const SLOT_TAKEN = () =>
  conflict("SLOT_UNAVAILABLE", "Ese horario ya no está disponible, elegí otro");

/**
 * Crea una reserva pública. El servidor es la fuente de verdad: resuelve el
 * negocio y el servicio, valida grilla, aviso mínimo y horizonte, calcula
 * `endAt` y el snapshot de precio/duración. La no superposición la garantiza
 * el repositorio de forma atómica (en PostgreSQL, un EXCLUDE: sin
 * check-then-insert).
 */
export async function createPublicAppointment(
  repos: Repositories,
  slug: string,
  input: CreatePublicAppointmentInput,
  now: Date = new Date(),
) {
  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) throw unprocessable("INVALID_START", "Horario inválido");

  // La fecha local se deriva del instante en la zona del negocio.
  const ctx = await loadBookingContext(repos, slug, input.serviceId, (timezone) => toLocalDate(startAt, timezone));
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
    const appointment = await repos.appointments.create({
      businessId: ctx.business.id,
      serviceId: service.id,
      customerName: input.customerName,
      customerContact: input.customerContact,
      startAt,
      endAt: new Date(startAt.getTime() + service.durationMinutes * MINUTE_MS),
      serviceDurationMinutes: service.durationMinutes,
      servicePrice: service.price,
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
        price: service.price,
      },
    };
  } catch (error) {
    if (error instanceof ConstraintViolation) throw SLOT_TAKEN();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

function serializeAdminAppointment(row: AdminAppointmentRow) {
  return { ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() };
}

/** Turnos de un día local del negocio, solo si el negocio es del usuario. */
export async function listAppointments(repos: Repositories, userId: number, businessId: number, date: string) {
  const business = await requireOwnedBusiness(repos, userId, businessId);
  const range = localDayRange(date, business.timezone);
  if (!range) throw unprocessable("INVALID_DATE", "Fecha inválida");

  const rows = await repos.appointments.listInRange(businessId, range.start, range.end);
  return rows.map(serializeAdminAppointment);
}

/**
 * Transiciones permitidas: CONFIRMED → CANCELLED | COMPLETED. El repositorio
 * aplica el cambio solo si el turno sigue CONFIRMED (dos cambios concurrentes
 * no pueden aplicarse ambos). Nunca se reactiva un turno ni se borra.
 */
export async function updateAppointmentStatus(
  repos: Repositories,
  userId: number,
  businessId: number,
  appointmentId: number,
  status: "CANCELLED" | "COMPLETED",
) {
  const { appointment, applied } = await repos.appointments.transitionFromConfirmed(
    userId,
    businessId,
    appointmentId,
    status,
  );
  if (!appointment) throw notFound("Turno no encontrado");
  if (!applied) {
    throw conflict("INVALID_STATUS_TRANSITION", "Solo se pueden modificar turnos confirmados");
  }
  return serializeAdminAppointment(appointment);
}
