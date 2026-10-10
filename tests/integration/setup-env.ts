import { getTestDatabaseUrl } from "./test-db";

// El singleton de lib/prisma lee DATABASE_URL al importarse: los Route
// Handlers y módulos bajo test deben usar la base de test. Este archivo no
// debe importar (ni transitivamente) `@/lib/prisma`.
process.env.DATABASE_URL = getTestDatabaseUrl();
