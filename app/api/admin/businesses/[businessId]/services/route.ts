import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { requireUserId } from "@/lib/session";
import { createService, listServices } from "@/modules/services/services.service";
import { idParamSchema } from "@/schemas/common";
import { createServiceSchema } from "@/schemas/services";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  return Response.json({ services: await listServices(userId, businessId) });
});

export const POST = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  const input = await parseJsonBody(request, createServiceSchema);
  return Response.json({ service: await createService(userId, businessId, input) }, { status: 201 });
});
