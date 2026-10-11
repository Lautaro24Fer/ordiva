import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { requireUserId } from "@/lib/session";
import { updateAppointmentStatus } from "@/modules/appointments/appointments.service";
import { updateAppointmentStatusSchema } from "@/schemas/appointments";
import { idParamSchema } from "@/schemas/common";

type Ctx = { params: Promise<{ businessId: string; appointmentId: string }> };

/** Transición de estado: CONFIRMED → CANCELLED | COMPLETED. */
export const PATCH = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { businessId, appointmentId } = await params;
  const { status } = await parseJsonBody(request, updateAppointmentStatusSchema);
  const appointment = await updateAppointmentStatus(
    getServerRepos(),
    userId,
    idParamSchema.parse(businessId),
    idParamSchema.parse(appointmentId),
    status,
  );
  return Response.json({ appointment });
});
