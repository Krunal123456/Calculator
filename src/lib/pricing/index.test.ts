import { describe, expect, it } from "vitest";
import {
  CATALOG_CURRENCIES,
  CATALOG_TERMS,
  PRICE_CATALOG,
  SKU_CATALOG,
  catalogCellKey,
  lookupCatalogPrice,
} from "./catalog";
import {
  PROVISIONAL_SCENARIO_POLICIES,
  getProvisionalScenarioPolicy,
} from "./discountPolicy";
import {
  GOLDEN_FIXTURE_INPUT,
  SCENARIO_FIXTURE_INPUTS,
} from "./fixtures";
import {
  calculateCustomerPrice,
  calculateQuote,
} from "./index";

describe("calculateCustomerPrice", () => {
  it.each([
    ["42.5", "4.02"],
    ["17.5", "5.77"],
  ])("rounds a $7.00 customer unit price half down at %s%% discount", (discount, unitPrice) => {
    expect(
      calculateCustomerPrice({
        listPrice: "7.00",
        discountPercent: discount,
        seats: 1,
      }),
    ).toEqual({ status: "ok", unitPrice, lineTotal: unitPrice });
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

describe("catalog", () => {
  it("represents every SKU, term, and currency cell explicitly", () => {
    expect(PRICE_CATALOG.size).toBe(
      SKU_CATALOG.length * CATALOG_TERMS.length * CATALOG_CURRENCIES.length,
    );

    for (const sku of SKU_CATALOG) {
      for (const term of CATALOG_TERMS) {
        for (const currency of CATALOG_CURRENCIES) {
          expect(PRICE_CATALOG.has(catalogCellKey(sku.id, term, currency))).toBe(true);
        }
      }
    }
  });

  it("marks only the exact source-listed cells known and leaves commercial approval unresolved", () => {
    const knownCells = [
      ["business-starter", "flexible", "USD", "8.40"],
      ["business-starter", "fixed-1y", "USD", "7.00"],
      ["business-standard", "flexible", "USD", "16.80"],
      ["business-standard", "fixed-1y", "USD", "14.00"],
      ["business-plus", "flexible", "USD", "26.40"],
      ["business-plus", "fixed-1y", "USD", "22.00"],
      ["gemini-business", "fixed-1y", "USD", "21.00"],
    ] as const;

    for (const [sku, term, currency, amount] of knownCells) {
      expect(lookupCatalogPrice(sku, term, currency)).toMatchObject({
        status: "known",
        monthlyPrice: amount,
        commercialApproval: "unconfirmed",
      });
    }

    expect(lookupCatalogPrice("business-standard", "fixed-3y", "USD")).toMatchObject({
      status: "missing",
      sku: "business-standard",
      term: "fixed-3y",
      currency: "USD",
    });
    expect(lookupCatalogPrice("gemini-business", "flexible", "USD").status).toBe("missing");
    expect(lookupCatalogPrice("business-standard", "fixed-1y", "EUR").status).toBe("missing");

    const knownCount = [...PRICE_CATALOG.values()].filter(
      (cell) => cell.status === "known",
    ).length;
    expect(knownCount).toBe(knownCells.length);
  });

  it("returns a named missing-price result with no numeric total for a selected missing cell", () => {
    const result = lookupCatalogPrice("business-standard", "fixed-3y", "USD");

    expect(result).toEqual({
      status: "missing",
      code: "MISSING_CATALOG_PRICE",
      sku: "business-standard",
      skuLabel: "Business Standard",
      term: "fixed-3y",
      currency: "USD",
      message: "Price missing for Business Standard / fixed 3Y / USD",
    });
    expect(result).not.toHaveProperty("total");
  });
});

describe("provisional scenario policy", () => {
  it("keeps all sample discounts and caps explicitly provisional", () => {
    expect(PROVISIONAL_SCENARIO_POLICIES).toMatchObject({
      "attach-100": {
        approval: "provisional",
        workspaceDiscounts: ["60", "50", "40"],
        workspaceMaxApproved: "50",
        googlerDiscount: "35",
        geminiMaxApproved: "35",
      },
      "attach-50": {
        approval: "provisional",
        workspaceDiscounts: ["49", "49", "49"],
        workspaceMaxApproved: "50",
        googlerDiscount: "34.25",
        geminiMaxApproved: "35",
      },
      "attach-25": {
        approval: "provisional",
        workspaceDiscounts: ["42.5", "42.5", "42.5"],
        workspaceMaxApproved: "50",
        googlerDiscount: "15.25",
        geminiMaxApproved: "18",
      },
      "no-gemini": {
        approval: "provisional",
        workspaceDiscounts: ["17.5", "17.5", "17.5"],
        workspaceMaxApproved: "25",
        googlerDiscount: null,
        geminiMaxApproved: null,
      },
    });
  });

  it("does not interpolate a default for an unsupported attach rate", () => {
    expect(getProvisionalScenarioPolicy("attach-75")).toBeNull();
  });
});

describe("calculateQuote", () => {
  it("reproduces the exact three-year golden fixture", () => {
    const result = calculateQuote(GOLDEN_FIXTURE_INPUT);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.workspace.lines).toMatchObject([
      {
        sku: "business-standard",
        averageDiscountPercent: "50.00",
        customerUnitPrices: ["5.60", "7.00", "8.40"],
        customerLineTotals: ["560.00", "700.00", "840.00"],
        partnerUnitPrices: ["4.48", "5.60", "6.72"],
        partnerLineTotals: ["448.00", "560.00", "672.00"],
        averageCustomerMonthly: "700.00",
      },
      {
        sku: "business-starter",
        averageDiscountPercent: "50.00",
        customerUnitPrices: ["2.80", "3.50", "4.20"],
        customerLineTotals: ["28.00", "35.00", "42.00"],
        partnerUnitPrices: ["2.24", "2.80", "3.36"],
        partnerLineTotals: ["22.40", "28.00", "33.60"],
        averageCustomerMonthly: "35.00",
      },
    ]);
    expect(result.gemini).toMatchObject({
      seats: 110,
      totalDiscountPercent: "44.75",
      customerUnitPrice: "11.60",
      customerMonthly: "1276.00",
      partnerUnitPrice: "10.09",
      partnerMonthly: "1110.12",
    });
    expect(result).toMatchObject({
      customerMonthlyInvestment: "2011.00",
      averageCustomerAnnualPrice: "24132.00",
      netToGoogleMonthly: "1698.12",
      workspaceAttainmentAnnual: "7056.00",
      geminiAttainmentAnnual: "13321.44",
      rebates: {
        newCustomer: "-564.48",
        geminiDeal: "-1332.14",
        netToGoogleYear1AfterRebates: "18480.82",
      },
    });
  });

  const scenarioCases = [
    ["attach-100", "110", "44.75", "24132.00", "7056.00", "13321.44"],
    ["attach-50", "55", "44.11", "16744.80", "7197.12", "6741.11"],
    ["attach-25", "28", "27.96", "15226.08", "8113.92", "4422.80"],
    ["no-gemini", "0", null, "14552.40", "11641.92", "0.00"],
  ] as const;

  it.each(scenarioCases)(
    "matches the %s scenario regression values",
    (scenario, seats, discount, annual, workspaceAttainment, geminiAttainment) => {
      const result = calculateQuote(SCENARIO_FIXTURE_INPUTS[scenario]);

      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;

      expect(result.gemini?.seats ?? 0).toBe(Number(seats));
      expect(result.gemini?.totalDiscountPercent ?? null).toBe(discount);
      expect(result.averageCustomerAnnualPrice).toBe(annual);
      expect(result.workspaceAttainmentAnnual).toBe(workspaceAttainment);
      expect(result.geminiAttainmentAnnual).toBe(geminiAttainment);
    },
  );

  it("does not round partner unit prices before multiplying by seats", () => {
    const result = calculateQuote(GOLDEN_FIXTURE_INPUT);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.gemini?.partnerUnitPrice).toBe("10.09");
    expect(result.gemini?.partnerUnitPriceExact).toBe("10.092");
    expect(result.gemini?.partnerMonthly).toBe("1110.12");
  });

  it("uses a requested seat count as the 100% Gemini anchor", () => {
    const result = calculateQuote({
      ...GOLDEN_FIXTURE_INPUT,
      gemini: {
        ...GOLDEN_FIXTURE_INPUT.gemini!,
        requestedSeats: 80,
      },
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.gemini?.seats).toBe(80);
  });

  it("reports discounts above provisional approval caps without blocking the quote", () => {
    const result = calculateQuote(GOLDEN_FIXTURE_INPUT);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.discountWarnings).toContainEqual({
      area: "workspace",
      sku: "business-standard",
      year: 1,
      discount: "60.00",
      maximum: "50.00",
    });
  });

  it("applies the new-customer rebate only when both eligibility conditions are met", () => {
    const result = calculateQuote({
      ...GOLDEN_FIXTURE_INPUT,
      newBusiness: false,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.rebates.newCustomer).toBe("0.00");
    expect(result.rebates.geminiDeal).toBe("-1332.14");
  });
});
