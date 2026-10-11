import { badRequest, notFound, unauthorized } from "@/lib/errors";
import { toErrorResponse } from "@/lib/http";
import { createPublicAppointment, listAppointments, updateAppointmentStatus } from "@/modules/appointments/appointments.service";
import { getAvailability } from "@/modules/availability/availability.service";
import {
  createBusiness,
  getBookingRule,
  getHours,
  getPublicBusiness,
  listOwnedBusinesses,
  replaceHours,
  requireOwnedBusiness,
  updateBookingRule,
  updateBusiness,
} from "@/modules/businesses/businesses.service";
import type { Repositories } from "@/modules/repositories";
import {
  createService,
  deactivateService,
  listPublicServices,
  listServices,
  updateService,
} from "@/modules/services/services.service";
import { createPublicAppointmentSchema, updateAppointmentStatusSchema } from "@/schemas/appointments";
import { adminAppointmentsQuerySchema, availabilityQuerySchema } from "@/schemas/availability";
import {
  bookingRuleSchema,
  createBusinessSchema,
  replaceHoursSchema,
  updateBusinessSchema,
} from "@/schemas/businesses";
import { idParamSchema } from "@/schemas/common";
import { createServiceSchema, updateServiceSchema } from "@/schemas/services";

/**
 * API simulada del modo demo: la misma secuencia que los Route Handlers de
 * `app/api` (validación Zod → servicio → JSON), pero en el navegador y contra
 * los repositorios de localStorage. Devuelve status + cuerpo con la misma
 * forma que la API real, así `apiRequest` y los componentes no cambian.
 */

export type DemoResponse = { status: number; body: unknown };

type DemoRequest = {
  params: string[];
  query: Record<string, string>;
  body: unknown;
  repos: Repositories;
  userId: () => Promise<number>;
};

type Route = { method: string; pattern: RegExp; handle: (req: DemoRequest) => Promise<DemoResponse> };

const ok = (body: unknown, status = 200): DemoResponse => ({ status, body });
const id = (value: string) => idParamSchema.parse(value);

const SEGMENT = "([^/]+)";
const PUBLIC = `^/api/businesses/${SEGMENT}`;
const ADMIN = `^/api/admin/businesses/${SEGMENT}`;
const route = (method: string, path: string, handle: Route["handle"]): Route => ({
  method,
  pattern: new RegExp(`${path}$`),
  handle,
});

