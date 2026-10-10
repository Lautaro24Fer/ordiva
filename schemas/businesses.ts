import { z } from "zod";
import { hhmmSchema, optionalTextSchema, slugSchema, timezoneSchema } from "@/schemas/common";
import { hhmmToMinutes } from "@/lib/formats";

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: slugSchema,
  description: optionalTextSchema(2000),
  timezone: timezoneSchema.default("America/Argentina/Buenos_Aires"),
});

/** El slug es estable: no se edita por este contrato. */
export const updateBusinessSchema = createBusinessSchema
  .omit({ slug: true })
  .extend({ timezone: timezoneSchema })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nada para actualizar");

export const bookingRuleSchema = z.object({
  slotIntervalMinutes: z.number().int().min(5).max(240),
  minNoticeMinutes: z.number().int().min(0).max(30 * 24 * 60),
  maxAdvanceDays: z.number().int().min(1).max(365),
});

const hoursIntervalSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: hhmmSchema,
    endTime: hhmmSchema,
  })
  .refine((h) => h.startTime < h.endTime, {
    message: "La apertura debe ser anterior al cierre (sin franjas nocturnas)",
    path: ["endTime"],
  });

/** Reemplazo completo de la agenda semanal; sin duplicados ni solapamientos por día. */
export const replaceHoursSchema = z.object({
  hours: z
    .array(hoursIntervalSchema)
    .max(50)
    .superRefine((hours, ctx) => {
      const sorted = hours
        .map((h, index) => ({ ...h, index }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (
          prev.dayOfWeek === curr.dayOfWeek &&
          hhmmToMinutes(curr.startTime) < hhmmToMinutes(prev.endTime)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Franjas solapadas o duplicadas en el mismo día",
            path: [curr.index],
          });
        }
      }
    }),
});

export type CreateBusinessInput = z.output<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.output<typeof updateBusinessSchema>;
export type BookingRuleInput = z.output<typeof bookingRuleSchema>;
export type HoursInterval = z.output<typeof hoursIntervalSchema>;
