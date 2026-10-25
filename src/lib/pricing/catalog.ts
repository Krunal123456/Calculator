export const CATALOG_TERMS = [
  "flexible",
  "fixed-1y",
  "fixed-2y",
  "fixed-3y",
] as const;

export type CatalogTerm = (typeof CATALOG_TERMS)[number];

export const CATALOG_CURRENCIES = ["USD", "EUR", "GBP", "INR"] as const;
export type CatalogCurrency = (typeof CATALOG_CURRENCIES)[number];

export const SKU_CATALOG = [
  {
    id: "business-starter",
    label: "Business Starter",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "business-standard",
    label: "Business Standard",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "business-plus",
    label: "Business Plus",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "enterprise-starter",
    label: "Enterprise Starter",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "enterprise-standard",
    label: "Enterprise Standard",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "enterprise-plus",
    label: "Enterprise Plus",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "frontline-worker-starter",
    label: "Frontline Worker Starter",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "frontline-worker-standard",
    label: "Frontline Worker Standard",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "frontline-worker-plus",
    label: "Frontline Worker Plus",
    category: "workspace",
    enterpriseEligible: true,
  },
  {
    id: "workspace-business-starter-archived-user",
    label: "Workspace Business Starter - Archived User",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "workspace-business-standard-archived-user",
    label: "Workspace Business Standard - Archived User",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "workspace-business-plus-archived-user",
    label: "Workspace Business Plus - Archived User",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "workspace-enterprise-standard-archived-user",
    label: "Workspace Enterprise Standard - Archived User",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "workspace-enterprise-plus-archived-user",
    label: "Workspace Enterprise Plus - Archived User",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "google-voice-starter",
    label: "Google Voice Starter",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "google-voice-standard",
    label: "Google Voice Standard",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "google-voice-plus",
    label: "Google Voice Plus",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "assured-controls-plus",
    label: "Assured Controls Plus",
    category: "workspace",
    enterpriseEligible: false,
  },
  {
    id: "gemini-business",
    label: "Gemini Business",
    category: "gemini",
    enterpriseEligible: false,
  },
  {
    id: "gemini-enterprise-standard",
    label: "Gemini Enterprise Standard",
    category: "gemini",
    enterpriseEligible: false,
  },
  {
    id: "gemini-enterprise-plus",
    label: "Gemini Enterprise Plus",
    category: "gemini",
    enterpriseEligible: false,
  },
] as const;

export type CatalogSku = (typeof SKU_CATALOG)[number]["id"];
export type WorkspaceSku = Extract<
  (typeof SKU_CATALOG)[number],
  { category: "workspace" }
>["id"];
export type GeminiSku = Extract<
  (typeof SKU_CATALOG)[number],
  { category: "gemini" }
>["id"];

export type KnownCatalogPrice = {
  status: "known";
  monthlyPrice: string;
  provenance: string;
  commercialApproval: "unconfirmed";
};

export type MissingCatalogPrice = {
  status: "missing";
  reason: string;
};

export type CatalogPriceCell = KnownCatalogPrice | MissingCatalogPrice;

export type MissingCatalogLookup = {
  status: "missing";
  code: "MISSING_CATALOG_PRICE";
  sku: CatalogSku;
  skuLabel: string;
  term: CatalogTerm;
  currency: CatalogCurrency;
  message: string;
};

const termLabels: Record<CatalogTerm, string> = {
  flexible: "Flexible",
  "fixed-1y": "fixed 1Y",
  "fixed-2y": "fixed 2Y",
  "fixed-3y": "fixed 3Y",
};

const sourcePrices = new Map<string, KnownCatalogPrice>([
  [
    "business-starter|flexible|USD",
    {
      status: "known",
      monthlyPrice: "8.40",
      provenance: "Supplied in quote-calculator-build-prompt.md:72",
      commercialApproval: "unconfirmed",
    },
  ],
  [
    "business-starter|fixed-1y|USD",
    {
      status: "known",
      monthlyPrice: "7.00",
      provenance: "Supplied in quote-calculator-build-prompt.md:72",
      commercialApproval: "unconfirmed",
    },
  ],
  [
    "business-standard|flexible|USD",
    {
      status: "known",
      monthlyPrice: "16.80",
      provenance: "Supplied in quote-calculator-build-prompt.md:73",
      commercialApproval: "unconfirmed",
    },
  ],
  [
    "business-standard|fixed-1y|USD",
    {
      status: "known",
      monthlyPrice: "14.00",
      provenance: "Supplied in quote-calculator-build-prompt.md:73",
      commercialApproval: "unconfirmed",
    },
  ],
  [
    "business-plus|flexible|USD",
    {
      status: "known",
      monthlyPrice: "26.40",
      provenance: "Supplied in quote-calculator-build-prompt.md:74",
      commercialApproval: "unconfirmed",
    },
  ],
  [
    "business-plus|fixed-1y|USD",
    {
      status: "known",
      monthlyPrice: "22.00",
      provenance: "Supplied in quote-calculator-build-prompt.md:74",
      commercialApproval: "unconfirmed",
    },
  ],
  [
    "gemini-business|fixed-1y|USD",
    {
      status: "known",
      monthlyPrice: "21.00",
      provenance: "Sample supplied in quote-calculator-build-prompt.md:75",
      commercialApproval: "unconfirmed",
    },
  ],
]);

export function catalogCellKey(
  sku: CatalogSku,
  term: CatalogTerm,
  currency: CatalogCurrency,
): string {
  return `${sku}|${term}|${currency}`;
}

function createCatalog(): ReadonlyMap<string, CatalogPriceCell> {
  const cells = new Map<string, CatalogPriceCell>();

  for (const sku of SKU_CATALOG) {
    for (const term of CATALOG_TERMS) {
      for (const currency of CATALOG_CURRENCIES) {
        const key = catalogCellKey(sku.id, term, currency);
        cells.set(
          key,
          sourcePrices.get(key) ?? {
            status: "missing",
            reason: "No exact source-listed price for this SKU, term, and currency.",
          },
        );
      }
    }
  }

  return cells;
}

export const PRICE_CATALOG = createCatalog();

export function lookupCatalogPrice(
  sku: CatalogSku,
  term: CatalogTerm,
  currency: CatalogCurrency,
): CatalogPriceCell | MissingCatalogLookup {
  const cell = PRICE_CATALOG.get(catalogCellKey(sku, term, currency));

  if (cell?.status === "known") {
    return cell;
  }

  const skuLabel = SKU_CATALOG.find((entry) => entry.id === sku)?.label ?? sku;
  return {
    status: "missing",
    code: "MISSING_CATALOG_PRICE",
    sku,
    skuLabel,
    term,
    currency,
    message: `Price missing for ${skuLabel} / ${termLabels[term]} / ${currency}`,
  };
}
