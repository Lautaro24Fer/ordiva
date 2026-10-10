import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/password";
import { DEMO_PASSWORD, SEED_DATA, seed } from "@/prisma/seed";
import { createTestPrisma, resetDatabase } from "./test-db";

const prisma = createTestPrisma();

async function countAll() {
  const [users, businesses, services, hours, rules, appointments] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.service.count(),
    prisma.businessHours.count(),
    prisma.bookingRule.count(),
    prisma.appointment.count(),
  ]);
  return { users, businesses, services, hours, rules, appointments };
}

beforeAll(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("seed", () => {
  it("es idempotente: dos ejecuciones producen los mismos registros", async () => {
    const now = new Date("2030-01-07T12:00:00Z");
    await seed(prisma, now);
    const first = await countAll();
    await seed(prisma, now);
    const second = await countAll();

    expect(second).toEqual(first);
    expect(first).toEqual({
      users: SEED_DATA.length,
      businesses: SEED_DATA.length,
      services: SEED_DATA.reduce((n, d) => n + d.services.length, 0),
      hours: SEED_DATA.reduce((n, d) => n + d.hours.length, 0),
      rules: SEED_DATA.length,
      appointments: SEED_DATA.reduce((n, d) => n + d.appointments.length, 0),
    });
  });

  it("guarda contraseñas con hash Argon2id, nunca en texto claro", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: SEED_DATA[0].owner.email } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(user.passwordHash!, DEMO_PASSWORD)).toBe(true);
  });
});
