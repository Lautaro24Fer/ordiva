import "@/schemas/zod-config";
import { z } from "zod";

/** Email normalizado (trim + minúsculas), igual que el CHECK de la tabla User. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .pipe(z.email({ error: "Email inválido" }));

export const PASSWORD_MIN_LENGTH = 10;

export const loginSchema = z.object({
  email: emailSchema,
  // Sin reglas de formato al iniciar sesión: solo topes para no hashear entradas enormes.
  password: z.string().min(1, "Ingresá tu contraseña").max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(150),
  email: emailSchema,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(128, "La contraseña es demasiado larga"),
});

export type LoginInput = z.output<typeof loginSchema>;
export type RegisterInput = z.output<typeof registerSchema>;
