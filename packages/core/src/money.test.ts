import { describe, expect, it } from "vitest";
import { majorUnitsToMinorUnits, minorUnitsToMajorUnits } from "./money";

describe("money helpers", () => {
  it("majorUnitsToMinorUnits rounds to integer minor units (default 100)", () => {
    expect(majorUnitsToMinorUnits(2.3)).toBe(230);
    expect(majorUnitsToMinorUnits(179.95)).toBe(17_995);
    expect(majorUnitsToMinorUnits(224.94)).toBe(22_494);
  });

  it("minorUnitsToMajorUnits converts for display", () => {
    expect(minorUnitsToMajorUnits(17_995)).toBe(179.95);
  });

  it("BRL example: reais map to centavos with default multiplier", () => {
    expect(majorUnitsToMinorUnits(230)).toBe(23_000);
  });
});
