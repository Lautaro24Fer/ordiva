import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma";

/** URL de la BD de test; se niega a operar sobre algo que no parezca de test. */
export function getTestDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST no definida");
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    throw new Error("DATABASE_URL_TEST debe apuntar a una base cuyo nombre termine en _test");
  }
  return url;
}

export function createTestPrisma(): PrismaClient {
  return createPrismaClient(getTestDatabaseUrl());
}

const TABLES = ['"Appointment"', '"BookingRule"', '"BusinessHours"', '"Service"', '"Business"', '"User"'];

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}
