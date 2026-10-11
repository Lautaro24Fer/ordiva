import "server-only";
import { conflict } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ConstraintViolation, type Repositories } from "@/modules/repositories";
import type { LoginInput, RegisterInput } from "@/schemas/auth";

export type AuthenticatedUser = { id: number; name: string; email: string };

// Hash de una contraseña aleatoria, calculado una vez: se verifica contra él
// cuando el email no existe, para que la respuesta tarde lo mismo y no revele
// qué cuentas están registradas.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
}

/** Devuelve el usuario si email y contraseña son correctos; si no, `null` (sin distinguir el motivo). */
export async function verifyCredentials(
  repos: Repositories,
  { email, password }: LoginInput,
): Promise<AuthenticatedUser | null> {
  const user = await repos.users.findByEmail(email);

  if (!user?.passwordHash) {
    await verifyPassword(await getDummyHash(), password);
    return null;
  }
  if (!(await verifyPassword(user.passwordHash, password))) return null;
  return { id: user.id, name: user.name, email: user.email };
}

/**
 * Alta de administrador. Sin verificación de email: válido solo para la demo
 * (no apto para producción).
 */
export async function registerUser(
  repos: Repositories,
  { name, email, password }: RegisterInput,
): Promise<AuthenticatedUser> {
  const passwordHash = await hashPassword(password);
  try {
    return await repos.users.create({ name, email, passwordHash });
  } catch (error) {
    if (error instanceof ConstraintViolation) throw conflict("EMAIL_TAKEN", "Ya existe una cuenta con ese email");
    throw error;
  }
}
