/**
 * API pública probada de punta a punta: Route Handler real → módulos →
 * PostgreSQL real. Solo se falsea el reloj (Date) para que sea determinista.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getBusiness } from "@/app/api/businesses/[slug]/route";
import { GET as getServices } from "@/app/api/businesses/[slug]/services/route";
import { GET as getAvailability } from "@/app/api/businesses/[slug]/availability/route";
import { POST as postAppointment } from "@/app/api/businesses/[slug]/appointments/route";
import { publicBookingRateLimiter } from "@/lib/rate-limit";
import { createTestPrisma, resetDatabase } from "./test-db";
import { DAY, NOW, createTenant, ctx, jsonRequest, localAt, type Tenant } from "./fixtures";

const prisma = createTestPrisma();
let a: Tenant;
let b: Tenant;

const slugA = "negocio-a";
const slugB = "negocio-b";

function book(slug: string, body: Record<string, unknown>, ip = "203.0.113.1") {
  return postAppointment(
    jsonRequest(`/api/businesses/${slug}/appointments`, "POST", body, { "x-forwarded-for": ip }),
    ctx({ slug }),
  );
}

function bookingBody(tenant: Tenant, time: string, overrides: Record<string, unknown> = {}) {
  return {
    serviceId: tenant.short.id,
    startAt: localAt(time).toISOString(),
    customerName: "Cliente Ejemplo",
    customerContact: "+5491123456789",
    ...overrides,
  };
}

async function availableLabels(slug: string, serviceId: number, date = DAY) {
  const res = await getAvailability(
    jsonRequest(`/api/businesses/${slug}/availability?serviceId=${serviceId}&date=${date}`, "GET"),
    ctx({ slug }),
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  return (body.slots as { label: string }[]).map((s) => s.label);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  publicBookingRateLimiter.reset();
  await resetDatabase(prisma);
  a = await createTenant(prisma, slugA);
  b = await createTenant(prisma, slugB);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/businesses/[slug]", () => {
  it("devuelve solo datos públicos del negocio", async () => {
    const res = await getBusiness(jsonRequest(`/api/businesses/${slugA}`, "GET"), ctx({ slug: slugA }));
    expect(res.status).toBe(200);
    const { business } = await res.json();
    expect(business).toEqual({
      name: "Negocio negocio-a",
      slug: slugA,
      description: null,
      timezone: "America/Argentina/Buenos_Aires",
    });
  });

  it("404 con formato de error consistente para un slug inexistente", async () => {
    const res = await getBusiness(jsonRequest("/api/businesses/no-existe", "GET"), ctx({ slug: "no-existe" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Negocio no encontrado" } });
  });
});

describe("GET /api/businesses/[slug]/services", () => {
  it("lista solo servicios activos, con precio como string decimal", async () => {
    await prisma.service.update({ where: { id: a.long.id }, data: { isActive: false } });
    const res = await getServices(jsonRequest(`/api/businesses/${slugA}/services`, "GET"), ctx({ slug: slugA }));
    const { services } = await res.json();
    expect(services).toEqual([
      { id: a.short.id, name: "Corte", description: null, durationMinutes: 30, price: "12000.00" },
    ]);
  });
});

describe("GET /api/businesses/[slug]/availability", () => {
  it("devuelve instantes UTC con etiqueta local y sin datos de reservas", async () => {
    const res = await getAvailability(
      jsonRequest(`/api/businesses/${slugA}/availability?serviceId=${a.short.id}&date=${DAY}`, "GET"),
      ctx({ slug: slugA }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ date: DAY, timezone: "America/Argentina/Buenos_Aires", serviceId: a.short.id });
    expect(body.slots[0]).toEqual({
      startAt: "2030-01-08T12:00:00.000Z",
      endAt: "2030-01-08T12:30:00.000Z",
      label: "09:00",
    });
    // 8 slots por la mañana + 8 por la tarde.
    expect(body.slots).toHaveLength(16);
  });

  it("una reserva en A no ocupa el mismo horario en B (criterio 1)", async () => {
    expect((await book(slugA, bookingBody(a, "10:00"))).status).toBe(201);
    expect(await availableLabels(slugA, a.short.id)).not.toContain("10:00");
    expect(await availableLabels(slugB, b.short.id)).toContain("10:00");
  });

  it("una reserva de un servicio bloquea a los demás servicios del negocio (criterio 2)", async () => {
    expect((await book(slugA, bookingBody(a, "10:00"))).status).toBe(201);
    const labels = await availableLabels(slugA, a.long.id);
    expect(labels).not.toContain("09:30"); // 09:30–10:30 pisaría 10:00–10:30
    expect(labels).not.toContain("10:00");
    expect(labels).toContain("09:00"); // 09:00–10:00 es adyacente
    expect(labels).toContain("10:30");
  });

  it("CANCELLED libera disponibilidad y COMPLETED la sigue bloqueando (criterio 12)", async () => {
    const first = await (await book(slugA, bookingBody(a, "10:00"))).json();
    const second = await (await book(slugA, bookingBody(a, "11:00"))).json();
    await prisma.appointment.update({ where: { id: first.appointment.id }, data: { status: "CANCELLED" } });
    await prisma.appointment.update({ where: { id: second.appointment.id }, data: { status: "COMPLETED" } });

    const labels = await availableLabels(slugA, a.short.id);
    expect(labels).toContain("10:00");
    expect(labels).not.toContain("11:00");
  });

  it("aplica el aviso mínimo el mismo día (now 09:00 → primer slot 10:00)", async () => {
    expect((await availableLabels(slugA, a.short.id, "2030-01-07"))[0]).toBe("10:00");
  });

  it("un día cerrado dentro del horizonte devuelve slots vacíos", async () => {
    await prisma.businessHours.deleteMany({ where: { businessId: a.business.id, dayOfWeek: 2 } });
    expect(await availableLabels(slugA, a.short.id)).toEqual([]);
  });

  it.each([
    ["fecha pasada", "2030-01-06"],
    ["fuera del horizonte", "2030-02-06"],
  ])("422 para %s", async (_label, date) => {
    const res = await getAvailability(
      jsonRequest(`/api/businesses/${slugA}/availability?serviceId=${a.short.id}&date=${date}`, "GET"),
      ctx({ slug: slugA }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("OUTSIDE_BOOKING_WINDOW");
  });

  it("el último día del horizonte es válido", async () => {
    expect((await availableLabels(slugA, a.short.id, "2030-02-05")).length).toBeGreaterThan(0);
  });

  it.each([
    ["sin serviceId", `date=${DAY}`],
    ["fecha inexistente", "serviceId=1&date=2030-02-30"],
    ["serviceId no numérico", `serviceId=abc&date=${DAY}`],
  ])("400 para query inválida: %s", async (_label, query) => {
    const res = await getAvailability(
      jsonRequest(`/api/businesses/${slugA}/availability?${query}`, "GET"),
      ctx({ slug: slugA }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("404 para un servicio de otro negocio o inactivo (criterio 6)", async () => {
    await prisma.service.update({ where: { id: a.long.id }, data: { isActive: false } });
    for (const serviceId of [b.short.id, a.long.id]) {
      const res = await getAvailability(
        jsonRequest(`/api/businesses/${slugA}/availability?serviceId=${serviceId}&date=${DAY}`, "GET"),
        ctx({ slug: slugA }),
      );
      expect(res.status).toBe(404);
    }
  });
});

describe("POST /api/businesses/[slug]/appointments", () => {
  it("crea la reserva (201) con endAt y snapshot calculados en el servidor", async () => {
    const res = await book(
      slugA,
      bookingBody(a, "10:00", {
        // Campos que el cliente no puede elegir: se ignoran.
        endAt: localAt("18:00").toISOString(),
        price: "0.01",
        status: "COMPLETED",
        businessId: b.business.id,
      }),
    );
    expect(res.status).toBe(201);
    const { appointment } = await res.json();
    expect(appointment).toEqual({
      id: expect.any(Number),
      startAt: "2030-01-08T13:00:00.000Z",
      endAt: "2030-01-08T13:30:00.000Z",
      status: "CONFIRMED",
      service: { id: a.short.id, name: "Corte", durationMinutes: 30, price: "12000.00" },
    });

    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(stored.businessId).toBe(a.business.id);
    expect(stored.serviceDurationMinutes).toBe(30);
    expect(stored.servicePrice.toFixed(2)).toBe("12000.00");
  });

  it("la respuesta no incluye datos personales", async () => {
    const body = JSON.stringify(await (await book(slugA, bookingBody(a, "10:00"))).json());
    expect(body).not.toContain("Cliente Ejemplo");
    expect(body).not.toContain("+5491123456789");
  });

  it("guarda el contacto como texto normalizado (criterio 10)", async () => {
    const phone = await (await book(slugA, bookingBody(a, "10:00", { customerContact: "+54 9 11 2345-6789" }))).json();
    const email = await (await book(slugA, bookingBody(a, "11:00", { customerContact: "Cliente@Example.com" }))).json();
    const stored = await prisma.appointment.findMany({
      where: { id: { in: [phone.appointment.id, email.appointment.id] } },
      orderBy: { id: "asc" },
    });
    expect(stored.map((s) => s.customerContact)).toEqual(["+5491123456789", "cliente@example.com"]);
  });

  it("400 con mensaje de formato para un contacto inválido", async () => {
    const res = await book(slugA, bookingBody(a, "10:00", { customerContact: "1155550000" }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.details[0]).toEqual({ path: "customerContact", message: expect.stringMatching(/internacional/) });
    expect(JSON.stringify(error)).not.toContain("1155550000");
  });

  it("acepta turnos adyacentes (criterio 3)", async () => {
    expect((await book(slugA, bookingBody(a, "10:00"))).status).toBe(201);
    expect((await book(slugA, bookingBody(a, "10:30"))).status).toBe(201);
    expect((await book(slugA, bookingBody(a, "09:30"))).status).toBe(201);
  });

  it("409 ante solapamiento parcial con otro servicio de distinta duración (criterios 2 y 4)", async () => {
    expect((await book(slugA, bookingBody(a, "10:00"))).status).toBe(201);
    const res = await book(slugA, bookingBody(a, "09:30", { serviceId: a.long.id }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "SLOT_UNAVAILABLE", message: "Ese horario ya no está disponible, elegí otro" },
    });
  });

  it("el mismo horario en otro negocio se puede reservar (criterio 1)", async () => {
    expect((await book(slugA, bookingBody(a, "10:00"))).status).toBe(201);
    expect((await book(slugB, bookingBody(b, "10:00"))).status).toBe(201);
  });

  it("serviceId de B al reservar en A responde 404 y no crea nada (criterio 7)", async () => {
    const res = await book(slugA, bookingBody(a, "10:00", { serviceId: b.short.id }));
    expect(res.status).toBe(404);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("un servicio inactivo no se puede reservar (criterio 6)", async () => {
    await prisma.service.update({ where: { id: a.short.id }, data: { isActive: false } });
    expect((await book(slugA, bookingBody(a, "10:00"))).status).toBe(404);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it.each([
    ["en el pasado", "2030-01-07T11:00:00.000Z", "INSUFFICIENT_NOTICE"],
    ["con aviso insuficiente", "2030-01-07T12:30:00.000Z", "INSUFFICIENT_NOTICE"],
    ["fuera del horizonte", "2030-02-06T13:00:00.000Z", "OUTSIDE_BOOKING_WINDOW"],
    ["fuera de la grilla", "2030-01-08T13:10:00.000Z", "NOT_A_VALID_SLOT"],
    ["que cruza el descanso", "2030-01-08T15:45:00.000Z", "NOT_A_VALID_SLOT"],
    ["en horario cerrado", "2030-01-08T17:00:00.000Z", "NOT_A_VALID_SLOT"],
  ])("422 para un turno %s (criterios 5 y 8)", async (_label, startAt, code) => {
    // 15:45Z = 12:45 local con servicio de 60 min: termina 13:45, cruza el cierre de 13:00.
    const res = await book(slugA, bookingBody(a, "10:00", { startAt, serviceId: a.long.id }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe(code);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("acepta startAt con offset local equivalente", async () => {
    const res = await book(slugA, bookingBody(a, "10:00", { startAt: "2030-01-08T10:00:00-03:00" }));
    expect(res.status).toBe(201);
    expect((await res.json()).appointment.startAt).toBe("2030-01-08T13:00:00.000Z");
  });

  it("el snapshot de precio/duración no cambia al editar el servicio (criterio 11)", async () => {
    const { appointment } = await (await book(slugA, bookingBody(a, "10:00"))).json();
    await prisma.service.update({ where: { id: a.short.id }, data: { price: "99999.00", durationMinutes: 90 } });
    const stored = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(stored.servicePrice.toFixed(2)).toBe("12000.00");
    expect(stored.serviceDurationMinutes).toBe(30);
    expect(stored.endAt.toISOString()).toBe("2030-01-08T13:30:00.000Z");
  });

  it("400 si el honeypot llega con contenido", async () => {
    const res = await book(slugA, bookingBody(a, "10:00", { website: "http://spam.example" }));
    expect(res.status).toBe(400);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("400 si el cuerpo no es JSON", async () => {
    const res = await postAppointment(
      new Request(`http://localhost/api/businesses/${slugA}/appointments`, { method: "POST", body: "{nope" }),
      ctx({ slug: slugA }),
    );
    expect(res.status).toBe(400);
  });

  it("429 al superar el límite de intentos por IP y negocio", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await book(slugA, { invalid: true }, "198.51.100.7")).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
    // Otra IP no se ve afectada.
    expect((await book(slugA, bookingBody(a, "10:00"), "198.51.100.8")).status).toBe(201);
  });

  it("dos POST concurrentes al mismo slot: exactamente un 201 y un 409 (criterio 13)", async () => {
    const [first, second] = await Promise.all([
      book(slugA, bookingBody(a, "10:00"), "203.0.113.10"),
      book(slugA, bookingBody(a, "10:00", { serviceId: a.long.id }), "203.0.113.11"),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await prisma.appointment.count({ where: { businessId: a.business.id, status: "CONFIRMED" } })).toBe(1);
  });

  it("ráfaga concurrente de 10 POST al mismo slot: una sola reserva", async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => book(slugA, bookingBody(a, "11:00"), `203.0.113.${20 + i}`)),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await prisma.appointment.count()).toBe(1);
  });
});
