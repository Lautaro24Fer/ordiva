import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { buildBookingDays } from "@/modules/availability/booking-days";
import { DEFAULT_BOOKING_RULE } from "@/modules/businesses/businesses.service";

/**
 * Lecturas para las páginas públicas (Server Components). Devuelven `null`
 * si el negocio no existe, para que la página use `notFound()`. Solo exponen
 * datos públicos: nunca turnos ni datos de clientes.
 */

const publicServiceSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  price: true,
} as const;

export type PublicService = {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  /** Importe decimal como string, por ejemplo "12000.00". */
  price: string;
};

// `cache` deduplica la consulta dentro de un mismo request (metadata + página).
const findPublicBusiness = cache(async (slug: string) => {
  return prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      timezone: true,
      bookingRule: { select: { minNoticeMinutes: true, maxAdvanceDays: true } },
      services: { where: { isActive: true }, select: publicServiceSelect, orderBy: { name: "asc" } },
    },
  });
});

function toPublicServices(services: { price: { toFixed(d: number): string } }[]) {
  return services.map((s) => ({ ...s, price: s.price.toFixed(2) })) as PublicService[];
}

export async function getBusinessPage(slug: string) {
  const business = await findPublicBusiness(slug);
  if (!business) return null;
  return {
    business: {
      name: business.name,
      slug: business.slug,
      description: business.description,
      timezone: business.timezone,
    },
    services: toPublicServices(business.services),
  };
}

export async function getBookingPage(slug: string, now: Date) {
  const business = await findPublicBusiness(slug);
  if (!business) return null;

  const rule = business.bookingRule ?? DEFAULT_BOOKING_RULE;
  const openDays = await prisma.businessHours.findMany({
    where: { businessId: business.id },
    select: { dayOfWeek: true },
    distinct: ["dayOfWeek"],
  });

  return {
    business: { name: business.name, slug: business.slug, timezone: business.timezone },
    services: toPublicServices(business.services),
    minNoticeMinutes: rule.minNoticeMinutes,
    days: buildBookingDays(
      now,
      business.timezone,
      rule.maxAdvanceDays,
      new Set(openDays.map((d) => d.dayOfWeek)),
    ),
  };
}

/** Directorio de la demo: negocios con al menos un servicio activo. */
export function listDemoBusinesses() {
  return prisma.business.findMany({
    where: { services: { some: { isActive: true } } },
    select: { name: true, slug: true, description: true },
    orderBy: { name: "asc" },
    take: 20,
  });
}
