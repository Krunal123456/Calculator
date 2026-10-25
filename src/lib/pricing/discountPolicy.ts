export const SCENARIO_IDS = [
  "attach-100",
  "attach-50",
  "attach-25",
  "no-gemini",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type ProvisionalScenarioPolicy = {
  approval: "provisional";
  attachRate: string;
  workspaceDiscounts: readonly [string, string, string];
  workspaceMaxApproved: string;
  googlerDiscount: string | null;
  geminiMaxApproved: string | null;
};

export const PROVISIONAL_SCENARIO_POLICIES: Record<
  ScenarioId,
  ProvisionalScenarioPolicy
> = {
  "attach-100": {
    approval: "provisional",
    attachRate: "1",
    workspaceDiscounts: ["60", "50", "40"],
    workspaceMaxApproved: "50",
    googlerDiscount: "35",
    geminiMaxApproved: "35",
  },
  "attach-50": {
    approval: "provisional",
    attachRate: "0.5",
    workspaceDiscounts: ["49", "49", "49"],
    workspaceMaxApproved: "50",
    googlerDiscount: "34.25",
    geminiMaxApproved: "35",
  },
  "attach-25": {
    approval: "provisional",
    attachRate: "0.25",
    workspaceDiscounts: ["42.5", "42.5", "42.5"],
    workspaceMaxApproved: "50",
    googlerDiscount: "15.25",
    geminiMaxApproved: "18",
  },
  "no-gemini": {
    approval: "provisional",
    attachRate: "0",
    workspaceDiscounts: ["17.5", "17.5", "17.5"],
    workspaceMaxApproved: "25",
    googlerDiscount: null,
    geminiMaxApproved: null,
  },
};

export function getProvisionalScenarioPolicy(
  scenarioId: string,
): ProvisionalScenarioPolicy | null {
  const matchingId = SCENARIO_IDS.find((id) => id === scenarioId);
  return matchingId ? PROVISIONAL_SCENARIO_POLICIES[matchingId] : null;
}
