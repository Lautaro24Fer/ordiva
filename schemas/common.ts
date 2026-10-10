import { z } from "zod";
import { HH_MM_REGEX, isValidIanaZone } from "@/lib/time";

/** Id entero positivo en JSON. */
export const idSchema = z.number().int().positive().max(2_147_483_647);

/** Id entero positivo recibido como string (params de ruta / query). */
export const idParamSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/, "Id inválido")
  .transform(Number)
  .pipe(idSchema);

/** Fecha local "YYYY-MM-DD" que exista en el calendario. */
export const localDateSchema = z.iso.date({ error: "Fecha inválida, formato YYYY-MM-DD" });

export const hhmmSchema = z.string().regex(HH_MM_REGEX, "Hora inválida, formato HH:mm (24h)");

export const timezoneSchema = z
  .string()
  .max(100)
  .refine(isValidIanaZone, "Zona horaria IANA inválida");

export const slugSchema = z
  .string()
  .trim()
  .min(3, "El slug debe tener al menos 3 caracteres")
  .max(150)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, dígitos y guiones simples");

/** Importe decimal como string ("15000" o "15000.50"); nunca number en coma flotante. */
export const moneySchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Importe inválido: usar formato 15000 o 15000.50");

export const durationMinutesSchema = z.number().int().min(5).max(24 * 60);
