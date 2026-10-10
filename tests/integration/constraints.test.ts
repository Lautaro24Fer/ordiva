/**
 * Verifica contra PostgreSQL real (tras `prisma migrate deploy` desde base
 * vacía) los constraints que protegen la integridad del dominio.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  PG_CHECK_VIOLATION,
  PG_EXCLUSION_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  getPgErrorCode,
} from "@/lib/db-errors";
import { createTestPrisma, resetDatabase } from "./test-db";

const prisma: PrismaClient = createTestPrisma();

async function createTenant(slug: string) {
  const owner = await prisma.user.create({
    data: { name: `Owner ${slug}`, email: `${slug}@example.com` },
  });
  const business = await prisma.business.create({
    data: { name: `Negocio ${slug}`, slug, ownerId: owner.id },
  });
  const short = await prisma.service.create({
    data: { businessId: business.id, name: "Corto", durationMinutes: 30, price: "1000.00" },
  });
  const long = await prisma.service.create({
    data: { businessId: business.id, name: "Largo", durationMinutes: 60, price: "2000.00" },
  });
  return { owner, business, short, long };
}

type Tenant = Awaited<ReturnType<typeof createTenant>>;

function book(
  tenant: Tenant,
  start: string,
  minutes: number,
  extra: { serviceId?: number; status?: "CONFIRMED" | "CANCELLED" | "COMPLETED" } = {},
) {
  const startAt = new Date(start);
  return prisma.appointment.create({
    data: {
      businessId: tenant.business.id,
      serviceId: extra.serviceId ?? tenant.short.id,
      customerName: "Cliente",
      customerContact: "cliente@example.com",
      startAt,
      endAt: new Date(startAt.getTime() + minutes * 60_000),
      status: extra.status,
      serviceDurationMinutes: minutes,
      servicePrice: "1000.00",
    },
  });
}

/** Ejecuta la promesa y devuelve el SQLSTATE con que falló (o falla el test). */
async function expectPgError(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return getPgErrorCode(error);
  }
  throw new Error("Se esperaba un error de base de datos");
}

let a: Tenant;
let b: Tenant;

beforeEach(async () => {
  await resetDatabase(prisma);
  a = await createTenant("negocio-a");
  b = await createTenant("negocio-b");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Appointment: exclusión de solapamientos", () => {
  it("rechaza un solapamiento parcial en el mismo negocio con 23P01", async () => {
    await book(a, "2030-01-07T12:00:00Z", 30);
    expect(await expectPgError(book(a, "2030-01-07T12:15:00Z", 30))).toBe(PG_EXCLUSION_VIOLATION);
  });

  it("bloquea servicios distintos del mismo negocio (un solo profesional)", async () => {
    await book(a, "2030-01-07T12:00:00Z", 30, { serviceId: a.short.id });
    const code = await expectPgError(book(a, "2030-01-07T11:45:00Z", 60, { serviceId: a.long.id }));
    expect(code).toBe(PG_EXCLUSION_VIOLATION);
  });

  it("permite reservas adyacentes [09:00,09:30) y [09:30,10:00)", async () => {
    await book(a, "2030-01-07T12:00:00Z", 30);
    await expect(book(a, "2030-01-07T12:30:00Z", 30)).resolves.toBeDefined();
  });

  it("una reserva en A no bloquea el mismo horario en B", async () => {
    await book(a, "2030-01-07T12:00:00Z", 30);
    await expect(book(b, "2030-01-07T12:00:00Z", 30, { serviceId: b.short.id })).resolves.toBeDefined();
  });

  it("CANCELLED libera el horario", async () => {
    const first = await book(a, "2030-01-07T12:00:00Z", 30);
    await prisma.appointment.update({ where: { id: first.id }, data: { status: "CANCELLED" } });
    await expect(book(a, "2030-01-07T12:00:00Z", 30)).resolves.toBeDefined();
  });

  it("COMPLETED sigue bloqueando el horario", async () => {
    await book(a, "2030-01-07T12:00:00Z", 30, { status: "COMPLETED" });
    expect(await expectPgError(book(a, "2030-01-07T12:00:00Z", 30))).toBe(PG_EXCLUSION_VIOLATION);
  });

  it("reactivar un turno cancelado sobre un horario ya ocupado falla", async () => {
    const cancelled = await book(a, "2030-01-07T12:00:00Z", 30, { status: "CANCELLED" });
    await book(a, "2030-01-07T12:00:00Z", 30);
    const code = await expectPgError(
      prisma.appointment.update({ where: { id: cancelled.id }, data: { status: "CONFIRMED" } }),
    );
    expect(code).toBe(PG_EXCLUSION_VIOLATION);
  });

  it("inserciones concurrentes para el mismo slot: exactamente una gana", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () => book(a, "2030-01-07T12:00:00Z", 30)),
    );
    const fulfilled = attempts.filter((r) => r.status === "fulfilled");
    const rejected = attempts.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected.map((r) => getPgErrorCode(r.reason))).toEqual(
      Array(7).fill(PG_EXCLUSION_VIOLATION),
    );
    expect(await prisma.appointment.count({ where: { businessId: a.business.id } })).toBe(1);
  });
});

