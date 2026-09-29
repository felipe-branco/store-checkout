import { describe, it, expect } from "vitest";
import { coerceEventDataToExpected, normalizeEventData } from "./helpers";

const skuKeys = { numericStringFieldKeys: ["sku", "line_code"] as const };

describe("normalizeEventData", () => {
  it("converts configured numeric string fields and nested value from numbers to strings", () => {
    const dbData = {
      sku: 12345678900,
      line_code: 12345,
      lines: [{ state: "WH", value: 12345 }],
      item_id: "ffd2d7f6-1fe3-4724-b737-7763e62375dd",
      name: "Widget",
      phone_number: "31987654321",
      active: true,
    };

    const expected = {
      sku: "12345678900",
      line_code: "12345",
      lines: [{ state: "WH", value: "12345" }],
      item_id: "ffd2d7f6-1fe3-4724-b737-7763e62375dd",
      name: "Widget",
      phone_number: "31987654321",
      active: true,
    };

    expect(normalizeEventData(dbData, skuKeys)).toEqual(expected);
  });

  it("converts extra numeric string fields when passed in options", () => {
    const dbData = {
      aggregate_id: "550e8400-e29b-41d4-a716-446655440000",
      warehouse_code: 99999,
      external_ref: 11122233344,
    };

    const expected = {
      aggregate_id: "550e8400-e29b-41d4-a716-446655440000",
      warehouse_code: "99999",
      external_ref: "11122233344",
    };

    expect(
      normalizeEventData(dbData, {
        numericStringFieldKeys: ["warehouse_code", "external_ref"],
      })
    ).toEqual(expected);
  });

  it("converts BigInt to strings for configured keys (PostgreSQL)", () => {
    const dbData = {
      sku: BigInt(12345678900),
      line_code: BigInt(12345),
      lines: [{ state: "WH", value: BigInt(12345) }],
      item_id: "ffd2d7f6-1fe3-4724-b737-7763e62375dd",
      name: "Widget",
      phone_number: "31987654321",
      active: true,
    };

    const expected = {
      sku: "12345678900",
      line_code: "12345",
      lines: [{ state: "WH", value: "12345" }],
      item_id: "ffd2d7f6-1fe3-4724-b737-7763e62375dd",
      name: "Widget",
      phone_number: "31987654321",
      active: true,
    };

    expect(normalizeEventData(dbData, skuKeys)).toEqual(expected);
  });

  it("converts nested numeric fields when keys are listed in options", () => {
    const dbData = {
      account_number: { agency: 1, account: 12345, account_digit: 6 },
      building_number: 100,
    };

    expect(
      normalizeEventData(dbData, {
        numericStringFieldKeys: ["agency", "account", "account_digit", "building_number"],
      })
    ).toEqual({
      account_number: { agency: "1", account: "12345", account_digit: "6" },
      building_number: "100",
    });
  });

  it("coerceEventDataToExpected aligns DB numbers to expected string fields", () => {
    const dbData = {
      account_number: { agency: 1, account: 12345, account_digit: 6 },
      building_number: 100,
      updated_at: 1779715217,
    };
    const expected = {
      account_number: { agency: "1", account: "12345", account_digit: "6" },
      building_number: "100",
      updated_at: 1779715217,
    };

    expect(
      normalizeEventData(coerceEventDataToExpected(dbData, expected), {
        numericStringFieldKeys: ["agency", "account", "account_digit", "building_number"],
      })
    ).toEqual(
      normalizeEventData(expected, {
        numericStringFieldKeys: ["agency", "account", "account_digit", "building_number"],
      })
    );
  });
});
