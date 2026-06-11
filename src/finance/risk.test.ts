import { describe, expect, it } from "vitest";
import { classifyCreditCardRisk } from "./risk.js";

describe("classifyCreditCardRisk", () => {
  it("classifies invoice pressure against monthly income", () => {
    expect(classifyCreditCardRisk(10000, 100000)).toBe("SAFE");
    expect(classifyCreditCardRisk(35000, 100000)).toBe("ATTENTION");
    expect(classifyCreditCardRisk(50000, 100000)).toBe("DANGEROUS");
    expect(classifyCreditCardRisk(70000, 100000)).toBe("CHAOTIC");
  });

  it("treats missing income as chaotic", () => {
    expect(classifyCreditCardRisk(10000, 0)).toBe("CHAOTIC");
  });
});
