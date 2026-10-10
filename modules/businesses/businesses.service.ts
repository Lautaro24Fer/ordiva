import "server-only";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { conflict, notFound } from "@/lib/errors";
import type {
  BookingRuleInput,
  CreateBusinessInput,
  HoursInterval,
  UpdateBusinessInput,
} from "@/schemas/businesses";

/** Valores por defecto (coinciden con los defaults de la tabla BookingRule). */
export const DEFAULT_BOOKING_RULE: BookingRuleInput = {
  slotIntervalMinutes: 15,
  minNoticeMinutes: 60,
  maxAdvanceDays: 30,
};

const publicBusinessSelect = {
  name: true,
  slug: true,
  description: true,
  timezone: true,
} as const;

const ownerBusinessSelect = { id: true, ...publicBusinessSelect, createdAt: true } as const;

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------

export async function getPublicBusiness(slug: string) {
  const business = await prisma.business.findUnique({ where: { slug }, select: publicBusinessSelect });
  if (!business) throw notFound("Negocio no encontrado");
  return business;
}

// ---------------------------------------------------------------------------
// Administración: todas las operaciones verifican ownership contra la sesión.
// Un negocio ajeno responde 404, igual que uno inexistente (no se revela).
// ---------------------------------------------------------------------------

export async function requireOwnedBusiness(userId: number, businessId: number) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
    select: ownerBusinessSelect,
  });
  if (!business) throw notFound("Negocio no encontrado");
  return business;
}

export function listOwnedBusinesses(userId: number) {
  return prisma.business.findMany({
    where: { ownerId: userId },
    select: ownerBusinessSelect,
    orderBy: { id: "asc" },
  });
}

/** Crea el negocio y su BookingRule en la misma transacción. */
export async function createBusiness(userId: number, input: CreateBusinessInput) {
  try {
    return await prisma.business.create({
      data: {
        ownerId: userId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        timezone: input.timezone,
        bookingRule: { create: DEFAULT_BOOKING_RULE },
      },
      select: ownerBusinessSelect,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("SLUG_TAKEN", "Ese slug ya está en uso");
    throw error;
  }
}

export async function updateBusiness(userId: number, businessId: number, input: UpdateBusinessInput) {
  const { count } = await prisma.business.updateMany({
    where: { id: businessId, ownerId: userId },
    data: input,
  });
  if (count === 0) throw notFound("Negocio no encontrado");
  return requireOwnedBusiness(userId, businessId);
}

const bookingRuleSelect = {
  slotIntervalMinutes: true,
  minNoticeMinutes: true,
  maxAdvanceDays: true,
} as const;

export async function getBookingRule(userId: number, businessId: number) {
  await requireOwnedBusiness(userId, businessId);
  const rule = await prisma.bookingRule.findUnique({ where: { businessId }, select: bookingRuleSelect });
  return rule ?? DEFAULT_BOOKING_RULE;
}

export async function updateBookingRule(userId: number, businessId: number, input: BookingRuleInput) {
  await requireOwnedBusiness(userId, businessId);
  return prisma.bookingRule.upsert({
    where: { businessId },
    update: input,
    create: { ...input, businessId },
    select: bookingRuleSelect,
  });
}

const hoursSelect = { dayOfWeek: true, startTime: true, endTime: true } as const;
const hoursOrder = [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }];

export async function getHours(userId: number, businessId: number) {
  await requireOwnedBusiness(userId, businessId);
  return prisma.businessHours.findMany({ where: { businessId }, select: hoursSelect, orderBy: hoursOrder });
}

/**
 * Reemplazo atómico de la agenda semanal. Las franjas ya llegan validadas
 * (sin solapamientos) por Zod; el lock sobre la fila del negocio serializa
 * ediciones concurrentes para que dos reemplazos no se mezclen.
 */
export async function replaceHours(userId: number, businessId: number, hours: HoursInterval[]) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "Business" WHERE "id" = ${businessId} AND "ownerId" = ${userId} FOR UPDATE`;
    if (locked.length === 0) throw notFound("Negocio no encontrado");

    await tx.businessHours.deleteMany({ where: { businessId } });
    await tx.businessHours.createMany({ data: hours.map((h) => ({ ...h, businessId })) });
    return tx.businessHours.findMany({ where: { businessId }, select: hoursSelect, orderBy: hoursOrder });
  });
}
