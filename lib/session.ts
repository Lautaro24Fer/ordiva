import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

/**
 * Sesión del request actual. `connection()` marca la lectura como request-time:
 * Auth.js usa valores aleatorios (token CSRF) que Cache Components no permite
 * durante el prerender.
 */
export async function getSession() {
  await connection();
  return auth();
}

/** Id del administrador autenticado, o `null` si no hay sesión válida. */
export async function getSessionUserId(): Promise<number | null> {
  const session = await getSession();
  const id = Number(session?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Para Route Handlers: id del administrador o error 401. */
export async function requireUserId(): Promise<number> {
  const userId = await getSessionUserId();
  if (userId === null) throw unauthorized();
  return userId;
}

/** Para páginas del panel: id del administrador o redirección al login. */
export async function requirePageUserId(): Promise<number> {
  const userId = await getSessionUserId();
  if (userId === null) redirect("/login");
  return userId;
}
