import { describe, expect, it } from "vitest";
import { isValidIanaZone } from "./formats";
import { TIMEZONE_OPTIONS, slugify } from "./timezones";

describe("slugify", () => {
  it.each([
    ["Peluquería Ñandú 2", "peluqueria-nandu-2"],
    ["  Barbería   Centro!! ", "barberia-centro"],
    ["Corte & Color", "corte-color"],
    ["---", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

it("todas las zonas ofrecidas son IANA válidas", () => {
  for (const { value } of TIMEZONE_OPTIONS) expect(isValidIanaZone(value)).toBe(true);
});
