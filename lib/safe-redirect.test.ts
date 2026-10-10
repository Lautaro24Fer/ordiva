import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-redirect";

describe("safeInternalPath", () => {
  it.each(["/dashboard", "/dashboard/3/services?x=1"])("acepta la ruta interna %j", (path) => {
    expect(safeInternalPath(path)).toBe(path);
  });

  it.each(["https://malo.example", "//malo.example", "/\\malo.example", "dashboard", "", null, undefined, 42])(
    "rechaza %j y usa el fallback",
    (value) => {
      expect(safeInternalPath(value)).toBe("/dashboard");
    },
  );
});
