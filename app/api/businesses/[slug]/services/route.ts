import { withErrorHandling } from "@/lib/http";
import { getServerRepos } from "@/lib/repositories/server";
import { listPublicServices } from "@/modules/services/services.service";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withErrorHandling(async (_request: Request, { params }: Ctx) => {
  const { slug } = await params;
  return Response.json({ services: await listPublicServices(getServerRepos(), slug) });
});
