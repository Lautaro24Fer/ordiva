import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { requireUserId } from "@/lib/session";
import { createBusiness, listOwnedBusinesses } from "@/modules/businesses/businesses.service";
import { createBusinessSchema } from "@/schemas/businesses";

export const GET = withErrorHandling(async () => {
  const userId = await requireUserId();
  return Response.json({ businesses: await listOwnedBusinesses(getServerRepos(), userId) });
});

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId();
  const input = await parseJsonBody(request, createBusinessSchema);
  return Response.json({ business: await createBusiness(getServerRepos(), userId, input) }, { status: 201 });
});
