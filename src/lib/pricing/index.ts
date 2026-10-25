import Decimal from "decimal.js";
import type { GeminiSku, WorkspaceSku } from "./catalog";

const PricingDecimal = Decimal.clone({ precision: 256 });
const MAX_INPUT_LENGTH = 128;
const MAX_ABSOLUTE_EXPONENT = 1000;
const DECIMAL_INPUT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

export type CustomerPriceInput = {
  listPrice: string;
  discountPercent: string;
  seats: number;
};

export type CustomerPriceResult =
  | { status: "ok"; unitPrice: string; lineTotal: string }
  | { status: "error"; message: string };

export type PricingTermYears = 1 | 2 | 3;
export type YearlyPercentages = readonly [string, string, string];

export type WorkspacePricingLine = {
  sku: WorkspaceSku;
  seats: number;
  listPrice: string;
  discounts: YearlyPercentages;
  partnerDiscount: string;
  workspaceMaxApproved: string | null;
};

export type GeminiPricingInput = {
  sku: GeminiSku;
  listPrice: string;
  attachRate: string;
  requestedSeats?: number | null;
  bundleDiscount: string;
  googlerDiscount: string;
  partnerDiscount: string;
  geminiMaxApproved: string | null;
};

export type PricingInput = {
  termYears: PricingTermYears;
  newBusiness: boolean;
  isResold: boolean;
  workspaceLines: readonly WorkspacePricingLine[];
  gemini: GeminiPricingInput | null;
  rebates: {
    approval: "provisional";
    newCustomerPercent: string;
    minimumWorkspaceSeats: number;
    geminiDealPercent: string;
  };
};

export type DiscountWarning = {
  area: "workspace" | "gemini";
  sku: WorkspaceSku | GeminiSku;
  year?: number;
  discount: string;
  maximum: string;
};

export type WorkspaceLineResult = {
  sku: WorkspaceSku;
  seats: number;
  averageDiscountPercent: string;
  customerUnitPrices: string[];
  customerLineTotals: string[];
  partnerUnitPrices: string[];
  partnerUnitPricesExact: string[];
  partnerLineTotals: string[];
  averageCustomerMonthly: string;
  averagePartnerMonthly: string;
};

export type QuoteCalculationSuccess = {
  status: "ok";
  termYears: PricingTermYears;
  workspace: {
    seats: number;
    lines: WorkspaceLineResult[];
    averageCustomerMonthly: string;
    averagePartnerMonthly: string;
  };
  gemini: null | {
    sku: GeminiSku;
    seats: number;
    totalDiscountPercent: string;
    customerUnitPrice: string;
    customerMonthly: string;
    partnerUnitPrice: string;
    partnerUnitPriceExact: string;
    partnerMonthly: string;
  };
  customerMonthlyInvestment: string;
  averageCustomerAnnualPrice: string;
  netToGoogleMonthly: string;
  workspaceAttainmentAnnual: string;
  geminiAttainmentAnnual: string;
  rebates: {
    newCustomer: string;
    geminiDeal: string;
    netToGoogleYear1AfterRebates: string;
  };
  discountWarnings: DiscountWarning[];
};

export type QuoteCalculationError = {
  status: "error";
  code: "INVALID_INPUT";
  message: string;
};

export type QuoteCalculationResult =
  | QuoteCalculationSuccess
  | QuoteCalculationError;

function parseDecimalInput(
  value: string,
): InstanceType<typeof PricingDecimal> | null {
  if (value.length > MAX_INPUT_LENGTH || !DECIMAL_INPUT.test(value)) {
    return null;
  }

  const exponent = value.match(/e([+-]?\d+)$/i)?.[1];
  if (exponent && Math.abs(Number(exponent)) > MAX_ABSOLUTE_EXPONENT) {
    return null;
  }

  const parsed = new PricingDecimal(value);
  return parsed.isFinite() ? parsed : null;
}

function isValidPercentage(
  value: InstanceType<typeof PricingDecimal> | null,
): value is InstanceType<typeof PricingDecimal> {
  return Boolean(value && !value.isNegative() && value.lessThanOrEqualTo(100));
}

function formatMoney(value: InstanceType<typeof PricingDecimal>): string {
  return value.toFixed(2);
}

