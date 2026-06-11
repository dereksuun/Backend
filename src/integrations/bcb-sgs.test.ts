import { describe, expect, it } from "vitest";
import { parseBrazilianDate } from "./bcb-sgs.js";

describe("parseBrazilianDate", () => {
  it("parses Banco Central dates as UTC dates", () => {
    expect(parseBrazilianDate("11/06/2026").toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });
});
