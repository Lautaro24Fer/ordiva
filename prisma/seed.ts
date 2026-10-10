/**
 * Seed idempotente con datos ficticios: 2 propietarios, 2 negocios aislados,
 * servicios, franjas con corte de mediodía, reglas de reserva y algunos turnos.
 * Ejecutarlo varias veces no genera duplicados.
 */
import "dotenv/config";
import { DateTime } from "luxon";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isExclusionViolation } from "@/lib/db-errors";
import { localDateTimeToUtc } from "@/lib/time";

/** Contraseña de las cuentas demo; solo para entornos de desarrollo/demo. */
export const DEMO_PASSWORD = "demo-password-123";

type SeedHours = { dayOfWeek: number; startTime: string; endTime: string }[];

type SeedBusiness = {
  owner: { name: string; email: string };
  business: { name: string; slug: string; description: string; timezone: string };
  rule: { slotIntervalMinutes: number; minNoticeMinutes: number; maxAdvanceDays: number };
  services: { name: string; description: string; durationMinutes: number; price: string }[];
  hours: SeedHours;
  appointments: { serviceName: string; daysAhead: number; time: string; customerName: string; customerContact: string }[];
};

// Lunes a viernes con corte de mediodía; sábado solo mañana.
const weekdaysWithBreak = (morning: [string, string], afternoon: [string, string]): SeedHours =>
  [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
    { dayOfWeek, startTime: morning[0], endTime: morning[1] },
    { dayOfWeek, startTime: afternoon[0], endTime: afternoon[1] },
  ]);

export const SEED_DATA: SeedBusiness[] = [
  {
    owner: { name: "Ana Propietaria", email: "ana@example.com" },
    business: {
      name: "Barbería Centro",
      slug: "barberia-centro",
      description: "Cortes clásicos y modernos en el centro.",
      timezone: "America/Argentina/Buenos_Aires",
    },
    rule: { slotIntervalMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 30 },
    services: [
      { name: "Corte de pelo", description: "Corte con tijera o máquina.", durationMinutes: 30, price: "12000.00" },
      { name: "Corte + barba", description: "Corte completo y perfilado de barba.", durationMinutes: 45, price: "18000.00" },
      { name: "Afeitado clásico", description: "Afeitado con navaja y toalla caliente.", durationMinutes: 30, price: "9000.00" },
    ],
    hours: [
      ...weekdaysWithBreak(["09:00", "13:00"], ["15:00", "20:00"]),
      { dayOfWeek: 6, startTime: "09:00", endTime: "14:00" },
    ],
    appointments: [
      { serviceName: "Corte de pelo", daysAhead: 2, time: "10:00", customerName: "Cliente Ejemplo", customerContact: "cliente1@example.com" },
      { serviceName: "Corte + barba", daysAhead: 3, time: "16:00", customerName: "Otro Cliente", customerContact: "+5491100000001" },
    ],
  },
  {
    owner: { name: "Bruno Propietario", email: "bruno@example.com" },
    business: {
      name: "Estética Norte",
      slug: "estetica-norte",
      description: "Tratamientos faciales y manicuría.",
      timezone: "America/Argentina/Buenos_Aires",
    },
    rule: { slotIntervalMinutes: 30, minNoticeMinutes: 120, maxAdvanceDays: 45 },
    services: [
      { name: "Limpieza facial", description: "Limpieza profunda.", durationMinutes: 60, price: "25000.00" },
      { name: "Manicuría", description: "Manicuría tradicional.", durationMinutes: 45, price: "15000.00" },
    ],
    hours: weekdaysWithBreak(["10:00", "13:00"], ["14:00", "19:00"]),
    appointments: [
      { serviceName: "Limpieza facial", daysAhead: 2, time: "10:00", customerName: "Clienta Ejemplo", customerContact: "clienta@example.com" },
    ],
  },
];

/** Próxima fecha local (>= daysAhead) que cae en lunes..viernes. */
function nextWeekdayLocalDate(daysAhead: number, zone: string, now: Date): string {
  let dt = DateTime.fromJSDate(now, { zone }).startOf("day").plus({ days: daysAhead });
  while (dt.weekday > 5) dt = dt.plus({ days: 1 });
  return dt.toISODate()!;
}

export async function seed(prisma: PrismaClient, now: Date = new Date()): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const data of SEED_DATA) {
    const owner = await prisma.user.upsert({
      where: { email: data.owner.email },
      update: { name: data.owner.name },
      create: { ...data.owner, passwordHash },
    });

    const business = await prisma.business.upsert({
      where: { slug: data.business.slug },
      update: { name: data.business.name, description: data.business.description, timezone: data.business.timezone },
      create: { ...data.business, ownerId: owner.id },
    });

    await prisma.bookingRule.upsert({
      where: { businessId: business.id },
      update: data.rule,
      create: { ...data.rule, businessId: business.id },
    });

    // Service no tiene clave natural única: se identifica por (businessId, name).
    const serviceIds = new Map<string, number>();
    for (const service of data.services) {
      const existing = await prisma.service.findFirst({
        where: { businessId: business.id, name: service.name },
        select: { id: true },
      });
      const saved = existing
        ? await prisma.service.update({ where: { id: existing.id }, data: service })
        : await prisma.service.create({ data: { ...service, businessId: business.id } });
      serviceIds.set(service.name, saved.id);
    }

    // Franjas: reemplazo atómico (configuración, sin histórico que preservar).
    await prisma.$transaction([
      prisma.businessHours.deleteMany({ where: { businessId: business.id } }),
      prisma.businessHours.createMany({
        data: data.hours.map((h) => ({ ...h, businessId: business.id })),
      }),
    ]);

    // Turnos futuros relativos a "now". Se omiten si ya existen o si chocan con
    // un turno sembrado en una corrida anterior (el EXCLUDE lo impide).
    for (const appt of data.appointments) {
      const service = data.services.find((s) => s.name === appt.serviceName)!;
      const localDate = nextWeekdayLocalDate(appt.daysAhead, data.business.timezone, now);
      const startAt = localDateTimeToUtc(localDate, appt.time, data.business.timezone);
      if (!startAt) throw new Error(`Hora local inválida en seed: ${localDate} ${appt.time}`);
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

      const exists = await prisma.appointment.findFirst({
        where: { businessId: business.id, startAt },
        select: { id: true },
      });
      if (exists) continue;

      try {
        await prisma.appointment.create({
          data: {
            businessId: business.id,
            serviceId: serviceIds.get(appt.serviceName)!,
            customerName: appt.customerName,
            customerContact: appt.customerContact,
            startAt,
            endAt,
            serviceDurationMinutes: service.durationMinutes,
            servicePrice: service.price,
          },
        });
      } catch (error) {
        if (!isExclusionViolation(error)) throw error;
      }
    }
  }
}

// Ejecución directa: `npx prisma db seed` o `npm run db:seed`.
if (import.meta.url === `file://${process.argv[1]}`) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no definida");
  const prisma = createPrismaClient(connectionString);
  seed(prisma)
    .then(() => console.log("Seed completado."))
    .catch((error) => {
      console.error("Seed falló:", error instanceof Error ? error.message : "error desconocido");
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
