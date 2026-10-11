import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { requireUserId } from "@/lib/session";
import { createService, listServices } from "@/modules/services/services.service";
import { idParamSchema } from "@/schemas/common";
import { createServiceSchema } from "@/schemas/services";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  return Response.json({ services: await listServices(getServerRepos(), userId, businessId) });
});

export const POST = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  const input = await parseJsonBody(request, createServiceSchema);
  return Response.json({ service: await createService(getServerRepos(), userId, businessId, input) }, { status: 201 });
});