const ROUTES: Route[] = [
  // Públicas
  route("GET", PUBLIC, async ({ repos, params: [slug] }) =>
    ok({ business: await getPublicBusiness(repos, slug) }),
  ),
  route("GET", `${PUBLIC}/services`, async ({ repos, params: [slug] }) =>
    ok({ services: await listPublicServices(repos, slug) }),
  ),
  route("GET", `${PUBLIC}/availability`, async ({ repos, params: [slug], query }) => {
    const { serviceId, date } = availabilityQuerySchema.parse(query);
    return ok(await getAvailability(repos, slug, serviceId, date));
  }),
  route("POST", `${PUBLIC}/appointments`, async ({ repos, params: [slug], body }) => {
    const input = createPublicAppointmentSchema.parse(body);
    if (input.website) throw badRequest("Solicitud inválida");
    return ok({ appointment: await createPublicAppointment(repos, slug, input) }, 201);
  }),

  // Administración
  route("GET", "^/api/admin/businesses", async ({ repos, userId }) =>
    ok({ businesses: await listOwnedBusinesses(repos, await userId()) }),
  ),
  route("POST", "^/api/admin/businesses", async ({ repos, userId, body }) => {
    const uid = await userId();
    return ok({ business: await createBusiness(repos, uid, createBusinessSchema.parse(body)) }, 201);
  }),
  route("GET", ADMIN, async ({ repos, userId, params: [businessId] }) => {
    const uid = await userId();
    return ok({ business: await requireOwnedBusiness(repos, uid, id(businessId)) });
  }),
  route("PATCH", ADMIN, async ({ repos, userId, params: [businessId], body }) => {
    const uid = await userId();
    const bid = id(businessId);
    return ok({ business: await updateBusiness(repos, uid, bid, updateBusinessSchema.parse(body)) });
  }),
  route("GET", `${ADMIN}/hours`, async ({ repos, userId, params: [businessId] }) => {
    const uid = await userId();
    return ok({ hours: await getHours(repos, uid, id(businessId)) });
  }),
  route("PUT", `${ADMIN}/hours`, async ({ repos, userId, params: [businessId], body }) => {
    const uid = await userId();
    const bid = id(businessId);
    const { hours } = replaceHoursSchema.parse(body);
    return ok({ hours: await replaceHours(repos, uid, bid, hours) });
  }),
  route("GET", `${ADMIN}/booking-rule`, async ({ repos, userId, params: [businessId] }) => {
    const uid = await userId();
    return ok({ bookingRule: await getBookingRule(repos, uid, id(businessId)) });
  }),
  route("PUT", `${ADMIN}/booking-rule`, async ({ repos, userId, params: [businessId], body }) => {
    const uid = await userId();
    const bid = id(businessId);
    return ok({ bookingRule: await updateBookingRule(repos, uid, bid, bookingRuleSchema.parse(body)) });
  }),
  route("GET", `${ADMIN}/appointments`, async ({ repos, userId, params: [businessId], query }) => {
    const uid = await userId();
    const bid = id(businessId);
    const { date } = adminAppointmentsQuerySchema.parse(query);
    return ok({ appointments: await listAppointments(repos, uid, bid, date) });
  }),
  route("PATCH", `${ADMIN}/appointments/${SEGMENT}`, async ({ repos, userId, params, body }) => {
    const uid = await userId();
    const { status } = updateAppointmentStatusSchema.parse(body);
    const [businessId, appointmentId] = params;
    return ok({ appointment: await updateAppointmentStatus(repos, uid, id(businessId), id(appointmentId), status) });
  }),
  route("GET", `${ADMIN}/services`, async ({ repos, userId, params: [businessId] }) => {
    const uid = await userId();
    return ok({ services: await listServices(repos, uid, id(businessId)) });
  }),
  route("POST", `${ADMIN}/services`, async ({ repos, userId, params: [businessId], body }) => {
    const uid = await userId();
    const bid = id(businessId);
    return ok({ service: await createService(repos, uid, bid, createServiceSchema.parse(body)) }, 201);
  }),
  route("PATCH", `${ADMIN}/services/${SEGMENT}`, async ({ repos, userId, params, body }) => {
    const uid = await userId();
    const [businessId, serviceId] = params;
    const input = updateServiceSchema.parse(body);
    return ok({ service: await updateService(repos, uid, id(businessId), id(serviceId), input) });
  }),
  route("DELETE", `${ADMIN}/services/${SEGMENT}`, async ({ repos, userId, params }) => {
    const uid = await userId();
    const [businessId, serviceId] = params;
    return ok({ service: await deactivateService(repos, uid, id(businessId), id(serviceId)) });
  }),
];

export type DemoApiOptions = {
  repos: Repositories;
  /** Id del administrador con sesión, o `null` (→ 401 en rutas de administración). */
  getUserId: () => Promise<number | null>;
};

export function createDemoApi({ repos, getUserId }: DemoApiOptions) {
  const userId = async () => {
    const uid = await getUserId();
    if (uid === null) throw unauthorized();
    return uid;
  };

  return async function demoApi(url: string, method: string, body?: unknown): Promise<DemoResponse> {
    const { pathname, searchParams } = new URL(url, "http://demo.local");

    for (const r of ROUTES) {
      if (r.method !== method) continue;
      const match = r.pattern.exec(pathname);
      if (!match) continue;

      try {
        const params = match.slice(1).map((segment) => decodeURIComponent(segment));
        return await r.handle({ params, query: Object.fromEntries(searchParams), body, repos, userId });
      } catch (error) {
        return toErrorResponse(error);
      }
    }
    return toErrorResponse(notFound("Ruta no encontrada"));
  };
}