function formatPercent(value: InstanceType<typeof PricingDecimal>): string {
  return value.toFixed(2);
}

function customerUnitPrice(
  listPrice: InstanceType<typeof PricingDecimal>,
  discountPercent: InstanceType<typeof PricingDecimal>,
): InstanceType<typeof PricingDecimal> {
  return listPrice
    .times(new PricingDecimal(1).minus(discountPercent.div(100)))
    .toDecimalPlaces(2, PricingDecimal.ROUND_HALF_DOWN);
}

function invalidQuote(message: string): QuoteCalculationError {
  return { status: "error", code: "INVALID_INPUT", message };
}

export function calculateCustomerPrice(
  input: CustomerPriceInput,
): CustomerPriceResult {
  const listPrice = parseDecimalInput(input.listPrice);
  const discountPercent = parseDecimalInput(input.discountPercent);

  if (!listPrice || !discountPercent) {
    return { status: "error", message: "Enter valid numeric values." };
  }

  if (!listPrice.isPositive() || !Number.isSafeInteger(input.seats) || input.seats <= 0) {
    return { status: "error", message: "Price and seat count must be positive." };
  }
  if (!isValidPercentage(discountPercent)) {
    return { status: "error", message: "Discount must be between 0% and 100%." };
  }

  const unitPrice = customerUnitPrice(listPrice, discountPercent);
  const lineTotal = unitPrice.times(input.seats);

  return {
    status: "ok",
    unitPrice: formatMoney(unitPrice),
    lineTotal: formatMoney(lineTotal),
  };
}

