import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { requireUserId } from "@/lib/session";
import { getHours, replaceHours } from "@/modules/businesses/businesses.service";
import { replaceHoursSchema } from "@/schemas/businesses";
import { idParamSchema } from "@/schemas/common";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  return Response.json({ hours: await getHours(userId, businessId) });
});

/** Reemplazo atómico de todas las franjas semanales del negocio. */
export const PUT = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  const { hours } = await parseJsonBody(request, replaceHoursSchema);
  return Response.json({ hours: await replaceHours(userId, businessId, hours) });
});
