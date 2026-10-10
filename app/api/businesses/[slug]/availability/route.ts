import { parseSearchParams, withErrorHandling } from "@/lib/http";
import { getAvailability } from "@/modules/availability/availability.service";
import { availabilityQuerySchema } from "@/schemas/availability";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withErrorHandling(async (request: Request, { params }: Ctx) => {
  const { slug } = await params;
  const { serviceId, date } = parseSearchParams(request, availabilityQuerySchema);
  return Response.json(await getAvailability(slug, serviceId, date));
});
