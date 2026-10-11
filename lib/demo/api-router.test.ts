import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoApi } from "@/lib/demo/api-router";
import { createLocalRepositories } from "@/lib/demo/local-repos";
import { resetDemo } from "@/lib/demo/store";

// Lunes 07/01/2030 09:00 en Buenos Aires (UTC-3). Los turnos sembrados con
// daysAhead 2 caen el miércoles 09/01 a las 10:00 local (13:00Z).
const NOW = new Date("2030-01-07T12:00:00Z");
const ANA = 1;
const BRUNO = 2;
const BARBERIA = 1;

let sessionUser: number | null = null;
const api = createDemoApi({ repos: createLocalRepositories(), getUserId: async () => sessionUser });

const book = (startAt: string, extra: Record<string, unknown> = {}) =>
  api("/api/businesses/barberia-centro/appointments", "POST", {
    serviceId: 1,
    startAt,
    customerName: "Visitante Demo",
    customerContact: "visitante@example.com",
    ...extra,
  });

const slotLabels = async (date: string) => {
  const res = await api(`/api/businesses/barberia-centro/availability?serviceId=1&date=${date}`, "GET");
  expect(res.status).toBe(200);
  return (res.body as { slots: { label: string }[] }).slots.map((s) => s.label);
};

const errorCode = (res: { body: unknown }) => (res.body as { error: { code: string } }).error.code;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetDemo(NOW);
  sessionUser = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reservas públicas", () => {
  it("lista negocio y servicios activos del seed", async () => {
    const business = await api("/api/businesses/barberia-centro", "GET");
    expect(business).toMatchObject({ status: 200, body: { business: { name: "Barbería Centro" } } });

    const services = await api("/api/businesses/barberia-centro/services", "GET");
    expect((services.body as { services: { name: string }[] }).services.map((s) => s.name)).toEqual([
      "Afeitado clásico",
      "Corte + barba",
      "Corte de pelo",
    ]);
  });

  it("la disponibilidad excluye el turno sembrado y se actualiza al reservar", async () => {
    const before = await slotLabels("2030-01-09");
    expect(before).toContain("09:30");
    expect(before).not.toContain("09:45");
    expect(before).not.toContain("10:00");
    expect(before).toContain("09:00");

    const res = await book("2030-01-09T12:00:00Z");
    expect(res.status).toBe(201);
    expect(await slotLabels("2030-01-09")).not.toContain("09:00");
  });

  it("rechaza un horario superpuesto con 409", async () => {
    const res = await book("2030-01-09T13:00:00Z");
    expect(res.status).toBe(409);
    expect(errorCode(res)).toBe("SLOT_UNAVAILABLE");
  });

  it("aplica aviso mínimo, horizonte y grilla", async () => {
    expect(errorCode(await book("2030-01-07T12:30:00Z"))).toBe("INSUFFICIENT_NOTICE");
    expect(errorCode(await book("2030-03-04T12:00:00Z"))).toBe("OUTSIDE_BOOKING_WINDOW");
    expect(errorCode(await book("2030-01-09T12:05:00Z"))).toBe("NOT_A_VALID_SLOT");
  });

  it("valida el cuerpo con los mismos schemas que la API real", async () => {
    const res = await book("2030-01-09T12:00:00Z", { customerContact: "no-es-contacto" });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");

    const honeypot = await book("2030-01-09T12:00:00Z", { website: "spam" });
    expect(honeypot.status).toBe(400);
  });

  it("un negocio inexistente responde 404", async () => {
    expect((await api("/api/businesses/no-existe", "GET")).status).toBe(404);
  });
});

describe("administración", () => {
  const appointmentsUrl = (businessId: number) => `/api/admin/businesses/${businessId}/appointments?date=2030-01-09`;

  it("sin sesión responde 401", async () => {
    expect((await api(appointmentsUrl(BARBERIA), "GET")).status).toBe(401);
  });

  it("un negocio ajeno responde 404, igual que uno inexistente", async () => {
    sessionUser = BRUNO;
    expect((await api(appointmentsUrl(BARBERIA), "GET")).status).toBe(404);
    expect((await api("/api/admin/businesses/99", "GET")).status).toBe(404);
  });

  it("lista turnos del día y aplica transiciones de estado una sola vez", async () => {
    sessionUser = ANA;
    const list = await api(appointmentsUrl(BARBERIA), "GET");
    const [appointment] = (list.body as { appointments: { id: number; customerName: string }[] }).appointments;
    expect(appointment.customerName).toBe("Cliente Ejemplo");

    const url = `/api/admin/businesses/${BARBERIA}/appointments/${appointment.id}`;
    expect((await api(url, "PATCH", { status: "CANCELLED" })).status).toBe(200);
    const again = await api(url, "PATCH", { status: "COMPLETED" });
    expect(again.status).toBe(409);
    expect(errorCode(again)).toBe("INVALID_STATUS_TRANSITION");

    // El turno cancelado libera el horario.
    expect((await book("2030-01-09T13:00:00Z")).status).toBe(201);
  });

  it("crea negocios con slug único", async () => {
    sessionUser = ANA;
    const input = { name: "Otro", slug: "barberia-centro", timezone: "America/Argentina/Buenos_Aires" };
    const taken = await api("/api/admin/businesses", "POST", input);
    expect(errorCode(taken)).toBe("SLUG_TAKEN");

    const created = await api("/api/admin/businesses", "POST", { ...input, slug: "nuevo-local" });
    expect(created.status).toBe(201);
    const list = await api("/api/admin/businesses", "GET");
    expect((list.body as { businesses: { slug: string }[] }).businesses.map((b) => b.slug)).toEqual([
      "barberia-centro",
      "nuevo-local",
    ]);
  });

  it("desactivar un servicio lo saca de la oferta pública", async () => {
    sessionUser = ANA;
    expect((await api(`/api/admin/businesses/${BARBERIA}/services/3`, "DELETE")).status).toBe(200);
    const services = await api("/api/businesses/barberia-centro/services", "GET");
    expect((services.body as { services: { id: number }[] }).services.map((s) => s.id)).not.toContain(3);
  });

  it("una ruta desconocida responde 404", async () => {
    expect((await api("/api/no-existe", "GET")).status).toBe(404);
  });
});

describe("persistencia en localStorage", () => {
  function fakeStorage() {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
      clear: () => data.clear(),
      key: () => null,
      length: 0,
    } satisfies Storage;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("los cambios sobreviven a una recarga y el reset vuelve al seed", async () => {
    vi.stubGlobal("localStorage", fakeStorage());

    const first = await import("@/lib/demo/store");
    first.updateDemoState((state) => {
      state.businesses[0].name = "Barbería Renombrada";
    });

    vi.resetModules();
    const reloaded = await import("@/lib/demo/store");
    expect(reloaded.getDemoState().businesses[0].name).toBe("Barbería Renombrada");

    reloaded.resetDemo();
    expect(reloaded.getDemoState().businesses[0].name).toBe("Barbería Centro");
  });

  it("vuelve a sembrar si el snapshot guardado está corrupto", async () => {
    const storage = fakeStorage();
    storage.setItem("ordiva-demo:v1", "{no es json");
    vi.stubGlobal("localStorage", storage);

    const store = await import("@/lib/demo/store");
    expect(store.getDemoState().businesses).toHaveLength(2);
  });
});
