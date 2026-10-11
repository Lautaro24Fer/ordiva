"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { registerRateLimiter } from "@/lib/rate-limit";
import { getServerRepos } from "@/lib/repositories/server";
import { safeInternalPath } from "@/lib/safe-redirect";
import { registerUser } from "@/modules/auth/auth.service";
import { loginSchema, registerSchema } from "@/schemas/auth";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string[]>>;
  /** Valores para rellenar el formulario tras un error (nunca la contraseña). */
  values?: { name?: string; email?: string };
};

const INVALID_CREDENTIALS = "Email o contraseña incorrectos.";

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: INVALID_CREDENTIALS, values: { email } };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeInternalPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    // Mismo mensaje para email inexistente, contraseña incorrecta o límite de intentos.
    if (error instanceof AuthError) return { error: INVALID_CREDENTIALS, values: { email } };
    throw error; // La redirección de éxito se propaga como excepción de Next.
  }
  return {};
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = registerSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  if (!(await registerRateLimiter.consume(getClientIp(await headers())))) {
    return { error: "Demasiados registros desde esta conexión. Probá más tarde.", values };
  }

  try {
    await registerUser(getServerRepos(), parsed.data);
  } catch (error) {
    if (error instanceof AppError && error.code === "EMAIL_TAKEN") {
      return { fieldErrors: { email: [error.message] }, values };
    }
    throw error;
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
  return {};
}

/** Cierra la sesión. Un form puede indicar a dónde volver con un campo `redirectTo` (solo rutas internas). */
export async function logoutAction(formData?: FormData): Promise<void> {
  await signOut({ redirectTo: safeInternalPath(formData?.get("redirectTo"), "/") });
}
