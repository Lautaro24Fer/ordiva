import { createDemoApi } from "@/lib/demo/api-router";
import { createLocalRepositories } from "@/lib/demo/local-repos";

/** Repositorios de localStorage compartidos por las páginas y la API demo. */
export const demoRepos = createLocalRepositories();

/**
 * Id del administrador según la sesión de Auth.js (cookie JWT). El endpoint
 * de sesión no necesita base de datos, así que funciona también en la demo.
 */
async function fetchSessionUserId(): Promise<number | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const session = (await res.json()) as { user?: { id?: string } } | null;
    const id = Number(session?.user?.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export const demoApi = createDemoApi({ repos: demoRepos, getUserId: fetchSessionUserId });
