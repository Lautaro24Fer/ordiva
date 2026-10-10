import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no definida");
  return connectionString;
}

// Singleton para evitar múltiples pools con el hot reload de `next dev`.
// Se crea al importar este módulo: scripts y tests que necesitan otra URL
// deben usar `createPrismaClient` de `@/lib/prisma-client`.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient(getConnectionString());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
