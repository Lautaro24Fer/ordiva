import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { requireUserId } from "@/lib/session";
import { getBookingRule, updateBookingRule } from "@/modules/businesses/businesses.service";
import { bookingRuleSchema } from "@/schemas/businesses";
import { idParamSchema } from "@/schemas/common";

type Ctx = { params: Promise<{ businessId: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  return Response.json({ bookingRule: await getBookingRule(getServerRepos(), userId, businessId) });
});

export const PUT = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const businessId = idParamSchema.parse((await params).businessId);
  const input = await parseJsonBody(request, bookingRuleSchema);
  return Response.json({ bookingRule: await updateBookingRule(getServerRepos(), userId, businessId, input) });
});
