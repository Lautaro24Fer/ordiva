import "server-only";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo/seed-data";
import type { AuthenticatedUser } from "@/modules/auth/auth.service";
import type { LoginInput } from "@/schemas/auth";

/**
 * Login del modo demo: solo las cuentas sembradas, con la contraseña demo
 * (que es pública). No hay base de datos ni registro.
 */
export function verifyDemoCredentials({ email, password }: LoginInput): AuthenticatedUser | null {
  if (password !== DEMO_PASSWORD) return null;
  const account = DEMO_ACCOUNTS.find((a) => a.email === email);
  return account ? { id: account.id, name: account.name, email: account.email } : null;
}