describe("Appointment: integridad multi-tenant y checks", () => {
  it("la FK compuesta rechaza un servicio de otro negocio", async () => {
    const code = await expectPgError(book(a, "2030-01-07T12:00:00Z", 30, { serviceId: b.short.id }));
    expect(code).toBe(PG_FOREIGN_KEY_VIOLATION);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("rechaza endAt <= startAt", async () => {
    const at = new Date("2030-01-07T12:00:00Z");
    const code = await expectPgError(
      prisma.appointment.create({
        data: {
          businessId: a.business.id,
          serviceId: a.short.id,
          customerName: "Cliente",
          customerContact: "cliente@example.com",
          startAt: at,
          endAt: at,
          serviceDurationMinutes: 30,
          servicePrice: "1000.00",
        },
      }),
    );
    expect(code).toBe(PG_CHECK_VIOLATION);
  });

  it("no permite borrar físicamente un Service con turnos (FK restrictiva)", async () => {
    await book(a, "2030-01-07T12:00:00Z", 30);
    const code = await expectPgError(prisma.service.delete({ where: { id: a.short.id } }));
    expect(code).toBe(PG_FOREIGN_KEY_VIOLATION);
  });

  it("customerContact se guarda como texto sin perder '+' ni ceros", async () => {
    const startAt = new Date("2030-01-07T12:00:00Z");
    const created = await prisma.appointment.create({
      data: {
        businessId: a.business.id,
        serviceId: a.short.id,
        customerName: "Cliente",
        customerContact: "+5491100000001",
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60_000),
        serviceDurationMinutes: 30,
        servicePrice: "1000.00",
      },
    });
    expect(created.customerContact).toBe("+5491100000001");
  });
});

describe("CHECK constraints de configuración", () => {
  it.each([
    ["duración 0", { durationMinutes: 0, price: "1.00" }],
    ["precio negativo", { durationMinutes: 30, price: "-1.00" }],
  ])("Service rechaza %s", async (_label, data) => {
    const code = await expectPgError(
      prisma.service.create({ data: { businessId: a.business.id, name: "Inválido", ...data } }),
    );
    expect(code).toBe(PG_CHECK_VIOLATION);
  });

  it.each([
    ["día 7", { dayOfWeek: 7, startTime: "09:00", endTime: "13:00" }],
    ["día negativo", { dayOfWeek: -1, startTime: "09:00", endTime: "13:00" }],
    ["formato sin cero", { dayOfWeek: 1, startTime: "9:00", endTime: "13:00" }],
    ["hora 24:00", { dayOfWeek: 1, startTime: "09:00", endTime: "24:00" }],
    ["inicio == fin", { dayOfWeek: 1, startTime: "09:00", endTime: "09:00" }],
    ["franja nocturna", { dayOfWeek: 1, startTime: "22:00", endTime: "02:00" }],
  ])("BusinessHours rechaza %s", async (_label, data) => {
    const code = await expectPgError(
      prisma.businessHours.create({ data: { businessId: a.business.id, ...data } }),
    );
    expect(code).toBe(PG_CHECK_VIOLATION);
  });

  it.each([
    ["slotIntervalMinutes 0", { slotIntervalMinutes: 0 }],
    ["minNoticeMinutes negativo", { minNoticeMinutes: -1 }],
    ["maxAdvanceDays 0", { maxAdvanceDays: 0 }],
  ])("BookingRule rechaza %s", async (_label, data) => {
    const code = await expectPgError(
      prisma.bookingRule.create({ data: { businessId: a.business.id, ...data } }),
    );
    expect(code).toBe(PG_CHECK_VIOLATION);
  });

  it.each(["AB-cd", "con espacio", "ab", "-inicio", "fin-", "doble--guion"])(
    "Business rechaza slug %j",
    async (slug) => {
      const code = await expectPgError(
        prisma.business.create({ data: { name: "X", slug, ownerId: a.owner.id } }),
      );
      expect(code).toBe(PG_CHECK_VIOLATION);
    },
  );

  it("User rechaza email sin normalizar", async () => {
    const code = await expectPgError(
      prisma.user.create({ data: { name: "X", email: " Mayus@Example.com" } }),
    );
    expect(code).toBe(PG_CHECK_VIOLATION);
  });
});
