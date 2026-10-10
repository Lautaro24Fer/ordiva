/** Consultas de las páginas públicas (Server Components) contra PostgreSQL real. */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getBookingPage, getBusinessPage, listDemoBusinesses } from "@/modules/businesses/public-pages.service";
import { createTestPrisma, resetDatabase } from "./test-db";
import { NOW, createTenant, localAt, type Tenant } from "./fixtures";

const prisma = createTestPrisma();
let a: Tenant;

beforeEach(async () => {
  await resetDatabase(prisma);
  a = await createTenant(prisma, "negocio-a");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getBusinessPage", () => {
  it("devuelve null para un slug inexistente", async () => {
    expect(await getBusinessPage("no-existe")).toBeNull();
  });

  it("expone solo datos públicos y servicios activos", async () => {
    await prisma.service.update({ where: { id: a.long.id }, data: { isActive: false } });
    await prisma.appointment.create({
      data: {
        businessId: a.business.id,
        serviceId: a.short.id,
        customerName: "Cliente Privado",
        customerContact: "privado@example.com",
        startAt: localAt("10:00"),
        endAt: localAt("10:30"),
        serviceDurationMinutes: 30,
        servicePrice: "12000.00",
      },
    });

    const data = await getBusinessPage("negocio-a");
    expect(data).toEqual({
      business: { name: "Negocio negocio-a", slug: "negocio-a", description: null, timezone: "America/Argentina/Buenos_Aires" },
      services: [{ id: a.short.id, name: "Corte", description: null, durationMinutes: 30, price: "12000.00" }],
    });
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("privado@example.com");
    expect(serialized).not.toContain("ownerId");
  });
});

describe("getBookingPage", () => {
  it("arma los días desde hoy en la zona del negocio y marca los cerrados", async () => {
    await prisma.businessHours.deleteMany({ where: { businessId: a.business.id, dayOfWeek: 0 } });
    const data = await getBookingPage("negocio-a", NOW); // lunes 07/01/2030
    expect(data?.days).toHaveLength(30);
    expect(data?.days[0]).toMatchObject({ date: "2030-01-07", isOpen: true });
    expect(data?.days[6]).toMatchObject({ date: "2030-01-13", isOpen: false }); // domingo
    expect(data?.minNoticeMinutes).toBe(60);
  });

  it("devuelve null para un slug inexistente", async () => {
    expect(await getBookingPage("no-existe", NOW)).toBeNull();
  });
});

describe("listDemoBusinesses", () => {
  it("omite negocios sin servicios activos", async () => {
    await createTenant(prisma, "negocio-b");
    await prisma.service.updateMany({ where: { business: { slug: "negocio-b" } }, data: { isActive: false } });
    expect((await listDemoBusinesses()).map((b) => b.slug)).toEqual(["negocio-a"]);
  });
});
