import type { PricingInput } from "./index";
import {
  getProvisionalScenarioPolicy,
  type ScenarioId,
} from "./discountPolicy";

const baseWorkspaceLines: PricingInput["workspaceLines"] = [
  {
    sku: "business-standard",
    seats: 100,
    listPrice: "14.00",
    discounts: ["60", "50", "40"],
    partnerDiscount: "20",
    workspaceMaxApproved: "50",
  },
  {
    sku: "business-starter",
    seats: 10,
    listPrice: "7.00",
    discounts: ["60", "50", "40"],
    partnerDiscount: "20",
    workspaceMaxApproved: "50",
  },
];

export const GOLDEN_FIXTURE_INPUT: PricingInput = {
  termYears: 3,
  newBusiness: true,
  isResold: true,
  workspaceLines: baseWorkspaceLines,
  gemini: {
    sku: "gemini-business",
    listPrice: "21.00",
    attachRate: "1",
    bundleDiscount: "15",
    googlerDiscount: "35",
    partnerDiscount: "13",
    geminiMaxApproved: "35",
  },
  rebates: {
    approval: "provisional",
    newCustomerPercent: "10",
    minimumWorkspaceSeats: 100,
    geminiDealPercent: "10",
  },
};

function createScenarioInput(scenarioId: ScenarioId): PricingInput {
  const policy = getProvisionalScenarioPolicy(scenarioId);

  if (!policy) {
    throw new Error(`Missing provisional scenario fixture: ${scenarioId}`);
  }

  return {
    ...GOLDEN_FIXTURE_INPUT,
    workspaceLines: baseWorkspaceLines.map((line) => ({
      ...line,
      discounts: policy.workspaceDiscounts,
      workspaceMaxApproved: policy.workspaceMaxApproved,
    })),
    gemini:
      policy.googlerDiscount === null
        ? null
        : {
            sku: "gemini-business",
            listPrice: "21.00",
            attachRate: policy.attachRate,
            bundleDiscount: "15",
            googlerDiscount: policy.googlerDiscount,
            partnerDiscount: "13",
            geminiMaxApproved: policy.geminiMaxApproved,
          },
  };
}

export const SCENARIO_FIXTURE_INPUTS: Record<ScenarioId, PricingInput> = {
  "attach-100": createScenarioInput("attach-100"),
  "attach-50": createScenarioInput("attach-50"),
  "attach-25": createScenarioInput("attach-25"),
  "no-gemini": createScenarioInput("no-gemini"),
};
