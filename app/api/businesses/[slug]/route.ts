import { withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { getPublicBusiness } from "@/modules/businesses/businesses.service";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const { slug } = await params;
  return Response.json({ business: await getPublicBusiness(getServerRepos(), slug) });
});
