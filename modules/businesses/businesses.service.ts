import { conflict, notFound } from "@/lib/errors";
import { ConstraintViolation, type Repositories } from "@/modules/repositories";
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

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------

export async function getPublicBusiness(repos: Repositories, slug: string) {
  const business = await repos.businesses.findBySlug(slug);
  if (!business) throw notFound("Negocio no encontrado");
  const { name, description, timezone } = business;
  return { name, slug: business.slug, description, timezone };
}

// ---------------------------------------------------------------------------
// Administración: todas las operaciones verifican ownership contra la sesión.
// Un negocio ajeno responde 404, igual que uno inexistente (no se revela).
// ---------------------------------------------------------------------------

export async function requireOwnedBusiness(repos: Repositories, userId: number, businessId: number) {
  const business = await repos.businesses.findOwned(userId, businessId);
  if (!business) throw notFound("Negocio no encontrado");
  return business;
}

export function listOwnedBusinesses(repos: Repositories, userId: number) {
  return repos.businesses.listOwned(userId);
}

/** Crea el negocio y su BookingRule en la misma operación. */
export async function createBusiness(repos: Repositories, userId: number, input: CreateBusinessInput) {
  try {
    return await repos.businesses.create(
      userId,
      {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        timezone: input.timezone,
      },
      DEFAULT_BOOKING_RULE,
    );
  } catch (error) {
    if (error instanceof ConstraintViolation) throw conflict("SLUG_TAKEN", "Ese slug ya está en uso");
    throw error;
  }
}

export async function updateBusiness(
  repos: Repositories,
  userId: number,
  businessId: number,
  input: UpdateBusinessInput,
) {
  if (!(await repos.businesses.update(userId, businessId, input))) throw notFound("Negocio no encontrado");
  return requireOwnedBusiness(repos, userId, businessId);
}

export async function getBookingRule(repos: Repositories, userId: number, businessId: number) {
  await requireOwnedBusiness(repos, userId, businessId);
  return (await repos.bookingRules.find(businessId)) ?? DEFAULT_BOOKING_RULE;
}

export async function updateBookingRule(
  repos: Repositories,
  userId: number,
  businessId: number,
  input: BookingRuleInput,
) {
  await requireOwnedBusiness(repos, userId, businessId);
  return repos.bookingRules.upsert(businessId, input);
}

export async function getHours(repos: Repositories, userId: number, businessId: number) {
  await requireOwnedBusiness(repos, userId, businessId);
  return repos.hours.list(businessId);
}

/**
 * Reemplazo atómico de la agenda semanal. Las franjas ya llegan validadas
 * (sin solapamientos) por Zod.
 */
export async function replaceHours(
  repos: Repositories,
  userId: number,
  businessId: number,
  hours: HoursInterval[],
) {
  const saved = await repos.hours.replace(userId, businessId, hours);
  if (!saved) throw notFound("Negocio no encontrado");
  return saved;
}
