import "server-only";
import { unauthorized } from "@/lib/errors";

/**
 * Id del administrador autenticado o 401.
 *
 * Fase 2: todavía no hay Auth.js, por lo que la API administrativa queda
 * cerrada (siempre 401). En Fase 4 esta función leerá la sesión JWT de
 * Auth.js; el resto del código no cambia. Los tests la reemplazan con mocks.
 */
export async function requireUserId(): Promise<number> {
  throw unauthorized();
}
