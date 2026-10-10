import { describe, expect, it } from "vitest";
import { getPgErrorCode, isExclusionViolation } from "./db-errors";

describe("getPgErrorCode", () => {
  it("extrae el SQLSTATE de la forma que usa Prisma 7 con adapter pg", () => {
    // Forma observada empíricamente con @prisma/adapter-pg 7.10.0 (código P2039).
    const error = Object.assign(new Error("db error"), {
      code: "P2039",
      meta: { driverAdapterError: { name: "DriverAdapterError", cause: { originalCode: "23P01", kind: "postgres" } } },
    });
    expect(getPgErrorCode(error)).toBe("23P01");
    expect(isExclusionViolation(error)).toBe(true);
  });

  it("ignora códigos de Prisma (P2xxx) y valores no-error", () => {
    expect(getPgErrorCode(Object.assign(new Error("x"), { code: "P2002" }))).toBeUndefined();
    expect(getPgErrorCode(null)).toBeUndefined();
    expect(getPgErrorCode("23P01")).toBeUndefined();
  });

  it("tolera ciclos en la cadena de causas", () => {
    const error: Record<string, unknown> = { message: "x" };
    error.cause = error;
    expect(getPgErrorCode(error)).toBeUndefined();
  });
});
