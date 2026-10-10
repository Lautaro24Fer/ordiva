import type { PrismaClient } from "@/generated/prisma/client";

/** Lunes 07/01/2030 09:00 en Argentina (UTC-3). Se fija con fake timers. */
export const NOW = new Date("2030-01-07T12:00:00.000Z");
/** Martes siguiente: dentro del horizonte y con aviso mínimo holgado. */
export const DAY = "2030-01-08";

/** Instante UTC de una hora local de Argentina el día `DAY`. */
export const localAt = (time: string, date = DAY) => new Date(`${date}T${time}:00-03:00`);

/**
 * Negocio con agenda todos los días 09:00–13:00 y 15:00–19:00, grilla de
 * 30 min, aviso de 60 min y horizonte de 30 días.
 */
export async function createTenant(prisma: PrismaClient, slug: string) {
  const owner = await prisma.user.create({ data: { name: `Owner ${slug}`, email: `${slug}@example.com` } });
  const business = await prisma.business.create({
    data: {
      name: `Negocio ${slug}`,
      slug,
      ownerId: owner.id,
      bookingRule: { create: { slotIntervalMinutes: 30, minNoticeMinutes: 60, maxAdvanceDays: 30 } },
      hours: {
        create: [0, 1, 2, 3, 4, 5, 6].flatMap((dayOfWeek) => [
          { dayOfWeek, startTime: "09:00", endTime: "13:00" },
          { dayOfWeek, startTime: "15:00", endTime: "19:00" },
        ]),
      },
    },
  });
  const short = await prisma.service.create({
    data: { businessId: business.id, name: "Corte", durationMinutes: 30, price: "12000.00" },
  });
  const long = await prisma.service.create({
    data: { businessId: business.id, name: "Color", durationMinutes: 60, price: "30000.50" },
  });
  return { owner, business, short, long };
}

export type Tenant = Awaited<ReturnType<typeof createTenant>>;

type Params<P> = { params: Promise<P> };

export function jsonRequest(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const ctx = <P>(params: P): Params<P> => ({ params: Promise.resolve(params) });
