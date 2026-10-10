import { z } from "zod";
import { idParamSchema, localDateSchema } from "@/schemas/common";

export const availabilityQuerySchema = z.object({
  serviceId: idParamSchema,
  date: localDateSchema,
});

export const adminAppointmentsQuerySchema = z.object({
  date: localDateSchema,
});
