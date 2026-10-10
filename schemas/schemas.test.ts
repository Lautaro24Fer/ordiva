import { describe, expect, it } from "vitest";
import { createPublicAppointmentSchema, customerContactSchema } from "./appointments";
import { replaceHoursSchema } from "./businesses";
import { idParamSchema, moneySchema } from "./common";

describe("customerContact", () => {
  it.each([
    ["Cliente@Example.COM", "cliente@example.com"],
    ["  ana.perez+turnos@mail.com.ar ", "ana.perez+turnos@mail.com.ar"],
    ["+5491123456789", "+5491123456789"],
    ["+54 9 11 2345-6789", "+5491123456789"],
    ["+34600000000", "+34600000000"],
  ])("acepta y normaliza %j", (input, expected) => {
    expect(customerContactSchema.parse(input)).toBe(expected);
  });

  it.each([
    "",
    "no-es-contacto",
    "1123456789", // número local sin prefijo internacional: país ambiguo
    "+0123456789", // E.164 no empieza con 0
    "+54 (11) 2345-6789", // paréntesis: no se adivina el formato
    "+54911234567890123", // demasiado largo
    "ana@",
    "@example.com",
  ])("rechaza %j con un mensaje que explica el formato", (input) => {
    const result = customerContactSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/email válido|internacional/);
  });

  it("devuelve string: preserva el '+' y nunca convierte a número", () => {
    expect(typeof customerContactSchema.parse("+5491100000001")).toBe("string");
  });
});

describe("createPublicAppointmentSchema", () => {
  const valid = {
    serviceId: 17,
    startAt: "2026-10-13T13:00:00.000Z",
    customerName: "Cliente Ejemplo",
    customerContact: "+5491123456789",
  };

  it("acepta el payload de la especificación", () => {
    expect(createPublicAppointmentSchema.parse(valid)).toMatchObject(valid);
  });

  it("acepta startAt con offset explícito", () => {
    expect(createPublicAppointmentSchema.safeParse({ ...valid, startAt: "2026-10-13T10:00:00-03:00" }).success).toBe(true);
  });

  it.each([
    ["startAt sin zona", { startAt: "2026-10-13T10:00:00" }],
    ["serviceId string", { serviceId: "17" }],
    ["serviceId decimal", { serviceId: 1.5 }],
    ["serviceId negativo", { serviceId: -1 }],
    ["nombre vacío", { customerName: "  " }],
    ["nombre larguísimo", { customerName: "x".repeat(151) }],
  ])("rechaza %s", (_label, override) => {
    expect(createPublicAppointmentSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it("descarta campos que el cliente no puede elegir (precio, endAt, status, businessId)", () => {
    const parsed = createPublicAppointmentSchema.parse({
      ...valid,
      price: "0.01",
      endAt: "2026-10-13T20:00:00.000Z",
      status: "COMPLETED",
      businessId: 999,
    });
    expect(parsed).not.toHaveProperty("price");
    expect(parsed).not.toHaveProperty("endAt");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("businessId");
  });
});

describe("replaceHoursSchema", () => {
  const h = (dayOfWeek: number, startTime: string, endTime: string) => ({ dayOfWeek, startTime, endTime });

  it("acepta varias franjas por día sin solapamiento (adyacentes incluidas)", () => {
    expect(replaceHoursSchema.safeParse({ hours: [h(1, "09:00", "13:00"), h(1, "13:00", "18:00"), h(2, "09:00", "13:00")] }).success).toBe(true);
  });

  it.each([
    ["solapadas", [h(1, "09:00", "13:00"), h(1, "12:00", "18:00")]],
    ["duplicadas", [h(1, "09:00", "13:00"), h(1, "09:00", "13:00")]],
    ["nocturna", [h(1, "22:00", "02:00")]],
    ["día 7", [h(7, "09:00", "13:00")]],
    ["formato inválido", [h(1, "9:00", "13:00")]],
  ])("rechaza franjas %s", (_label, hours) => {
    expect(replaceHoursSchema.safeParse({ hours }).success).toBe(false);
  });

  it("acepta una agenda vacía (negocio cerrado)", () => {
    expect(replaceHoursSchema.safeParse({ hours: [] }).success).toBe(true);
  });
});

describe("primitivos", () => {
  it("idParamSchema solo acepta enteros positivos en texto", () => {
    expect(idParamSchema.parse("42")).toBe(42);
    for (const bad of ["0", "-1", "1.5", "abc", "1e3", "01", "99999999999"]) {
      expect(idParamSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("moneySchema acepta importes decimales como string", () => {
    expect(moneySchema.parse("15000")).toBe("15000");
    expect(moneySchema.parse("15000.50")).toBe("15000.50");
    for (const bad of ["-1", "1.234", "1,50", "abc", ""]) {
      expect(moneySchema.safeParse(bad).success).toBe(false);
    }
  });
});
