import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

afterAll(() => prisma.$disconnect());

// Guardia: si el orden de inicialización se rompe, los tests escribirían en la BD de desarrollo.
it("el singleton de Prisma apunta a la base de test", async () => {
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  expect(db).toMatch(/_test$/);
});
