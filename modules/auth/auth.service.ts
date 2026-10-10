import "server-only";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { conflict } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
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
export async function verifyCredentials({ email, password }: LoginInput): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });

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
export async function registerUser({ name, email, password }: RegisterInput): Promise<AuthenticatedUser> {
  const passwordHash = await hashPassword(password);
  try {
    return await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("EMAIL_TAKEN", "Ya existe una cuenta con ese email");
    throw error;
  }
}
