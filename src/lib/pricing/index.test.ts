import { describe, expect, it } from "vitest";
import { calculateCustomerPrice } from "./index";

describe("calculateCustomerPrice", () => {
  it("rounds a customer unit price half down before multiplying seats", () => {
    expect(
      calculateCustomerPrice({
        listPrice: "7.00",
        discountPercent: "42.5",
        seats: 1,
      }),
    ).toEqual({ status: "ok", unitPrice: "4.02", lineTotal: "4.02" });
  });

  it("rejects malformed non-empty pricing input", () => {
    expect(
      calculateCustomerPrice({
        listPrice: "not-a-price",
        discountPercent: "42.5",
        seats: 1,
      }).status,
    ).toBe("error");
  });

  it("accepts a valid decimal input at the 128-character limit", () => {
    const paddedPrice = `${"0".repeat(124)}7.00`;

    expect(paddedPrice).toHaveLength(128);
    expect(
      calculateCustomerPrice({
        listPrice: paddedPrice,
        discountPercent: "0",
        seats: 1,
      }),
    ).toEqual({ status: "ok", unitPrice: "7.00", lineTotal: "7.00" });
  });

  it("rejects a 129-character input before decimal parsing", () => {
    const overLimitPrice = `${"0".repeat(125)}7.00`;

    expect(overLimitPrice).toHaveLength(129);
    expect(
      calculateCustomerPrice({
        listPrice: overLimitPrice,
        discountPercent: "0",
        seats: 1,
      }).status,
    ).toBe("error");
  });
});
