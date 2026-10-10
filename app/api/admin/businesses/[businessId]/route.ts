import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { requireUserId } from "@/lib/session";
import { requireOwnedBusiness, updateBusiness } from "@/modules/businesses/businesses.service";
import { updateBusinessSchema } from "@/schemas/businesses";
import { idParamSchema } from "@/schemas/common";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  return Response.json({ business: await requireOwnedBusiness(userId, businessId) });
});

export const PATCH = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  const input = await parseJsonBody(request, updateBusinessSchema);
  return Response.json({ business: await updateBusiness(userId, businessId, input) });
});