export function calculateQuote(input: PricingInput): QuoteCalculationResult {
  if (![1, 2, 3].includes(input.termYears)) {
    return invalidQuote("Contract term must be 1, 2, or 3 years.");
  }

  if (input.workspaceLines.length === 0) {
    return invalidQuote("At least one Workspace pricing line is required.");
  }

  const newCustomerPercent = parseDecimalInput(input.rebates.newCustomerPercent);
  const geminiDealPercent = parseDecimalInput(input.rebates.geminiDealPercent);
  if (
    !isValidPercentage(newCustomerPercent) ||
    !isValidPercentage(geminiDealPercent) ||
    !Number.isSafeInteger(input.rebates.minimumWorkspaceSeats) ||
    input.rebates.minimumWorkspaceSeats < 0
  ) {
    return invalidQuote("Invalid rebate configuration.");
  }

  let workspaceSeats = 0;
  let workspaceCustomerMonthly = new PricingDecimal(0);
  let workspacePartnerMonthly = new PricingDecimal(0);
  let yearOneWorkspacePartnerMonthly = new PricingDecimal(0);
  const workspaceLineResults: WorkspaceLineResult[] = [];
  const discountWarnings: DiscountWarning[] = [];

  for (const line of input.workspaceLines) {
    if (!Number.isSafeInteger(line.seats) || line.seats <= 0) {
      return invalidQuote("Workspace seat counts must be positive whole numbers.");
    }

    workspaceSeats += line.seats;
    if (!Number.isSafeInteger(workspaceSeats)) {
      return invalidQuote("Combined Workspace seat count is too large.");
    }

    const listPrice = parseDecimalInput(line.listPrice);
    const partnerDiscount = parseDecimalInput(line.partnerDiscount);
    const discounts = line.discounts
      .slice(0, input.termYears)
      .map((discount) => parseDecimalInput(discount));
    const maximum =
      line.workspaceMaxApproved === null
        ? null
        : parseDecimalInput(line.workspaceMaxApproved);

    if (
      !listPrice?.isPositive() ||
      !isValidPercentage(partnerDiscount) ||
      discounts.some((discount) => !isValidPercentage(discount)) ||
      (line.workspaceMaxApproved !== null && !isValidPercentage(maximum))
    ) {
      return invalidQuote(`Invalid pricing input for ${line.sku}.`);
    }

    const customerUnits: InstanceType<typeof PricingDecimal>[] = [];
    const customerTotals: InstanceType<typeof PricingDecimal>[] = [];
    const partnerUnits: InstanceType<typeof PricingDecimal>[] = [];
    const partnerTotals: InstanceType<typeof PricingDecimal>[] = [];
    let discountSum = new PricingDecimal(0);
    const effectivePartnerDiscount = input.isResold
      ? partnerDiscount
      : new PricingDecimal(0);

    for (let year = 0; year < input.termYears; year += 1) {
      const discount = discounts[year];
      if (!discount) {
        return invalidQuote(`Missing year ${year + 1} discount for ${line.sku}.`);
      }

      if (maximum && discount.greaterThan(maximum)) {
        discountWarnings.push({
          area: "workspace",
          sku: line.sku,
          year: year + 1,
          discount: formatPercent(discount),
          maximum: formatPercent(maximum),
        });
      }

      discountSum = discountSum.plus(discount);
      const customerUnit = customerUnitPrice(listPrice, discount);
      const customerTotal = customerUnit.times(line.seats);
      const partnerUnit = customerUnit.times(
        new PricingDecimal(1).minus(effectivePartnerDiscount.div(100)),
      );
      const partnerTotal = customerTotal.times(
        new PricingDecimal(1).minus(effectivePartnerDiscount.div(100)),
      );

      customerUnits.push(customerUnit);
      customerTotals.push(customerTotal);
      partnerUnits.push(partnerUnit);
      partnerTotals.push(partnerTotal);
    }

    const customerAverage = customerTotals
      .reduce((total, amount) => total.plus(amount), new PricingDecimal(0))
      .div(input.termYears);
    const partnerAverage = partnerTotals
      .reduce((total, amount) => total.plus(amount), new PricingDecimal(0))
      .div(input.termYears);

    workspaceCustomerMonthly = workspaceCustomerMonthly.plus(customerAverage);
    workspacePartnerMonthly = workspacePartnerMonthly.plus(partnerAverage);
    yearOneWorkspacePartnerMonthly = yearOneWorkspacePartnerMonthly.plus(partnerTotals[0]);
    workspaceLineResults.push({
      sku: line.sku,
      seats: line.seats,
      averageDiscountPercent: formatPercent(discountSum.div(input.termYears)),
      customerUnitPrices: customerUnits.map(formatMoney),
      customerLineTotals: customerTotals.map(formatMoney),
      partnerUnitPrices: partnerUnits.map(formatMoney),
      partnerUnitPricesExact: partnerUnits.map((amount) => amount.toString()),
      partnerLineTotals: partnerTotals.map(formatMoney),
      averageCustomerMonthly: formatMoney(customerAverage),
      averagePartnerMonthly: formatMoney(partnerAverage),
    });
  }

  let geminiResult: QuoteCalculationSuccess["gemini"] = null;
  let geminiCustomerMonthly = new PricingDecimal(0);
  let geminiPartnerMonthly = new PricingDecimal(0);

  if (input.gemini) {
    const gemini = input.gemini;
    const listPrice = parseDecimalInput(gemini.listPrice);
    const attachRate = parseDecimalInput(gemini.attachRate);
    const bundleDiscount = parseDecimalInput(gemini.bundleDiscount);
    const googlerDiscount = parseDecimalInput(gemini.googlerDiscount);
    const partnerDiscount = parseDecimalInput(gemini.partnerDiscount);
    const maximum =
      gemini.geminiMaxApproved === null
        ? null
        : parseDecimalInput(gemini.geminiMaxApproved);

    if (
      !listPrice?.isPositive() ||
      !attachRate ||
      attachRate.isNegative() ||
      attachRate.greaterThan(1) ||
      !isValidPercentage(bundleDiscount) ||
      !isValidPercentage(googlerDiscount) ||
      !isValidPercentage(partnerDiscount) ||
      (gemini.geminiMaxApproved !== null && !isValidPercentage(maximum)) ||
      (
        gemini.requestedSeats !== undefined &&
        gemini.requestedSeats !== null &&
        (!Number.isSafeInteger(gemini.requestedSeats) || gemini.requestedSeats < 0)
      )
    ) {
      return invalidQuote(`Invalid pricing input for ${gemini.sku}.`);
    }

    if (
      gemini.requestedSeats !== undefined &&
      gemini.requestedSeats !== null &&
      !attachRate.equals(1)
    ) {
      return invalidQuote(
        "Custom Gemini seat-count scaling below 100% remains unresolved.",
      );
    }

    const geminiSeatsDecimal =
      gemini.requestedSeats !== undefined && gemini.requestedSeats !== null
        ? new PricingDecimal(gemini.requestedSeats)
        : attachRate.times(workspaceSeats).ceil();
    const geminiSeats = geminiSeatsDecimal.toNumber();
    if (!Number.isSafeInteger(geminiSeats)) {
      return invalidQuote("Calculated Gemini seat count is too large.");
    }

    const totalDiscountFraction = new PricingDecimal(1).minus(
      new PricingDecimal(1)
        .minus(bundleDiscount.div(100))
        .times(new PricingDecimal(1).minus(googlerDiscount.div(100))),
    );
    const totalDiscountPercent = totalDiscountFraction.times(100);
    const customerUnit = customerUnitPrice(listPrice, totalDiscountPercent);
    const effectivePartnerDiscount = input.isResold
      ? partnerDiscount
      : new PricingDecimal(0);

    geminiCustomerMonthly = customerUnit.times(geminiSeats);
    geminiPartnerMonthly = geminiCustomerMonthly.times(
      new PricingDecimal(1).minus(effectivePartnerDiscount.div(100)),
    );

    if (maximum && googlerDiscount.greaterThan(maximum)) {
      discountWarnings.push({
        area: "gemini",
        sku: gemini.sku,
        discount: formatPercent(googlerDiscount),
        maximum: formatPercent(maximum),
      });
    }

    geminiResult = {
      sku: gemini.sku,
      seats: geminiSeats,
      totalDiscountPercent: formatPercent(totalDiscountPercent),
      customerUnitPrice: formatMoney(customerUnit),
      customerMonthly: formatMoney(geminiCustomerMonthly),
      partnerUnitPrice: formatMoney(
        customerUnit.times(
          new PricingDecimal(1).minus(effectivePartnerDiscount.div(100)),
        ),
      ),
      partnerUnitPriceExact: customerUnit
        .times(new PricingDecimal(1).minus(effectivePartnerDiscount.div(100)))
        .toString(),
      partnerMonthly: formatMoney(geminiPartnerMonthly),
    };
  }

  const customerMonthlyInvestment =
    workspaceCustomerMonthly.plus(geminiCustomerMonthly);
  const netToGoogleMonthly = workspacePartnerMonthly.plus(geminiPartnerMonthly);
  const workspaceAttainmentAnnual = workspacePartnerMonthly.times(12);
  const geminiAttainmentAnnual = geminiPartnerMonthly.times(12);
  const newCustomerRebate =
    input.newBusiness && workspaceSeats >= input.rebates.minimumWorkspaceSeats
      ? yearOneWorkspacePartnerMonthly
          .times(12)
          .times(newCustomerPercent.div(100))
      : new PricingDecimal(0);
  const geminiDealRebate = input.gemini
    ? geminiPartnerMonthly
        .times(12)
        .times(geminiDealPercent.div(100))
    : new PricingDecimal(0);
  const netToGoogleYear1AfterRebates = netToGoogleMonthly
    .times(12)
    .minus(newCustomerRebate)
    .minus(geminiDealRebate);

  return {
    status: "ok",
    termYears: input.termYears,
    workspace: {
      seats: workspaceSeats,
      lines: workspaceLineResults,
      averageCustomerMonthly: formatMoney(workspaceCustomerMonthly),
      averagePartnerMonthly: formatMoney(workspacePartnerMonthly),
    },
    gemini: geminiResult,
    customerMonthlyInvestment: formatMoney(customerMonthlyInvestment),
    averageCustomerAnnualPrice: formatMoney(customerMonthlyInvestment.times(12)),
    netToGoogleMonthly: formatMoney(netToGoogleMonthly),
    workspaceAttainmentAnnual: formatMoney(workspaceAttainmentAnnual),
    geminiAttainmentAnnual: formatMoney(geminiAttainmentAnnual),
    rebates: {
      newCustomer: formatMoney(newCustomerRebate.negated()),
      geminiDeal: formatMoney(geminiDealRebate.negated()),
      netToGoogleYear1AfterRebates: formatMoney(netToGoogleYear1AfterRebates),
    },
    discountWarnings,
  };
}
