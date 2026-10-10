import { badRequest, tooManyRequests } from "@/lib/errors";
import { getClientIp, parseJsonBody, withErrorHandling } from "@/lib/http";
import { publicBookingRateLimiter } from "@/lib/rate-limit";
import { createPublicAppointment } from "@/modules/appointments/appointments.service";
import { createPublicAppointmentSchema } from "@/schemas/appointments";

type Ctx = { params: Promise<{ slug: string }> };

export const POST = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const { slug } = await params;

  if (!(await publicBookingRateLimiter.consume(`${getClientIp(request)}:${slug}`))) {
    throw tooManyRequests();
  }

  const input = await parseJsonBody(request, createPublicAppointmentSchema);
  // Honeypot: un bot que completa todos los campos recibe un error genérico.
  if (input.website) throw badRequest("Solicitud inválida");

  const appointment = await createPublicAppointment(slug, input);
  return Response.json({ appointment }, { status: 201 });
});
