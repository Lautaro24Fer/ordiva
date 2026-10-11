import { buildBookingDays } from "@/modules/availability/booking-days";
import { DEFAULT_BOOKING_RULE } from "@/modules/businesses/businesses.service";
import type { Repositories, ServiceRow } from "@/modules/repositories";

/**
 * Lecturas para las páginas públicas. Devuelven `null` si el negocio no
 * existe, para que la página muestre "no encontrado". Solo exponen datos
 * públicos: nunca turnos ni datos de clientes.
 */

export type PublicService = Omit<ServiceRow, "isActive">;

export async function getBusinessPage(repos: Repositories, slug: string) {
  const business = await repos.businesses.findPublicPage(slug);
  if (!business) return null;
  return {
    business: {
      name: business.name,
      slug: business.slug,
      description: business.description,
      timezone: business.timezone,
    },
    services: business.services,
  };
}

export async function getBookingPage(repos: Repositories, slug: string, now: Date) {
  const business = await repos.businesses.findPublicPage(slug);
  if (!business) return null;

  const rule = business.bookingRule ?? DEFAULT_BOOKING_RULE;
  const openDays = await repos.hours.openDays(business.id);

  return {
    business: { name: business.name, slug: business.slug, timezone: business.timezone },
    services: business.services,
    minNoticeMinutes: rule.minNoticeMinutes,
    days: buildBookingDays(now, business.timezone, rule.maxAdvanceDays, new Set(openDays)),
  };
}

/** Directorio de la demo: negocios con al menos un servicio activo. */
export function listDemoBusinesses(repos: Repositories) {
  return repos.businesses.listWithActiveServices(20);
}
