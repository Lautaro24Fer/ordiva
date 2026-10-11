import "server-only";
import { getPrisma } from "@/lib/prisma";
import { createPrismaRepositories } from "@/lib/repositories/prisma";
import type { Repositories } from "@/modules/repositories";

let repos: Repositories | undefined;

/** Repositorios del servidor (PostgreSQL). Se crean en el primer uso. */
export function getServerRepos(): Repositories {
  repos ??= createPrismaRepositories(getPrisma());
  return repos;
}
