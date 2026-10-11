import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // La CLI usa la URL directa (sin pooler); el runtime usa DATABASE_URL vía adapter.
  // Opcional: `prisma generate` no la necesita, y el build de la demo (sin base
  // de datos) corre sin ella. Migrar o sembrar sin DIRECT_URL falla con un error claro.
  datasource: { url: process.env.DIRECT_URL },
});
