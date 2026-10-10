import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { getTestDatabaseUrl } from "./test-db";

/**
 * Parte de una BD vacía y aplica las migraciones versionadas con
 * `prisma migrate deploy`, igual que en un despliegue real.
 */
export default async function setup(): Promise<void> {
  const url = getTestDatabaseUrl();

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: url },
    stdio: "pipe",
  });
}
