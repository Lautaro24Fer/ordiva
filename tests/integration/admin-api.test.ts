/**
 * API administrativa con PostgreSQL real. La sesión (Auth.js, Fase 4) se
 * simula mockeando `requireUserId`; todo lo demás es el código real.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireUserId } from "@/lib/session";
import { unauthorized } from "@/lib/errors";
import { GET as listBusinesses, POST as createBusiness } from "@/app/api/admin/businesses/route";
import { GET as getBusiness, PATCH as patchBusiness } from "@/app/api/admin/businesses/[businessId]/route";
import { GET as listServices, POST as createService } from "@/app/api/admin/businesses/[businessId]/services/route";
import {
  DELETE as deleteService,
  PATCH as patchService,
} from "@/app/api/admin/businesses/[businessId]/services/[serviceId]/route";
import { GET as getHours, PUT as putHours } from "@/app/api/admin/businesses/[businessId]/hours/route";
import { PUT as putBookingRule } from "@/app/api/admin/businesses/[businessId]/booking-rule/route";
import { GET as listAppointments } from "@/app/api/admin/businesses/[businessId]/appointments/route";
import { PATCH as patchAppointment } from "@/app/api/admin/businesses/[businessId]/appointments/[appointmentId]/route";
import { GET as getAvailability } from "@/app/api/businesses/[slug]/availability/route";
import { GET as getPublicServices } from "@/app/api/businesses/[slug]/services/route";
import { createTestPrisma, resetDatabase } from "./test-db";
import { DAY, NOW, createTenant, ctx, jsonRequest, localAt, type Tenant } from "./fixtures";

vi.mock("@/lib/session", () => ({ requireUserId: vi.fn() }));

const prisma = createTestPrisma();
let a: Tenant;
let b: Tenant;

const actAs = (tenant: Tenant) => vi.mocked(requireUserId).mockResolvedValue(tenant.owner.id);

async function createAppointment(tenant: Tenant, time: string, status: "CONFIRMED" | "CANCELLED" | "COMPLETED" = "CONFIRMED") {
  const startAt = localAt(time);
  return prisma.appointment.create({
    data: {
      businessId: tenant.business.id,
      serviceId: tenant.short.id,
      customerName: "Cliente Privado",
      customerContact: "privado@example.com",
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60_000),
      status,
      serviceDurationMinutes: 30,
      servicePrice: "12000.00",
    },
  });
}

function patchStatus(businessId: number, appointmentId: number, status: string) {
  return patchAppointment(
    jsonRequest(`/api/admin/businesses/${businessId}/appointments/${appointmentId}`, "PATCH", { status }),
    ctx({ businessId: String(businessId), appointmentId: String(appointmentId) }),
  );
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await resetDatabase(prisma);
  a = await createTenant(prisma, "negocio-a");
  b = await createTenant(prisma, "negocio-b");
  actAs(a);
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(requireUserId).mockReset();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("autenticación", () => {
  it("sin sesión responde 401 y no ejecuta nada", async () => {
    vi.mocked(requireUserId).mockRejectedValue(unauthorized());
    const res = await listBusinesses();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });
});

describe("negocios", () => {
  it("lista solo los negocios del usuario", async () => {
    const { businesses } = await (await listBusinesses()).json();
    expect(businesses.map((x: { slug: string }) => x.slug)).toEqual(["negocio-a"]);
  });

  it("crea negocio + BookingRule por defecto en la misma operación", async () => {
    const res = await createBusiness(
      jsonRequest("/api/admin/businesses", "POST", { name: "Nuevo Spa", slug: "nuevo-spa" }),
    );
    expect(res.status).toBe(201);
    const { business } = await res.json();
    expect(business).toMatchObject({ slug: "nuevo-spa", timezone: "America/Argentina/Buenos_Aires" });
    const stored = await prisma.business.findUniqueOrThrow({
      where: { id: business.id },
      include: { bookingRule: true },
    });
    expect(stored.ownerId).toBe(a.owner.id);
    expect(stored.bookingRule).toMatchObject({ slotIntervalMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 30 });
  });

  it("409 si el slug ya existe (aunque sea de otro usuario)", async () => {
    const res = await createBusiness(
      jsonRequest("/api/admin/businesses", "POST", { name: "Copia", slug: "negocio-b" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("SLUG_TAKEN");
  });

  it("400 para slug o zona horaria inválidos", async () => {
    for (const body of [
      { name: "X Y", slug: "Con Espacios" },
      { name: "X Y", slug: "valido", timezone: "Mars/Base" },
    ]) {
      expect((await createBusiness(jsonRequest("/api/admin/businesses", "POST", body))).status).toBe(400);
    }
  });

  it("ignora un ownerId enviado por el navegador", async () => {
    const res = await createBusiness(
      jsonRequest("/api/admin/businesses", "POST", { name: "Truco", slug: "truco", ownerId: b.owner.id }),
    );
    const { business } = await res.json();
    const stored = await prisma.business.findUniqueOrThrow({ where: { id: business.id } });
    expect(stored.ownerId).toBe(a.owner.id);
  });
});

describe("aislamiento entre propietarios (criterio 14)", () => {
  it("B no puede leer, listar ni editar el negocio de A: 404 sin revelar existencia", async () => {
    actAs(b);
    const id = String(a.business.id);
    const responses = await Promise.all([
      getBusiness(jsonRequest(`/api/admin/businesses/${id}`, "GET"), ctx({ businessId: id })),
      patchBusiness(jsonRequest(`/api/admin/businesses/${id}`, "PATCH", { name: "Hackeado" }), ctx({ businessId: id })),
      listServices(jsonRequest(`/api/admin/businesses/${id}/services`, "GET"), ctx({ businessId: id })),
      listAppointments(jsonRequest(`/api/admin/businesses/${id}/appointments?date=${DAY}`, "GET"), ctx({ businessId: id })),
      getHours(jsonRequest(`/api/admin/businesses/${id}/hours`, "GET"), ctx({ businessId: id })),
    ]);
    const nonexistent = await getBusiness(jsonRequest("/api/admin/businesses/999999", "GET"), ctx({ businessId: "999999" }));

    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual(await nonexistent.clone().json());
    }
    expect((await prisma.business.findUniqueOrThrow({ where: { id: a.business.id } })).name).toBe("Negocio negocio-a");
  });

  it("B no puede cancelar un turno de A, ni usando su propio businessId", async () => {
    const appointment = await createAppointment(a, "10:00");
    actAs(b);

    expect((await patchStatus(a.business.id, appointment.id, "CANCELLED")).status).toBe(404);
    expect((await patchStatus(b.business.id, appointment.id, "CANCELLED")).status).toBe(404);

    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(stored.status).toBe("CONFIRMED");
  });

  it("B no puede editar, desactivar ni crear servicios en A", async () => {
    actAs(b);
    const aId = String(a.business.id);
    const sId = String(a.short.id);

    const patched = await patchService(
      jsonRequest(`/api/admin/businesses/${aId}/services/${sId}`, "PATCH", { price: "1.00" }),
      ctx({ businessId: aId, serviceId: sId }),
    );
    // Servicio de A pedido bajo el negocio de B: tampoco.
    const crossed = await patchService(
      jsonRequest(`/api/admin/businesses/${b.business.id}/services/${sId}`, "PATCH", { price: "1.00" }),
      ctx({ businessId: String(b.business.id), serviceId: sId }),
    );
    const deleted = await deleteService(
      jsonRequest(`/api/admin/businesses/${aId}/services/${sId}`, "DELETE"),
      ctx({ businessId: aId, serviceId: sId }),
    );
    const created = await createService(
      jsonRequest(`/api/admin/businesses/${aId}/services`, "POST", { name: "Intruso", durationMinutes: 30, price: "1" }),
      ctx({ businessId: aId }),
    );

    expect([patched.status, crossed.status, deleted.status, created.status]).toEqual([404, 404, 404, 404]);
    const service = await prisma.service.findUniqueOrThrow({ where: { id: a.short.id } });
    expect(service.price.toFixed(2)).toBe("12000.00");
    expect(service.isActive).toBe(true);
    expect(await prisma.service.count({ where: { businessId: a.business.id } })).toBe(2);
  });

  it("B no puede reemplazar los horarios de A", async () => {
    actAs(b);
    const id = String(a.business.id);
    const res = await putHours(jsonRequest(`/api/admin/businesses/${id}/hours`, "PUT", { hours: [] }), ctx({ businessId: id }));
    expect(res.status).toBe(404);
    expect(await prisma.businessHours.count({ where: { businessId: a.business.id } })).toBe(14);
  });

  it("el listado de turnos de A no incluye turnos de B", async () => {
    await createAppointment(a, "10:00");
    await createAppointment(b, "11:00");
    const id = String(a.business.id);
    const { appointments } = await (
      await listAppointments(jsonRequest(`/api/admin/businesses/${id}/appointments?date=${DAY}`, "GET"), ctx({ businessId: id }))
    ).json();
    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({
      startAt: "2030-01-08T13:00:00.000Z",
      customerName: "Cliente Privado",
      customerContact: "privado@example.com",
      servicePrice: "12000.00",
      service: { id: a.short.id, name: "Corte" },
    });
  });
});

describe("estados de turnos", () => {
  it("CONFIRMED → CANCELLED libera el slot en la disponibilidad pública", async () => {
    const appointment = await createAppointment(a, "10:00");
    const slots = async () => {
      const res = await getAvailability(
        jsonRequest(`/api/businesses/negocio-a/availability?serviceId=${a.short.id}&date=${DAY}`, "GET"),
        ctx({ slug: "negocio-a" }),
      );
      return ((await res.json()).slots as { label: string }[]).map((s) => s.label);
    };

    expect(await slots()).not.toContain("10:00");
    const res = await patchStatus(a.business.id, appointment.id, "CANCELLED");
    expect(res.status).toBe(200);
    expect((await res.json()).appointment.status).toBe("CANCELLED");
    expect(await slots()).toContain("10:00");
    // Cancelar no borra: el registro sigue existiendo.
    expect(await prisma.appointment.count()).toBe(1);
  });

  it("CONFIRMED → COMPLETED es válido", async () => {
    const appointment = await createAppointment(a, "10:00");
    expect((await patchStatus(a.business.id, appointment.id, "COMPLETED")).status).toBe(200);
  });

  it.each(["CANCELLED", "COMPLETED"] as const)("un turno %s no puede cambiar de estado (409)", async (from) => {
    const appointment = await createAppointment(a, "10:00", from);
    const res = await patchStatus(a.business.id, appointment.id, from === "CANCELLED" ? "COMPLETED" : "CANCELLED");
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("400 si se intenta volver a CONFIRMED", async () => {
    const appointment = await createAppointment(a, "10:00", "CANCELLED");
    expect((await patchStatus(a.business.id, appointment.id, "CONFIRMED")).status).toBe(400);
  });
});

describe("servicios", () => {
  it("crea un servicio con precio decimal exacto", async () => {
    const id = String(a.business.id);
    const res = await createService(
      jsonRequest(`/api/admin/businesses/${id}/services`, "POST", { name: "Barba", durationMinutes: 20, price: "7500.5" }),
      ctx({ businessId: id }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).service).toMatchObject({ name: "Barba", price: "7500.50", isActive: true });
  });

  it("400 si el precio llega como number", async () => {
    const id = String(a.business.id);
    const res = await createService(
      jsonRequest(`/api/admin/businesses/${id}/services`, "POST", { name: "Barba", durationMinutes: 20, price: 7500.5 }),
      ctx({ businessId: id }),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE desactiva (no borra) y el servicio desaparece de la oferta pública", async () => {
    await createAppointment(a, "10:00");
    const id = String(a.business.id);
    const sId = String(a.short.id);
    const res = await deleteService(jsonRequest(`/api/admin/businesses/${id}/services/${sId}`, "DELETE"), ctx({ businessId: id, serviceId: sId }));
    expect(res.status).toBe(200);
    expect((await res.json()).service.isActive).toBe(false);

    expect(await prisma.service.findUnique({ where: { id: a.short.id } })).not.toBeNull();
    const { services } = await (
      await getPublicServices(jsonRequest("/api/businesses/negocio-a/services", "GET"), ctx({ slug: "negocio-a" }))
    ).json();
    expect(services.map((s: { id: number }) => s.id)).toEqual([a.long.id]);
  });
});

describe("horarios y reglas", () => {
  it("PUT reemplaza atómicamente todas las franjas", async () => {
    const id = String(a.business.id);
    const hours = [
      { dayOfWeek: 2, startTime: "15:00", endTime: "18:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" },
    ];
    const res = await putHours(jsonRequest(`/api/admin/businesses/${id}/hours`, "PUT", { hours }), ctx({ businessId: id }));
    expect(res.status).toBe(200);
    expect((await res.json()).hours).toEqual([hours[1], hours[0]]);
    expect(await prisma.businessHours.count({ where: { businessId: a.business.id } })).toBe(2);
  });

  it("400 con franjas solapadas, sin modificar las existentes", async () => {
    const id = String(a.business.id);
    const hours = [
      { dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
      { dayOfWeek: 1, startTime: "12:00", endTime: "15:00" },
    ];
    const res = await putHours(jsonRequest(`/api/admin/businesses/${id}/hours`, "PUT", { hours }), ctx({ businessId: id }));
    expect(res.status).toBe(400);
    expect(await prisma.businessHours.count({ where: { businessId: a.business.id } })).toBe(14);
  });

  it("dos reemplazos concurrentes no se mezclan: queda exactamente uno", async () => {
    const id = String(a.business.id);
    const first = [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }];
    const second = [
      { dayOfWeek: 3, startTime: "14:00", endTime: "15:00" },
      { dayOfWeek: 4, startTime: "14:00", endTime: "15:00" },
    ];
    const results = await Promise.all([
      putHours(jsonRequest(`/api/admin/businesses/${id}/hours`, "PUT", { hours: first }), ctx({ businessId: id })),
      putHours(jsonRequest(`/api/admin/businesses/${id}/hours`, "PUT", { hours: second }), ctx({ businessId: id })),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const stored = await prisma.businessHours.findMany({
      where: { businessId: a.business.id },
      select: { dayOfWeek: true, startTime: true, endTime: true },
      orderBy: { dayOfWeek: "asc" },
    });
    expect([first, second]).toContainEqual(stored);
  });

  it("PUT booking-rule actualiza la grilla de disponibilidad", async () => {
    const id = String(a.business.id);
    const res = await putBookingRule(
      jsonRequest(`/api/admin/businesses/${id}/booking-rule`, "PUT", { slotIntervalMinutes: 60, minNoticeMinutes: 0, maxAdvanceDays: 7 }),
      ctx({ businessId: id }),
    );
    expect(res.status).toBe(200);
    const availability = await getAvailability(
      jsonRequest(`/api/businesses/negocio-a/availability?serviceId=${a.short.id}&date=${DAY}`, "GET"),
      ctx({ slug: "negocio-a" }),
    );
    const labels = ((await availability.json()).slots as { label: string }[]).map((s) => s.label);
    expect(labels).toEqual(["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"]);
  });
});
