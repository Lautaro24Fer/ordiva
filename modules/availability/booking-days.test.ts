import { describe, expect, it } from "vitest";
import { buildBookingDays } from "./booking-days";

const AR = "America/Argentina/Buenos_Aires";
const weekdaysOnly = new Set([1, 2, 3, 4, 5]);

describe("buildBookingDays", () => {
  it("empieza en el día actual de la zona del negocio, no de UTC", () => {
    // 02:00Z del 12/10 = 23:00 del domingo 11/10 en Argentina.
    const days = buildBookingDays(new Date("2026-10-12T02:00:00Z"), AR, 3, weekdaysOnly);
    expect(days.map((d) => d.date)).toEqual(["2026-10-11", "2026-10-12", "2026-10-13"]);
  });

  it("marca como cerrados los días sin franjas", () => {
    const days = buildBookingDays(new Date("2026-10-11T15:00:00Z"), AR, 3, weekdaysOnly);
    expect(days.map((d) => d.isOpen)).toEqual([false, true, true]);
  });

  it("genera etiquetas en español", () => {
    const [day] = buildBookingDays(new Date("2026-10-13T15:00:00Z"), AR, 1, weekdaysOnly);
    expect(day).toEqual({ date: "2026-10-13", weekday: "mar", label: "13 oct", isOpen: true });
  });

  it("respeta maxAdvanceDays con un tope de 60 días", () => {
    const now = new Date("2026-10-13T15:00:00Z");
    expect(buildBookingDays(now, AR, 30, weekdaysOnly)).toHaveLength(30);
    expect(buildBookingDays(now, AR, 365, weekdaysOnly)).toHaveLength(60);
  });

  it("cruza fin de mes", () => {
    const days = buildBookingDays(new Date("2026-10-30T15:00:00Z"), AR, 4, weekdaysOnly);
    expect(days.map((d) => d.date)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});
