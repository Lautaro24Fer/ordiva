import { describe, expect, it } from "vitest";
import { localDateTimeToUtc, toLocalTimeLabel } from "@/lib/time";
import { computeSlots, isWithinHorizon, overlaps, type ComputeSlotsInput } from "./compute-slots";

const AR = "America/Argentina/Buenos_Aires";
const NY = "America/New_York";

const at = (date: string, time: string, zone = AR) => localDateTimeToUtc(date, time, zone)!;
const labels = (input: ComputeSlotsInput) =>
  computeSlots(input).map((s) => toLocalTimeLabel(s.startAt, input.timezone));

// Martes 13/10/2026; "now" una semana antes para no interferir con el aviso mínimo.
const base: ComputeSlotsInput = {
  date: "2026-10-13",
  timezone: AR,
  hours: [{ startTime: "09:00", endTime: "13:00" }],
  durationMinutes: 30,
  slotIntervalMinutes: 30,
  minNoticeMinutes: 60,
  busy: [],
  now: new Date("2026-10-06T12:00:00Z"),
};

describe("computeSlots", () => {
  it("reproduce el ejemplo determinista de la especificación", () => {
    const busy = [{ startAt: at("2026-10-13", "09:30"), endAt: at("2026-10-13", "10:00") }];
    expect(labels({ ...base, busy })).toEqual([
      "09:00", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    ]);
  });

  it("devuelve instantes UTC (Argentina UTC-3)", () => {
    const [first] = computeSlots(base);
    expect(first.startAt.toISOString()).toBe("2026-10-13T12:00:00.000Z");
    expect(first.endAt.toISOString()).toBe("2026-10-13T12:30:00.000Z");
  });

  it("sin franjas devuelve vacío", () => {
    expect(computeSlots({ ...base, hours: [] })).toEqual([]);
  });

  it("excluye turnos que cruzan el descanso 13:00–15:00 o el fin de jornada", () => {
    const result = labels({
      ...base,
      hours: [
        { startTime: "12:00", endTime: "13:00" },
        { startTime: "15:00", endTime: "16:00" },
      ],
      durationMinutes: 45,
      slotIntervalMinutes: 15,
    });
    // 12:15+45 = 13:00 entra justo; 12:30 cruzaría el descanso; 15:15+45 = 16:00 entra.
    expect(result).toEqual(["12:00", "12:15", "15:00", "15:15"]);
  });

  it("acepta un slot adyacente a una reserva existente", () => {
    const busy = [{ startAt: at("2026-10-13", "09:00"), endAt: at("2026-10-13", "09:30") }];
    expect(labels({ ...base, busy })[0]).toBe("09:30");
  });

  it("excluye solapamientos parciales con reservas de distinta duración", () => {
    // Reserva 10:15–11:15 (60 min) bloquea 10:00, 10:30 y 11:00 para un servicio de 30.
    const busy = [{ startAt: at("2026-10-13", "10:15"), endAt: at("2026-10-13", "11:15") }];
    const result = labels({ ...base, busy });
    expect(result).not.toContain("10:00");
    expect(result).not.toContain("10:30");
    expect(result).not.toContain("11:00");
    expect(result).toContain("09:30");
    expect(result).toContain("11:30");
  });

  it("aplica el aviso mínimo respecto de now", () => {
    // now = 09:10 local; con 60 min de aviso el primer slot válido es 10:30 (10:10 no está en la grilla).
    const now = at("2026-10-13", "09:10");
    expect(labels({ ...base, now })[0]).toBe("10:30");
  });

  it("no ofrece horarios en el pasado aunque el aviso mínimo sea 0", () => {
    const now = at("2026-10-13", "11:00");
    expect(labels({ ...base, now, minNoticeMinutes: 0 })[0]).toBe("11:00");
  });

  it("devuelve los slots ordenados aunque las franjas lleguen desordenadas", () => {
    const result = labels({
      ...base,
      hours: [
        { startTime: "15:00", endTime: "16:00" },
        { startTime: "09:00", endTime: "10:00" },
      ],
    });
    expect(result).toEqual(["09:00", "09:30", "15:00", "15:30"]);
  });

  describe("DST (America/New_York)", () => {
    const ny = { ...base, timezone: NY, minNoticeMinutes: 0, now: new Date("2026-01-01T00:00:00Z") };

    it("día de salto de primavera: la franja 00:00–04:00 dura 3 horas reales", () => {
      const slots = computeSlots({
        ...ny,
        date: "2026-03-08",
        hours: [{ startTime: "00:00", endTime: "04:00" }],
        durationMinutes: 60,
        slotIntervalMinutes: 60,
      });
      expect(slots.map((s) => s.startAt.toISOString())).toEqual([
        "2026-03-08T05:00:00.000Z",
        "2026-03-08T06:00:00.000Z",
        "2026-03-08T07:00:00.000Z",
      ]);
      expect(slots.map((s) => toLocalTimeLabel(s.startAt, NY))).toEqual(["00:00", "01:00", "03:00"]);
    });

    it("descarta una franja cuyo inicio no existe ese día", () => {
      expect(computeSlots({ ...ny, date: "2026-03-08", hours: [{ startTime: "02:30", endTime: "05:00" }] })).toEqual([]);
    });

    it("usa el offset correcto antes y después del cambio", () => {
      const winter = computeSlots({ ...ny, date: "2026-03-06" })[0];
      const summer = computeSlots({ ...ny, date: "2026-03-09" })[0];
      expect(winter.startAt.toISOString()).toBe("2026-03-06T14:00:00.000Z");
      expect(summer.startAt.toISOString()).toBe("2026-03-09T13:00:00.000Z");
    });
  });
});

describe("overlaps", () => {
  const i = (s: string, e: string) => ({ startAt: new Date(s), endAt: new Date(e) });
  it("trata los intervalos como semiabiertos [start, end)", () => {
    expect(overlaps(i("2030-01-01T09:00Z", "2030-01-01T09:30Z"), i("2030-01-01T09:30Z", "2030-01-01T10:00Z"))).toBe(false);
    expect(overlaps(i("2030-01-01T09:00Z", "2030-01-01T09:31Z"), i("2030-01-01T09:30Z", "2030-01-01T10:00Z"))).toBe(true);
  });
});

describe("isWithinHorizon", () => {
  // 02:00Z del 14/10 = 23:00 del 13/10 en Argentina: "hoy" es el 13 en la zona del negocio.
  const now = new Date("2026-10-14T02:00:00Z");

  it("incluye hoy y hasta hoy + maxAdvanceDays − 1", () => {
    expect(isWithinHorizon("2026-10-13", AR, now, 30)).toBe(true);
    expect(isWithinHorizon("2026-11-11", AR, now, 30)).toBe(true);
    expect(isWithinHorizon("2026-11-12", AR, now, 30)).toBe(false);
  });

  it("rechaza fechas pasadas según la zona del negocio, no UTC", () => {
    expect(isWithinHorizon("2026-10-12", AR, now, 30)).toBe(false);
    expect(isWithinHorizon("2026-10-13", "UTC", now, 30)).toBe(false);
  });
});
