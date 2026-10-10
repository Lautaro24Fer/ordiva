import { describe, expect, it } from "vitest";
import { addLocalDays, isValidIanaZone, localDateTimeToUtc, localDayOfWeek, toLocalDate } from "./time";

const AR = "America/Argentina/Buenos_Aires";
const NY = "America/New_York";

describe("localDateTimeToUtc", () => {
  it("convierte hora local de Argentina (UTC-3) a UTC", () => {
    expect(localDateTimeToUtc("2026-10-13", "09:00", AR)?.toISOString()).toBe("2026-10-13T12:00:00.000Z");
  });

  it("usa el offset vigente en cada fecha (DST en Nueva York)", () => {
    expect(localDateTimeToUtc("2026-01-15", "09:00", NY)?.toISOString()).toBe("2026-01-15T14:00:00.000Z");
    expect(localDateTimeToUtc("2026-07-15", "09:00", NY)?.toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });

  it("rechaza una hora local inexistente (salto de primavera)", () => {
    expect(localDateTimeToUtc("2026-03-08", "02:30", NY)).toBeNull();
  });

  it("resuelve una hora ambigua con la primera ocurrencia", () => {
    expect(localDateTimeToUtc("2026-11-01", "01:30", NY)?.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it.each([
    ["2026-02-30", "09:00"],
    ["2026-13-01", "09:00"],
    ["2026-10-13", "9:00"],
    ["2026-10-13", "24:00"],
    ["13/10/2026", "09:00"],
  ])("rechaza entradas inválidas %s %s", (date, time) => {
    expect(localDateTimeToUtc(date, time, AR)).toBeNull();
  });
});

describe("helpers de fecha local", () => {
  it("dayOfWeek usa 0=domingo..6=sábado", () => {
    expect(localDayOfWeek("2026-10-11", AR)).toBe(0);
    expect(localDayOfWeek("2026-10-13", AR)).toBe(2);
    expect(localDayOfWeek("2026-10-17", AR)).toBe(6);
  });

  it("toLocalDate respeta la frontera de día de la zona", () => {
    const instant = new Date("2026-10-14T02:00:00Z"); // 23:00 del 13 en Argentina
    expect(toLocalDate(instant, AR)).toBe("2026-10-13");
    expect(toLocalDate(instant, "UTC")).toBe("2026-10-14");
  });

  it("addLocalDays cruza fin de mes", () => {
    expect(addLocalDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("valida identificadores IANA", () => {
    expect(isValidIanaZone(AR)).toBe(true);
    expect(isValidIanaZone("Mars/Base")).toBe(false);
  });
});

describe("formatLocalDateLong", () => {
  it("formatea en español", async () => {
    const { formatLocalDateLong } = await import("./time");
    expect(formatLocalDateLong("2026-10-13")).toBe("martes 13 de octubre");
  });
});
