import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { requireUserId } from "@/lib/session";
import { deactivateService, updateService } from "@/modules/services/services.service";
import { idParamSchema } from "@/schemas/common";
import { updateServiceSchema } from "@/schemas/services";

type Ctx = { params: Promise<{ businessId: string; serviceId: string }> };

async function parseIds(params: Ctx["params"]) {
  const { businessId, serviceId } = await params;
  return { businessId: idParamSchema.parse(businessId), serviceId: idParamSchema.parse(serviceId) };
}

export const PATCH = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { businessId, serviceId } = await parseIds(params);
  const input = await parseJsonBody(request, updateServiceSchema);
  return Response.json({ service: await updateService(getServerRepos(), userId, businessId, serviceId, input) });
});

/** Desactivación lógica: nunca borra físicamente (preserva reservas históricas). */
export const DELETE = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { businessId, serviceId } = await parseIds(params);
  return Response.json({ service: await deactivateService(getServerRepos(), userId, businessId, serviceId) });
});
