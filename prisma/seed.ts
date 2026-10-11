/**
 * Seed idempotente con datos ficticios: 2 propietarios, 2 negocios aislados,
 * servicios, franjas con corte de mediodía, reglas de reserva y algunos turnos.
 * Ejecutarlo varias veces no genera duplicados.
 */
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";
import { hashPassword } from "@/lib/password";
import { isExclusionViolation } from "@/lib/db-errors";
import { DEMO_PASSWORD, SEED_DATA, seedAppointmentStart } from "@/lib/demo/seed-data";

export { DEMO_PASSWORD, SEED_DATA };

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
      const startAt = seedAppointmentStart(appt, data.business.timezone, now);
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
