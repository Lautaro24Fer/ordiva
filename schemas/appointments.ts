import { z } from "zod";
import { idSchema } from "@/schemas/common";

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const CONTACT_FORMAT_MESSAGE =
  "Ingresá un email válido o un teléfono en formato internacional, por ejemplo +5491123456789";

/**
 * Email (normalizado a minúsculas) o teléfono E.164. Del teléfono solo se
 * quitan espacios y guiones; nunca se adivina el prefijo de país ni se
 * convierte a número.
 */
export const customerContactSchema = z
  .string()
  .trim()
  .min(1, CONTACT_FORMAT_MESSAGE)
  .max(255)
  .transform((value, ctx) => {
    if (value.includes("@")) {
      const email = value.toLowerCase();
      if (z.email().safeParse(email).success) return email;
    } else {
      const phone = value.replace(/[\s-]/g, "");
      if (E164_REGEX.test(phone)) return phone;
    }
    ctx.addIssue({ code: "custom", message: CONTACT_FORMAT_MESSAGE });
    return z.NEVER;
  });

export const createPublicAppointmentSchema = z.object({
  serviceId: idSchema,
  startAt: z.iso.datetime({ offset: true, error: "startAt debe ser ISO-8601 con zona (Z u offset)" }),
  customerName: z.string().trim().min(2, "Nombre demasiado corto").max(150),
  customerContact: customerContactSchema,
  /** Honeypot antispam: campo oculto para humanos; el handler rechaza si llega con contenido. */
  website: z.string().max(500).optional(),
});

export type CreatePublicAppointmentInput = z.output<typeof createPublicAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["CANCELLED", "COMPLETED"]),
});
