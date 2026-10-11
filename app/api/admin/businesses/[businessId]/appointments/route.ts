import { parseSearchParams, withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { requireUserId } from "@/lib/session";
import { listAppointments } from "@/modules/appointments/appointments.service";
import { adminAppointmentsQuerySchema } from "@/schemas/availability";
import { idParamSchema } from "@/schemas/common";

type Ctx = { params: Promise<{ businessId: string }> };

/** Turnos de un día local del negocio (incluye datos de contacto: solo propietario). */
export const GET = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  const { date } = parseSearchParams(request, adminAppointmentsQuerySchema);
  return Response.json({ appointments: await listAppointments(getServerRepos(), userId, businessId, date) });
});
