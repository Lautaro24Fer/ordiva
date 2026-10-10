import { z } from "zod";
import { durationMinutesSchema, moneySchema, optionalTextSchema } from "@/schemas/common";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: optionalTextSchema(2000),
  durationMinutes: durationMinutesSchema,
  price: moneySchema,
});

export const updateServiceSchema = createServiceSchema
  .extend({ isActive: z.boolean() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nada para actualizar");

export type CreateServiceInput = z.output<typeof createServiceSchema>;
export type UpdateServiceInput = z.output<typeof updateServiceSchema>;
