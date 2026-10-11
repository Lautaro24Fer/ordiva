import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

// Singleton en `globalThis` (sobrevive al hot reload de `next dev`). Se crea
// en el primer uso (no al importar): el modo demo compila y corre sin
// DATABASE_URL. Scripts y tests que necesitan otra URL deben usar
// `createPrismaClient` de `@/lib/prisma-client`.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no definida");
  globalForPrisma.prisma = createPrismaClient(connectionString);
  return globalForPrisma.prisma;
}
