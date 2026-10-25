"use client";

import { useMemo, useState, type FormEvent } from "react";
import Decimal from "decimal.js";
import Image from "next/image";
import { calculateCustomerPrice, calculateQuote, type PricingTermYears, type QuoteCalculationSuccess } from "@/lib/pricing";
import { getProvisionalScenarioPolicy, type ScenarioId } from "@/lib/pricing/discountPolicy";
import { CATALOG_CURRENCIES, SKU_CATALOG, lookupCatalogPrice, type CatalogCurrency, type CatalogTerm, type GeminiSku, type WorkspaceSku } from "@/lib/pricing/catalog";

type WorkspaceLine = {
  sku: WorkspaceSku;
  seats: string;
  listPrice: string;
  discounts: [string, string, string];
  partnerDiscount: string;
};
type CurrentWorkspaceLine = {
  sku: WorkspaceSku;
  billingPlan: "flexible" | "fixed-1y";
  seats: string;
  listPrice: string;
  discount: string;
};
type QuoteLanguage = "English" | "French" | "Spanish";
type ScenarioOption = { id: ScenarioId; name: string; attachRate: string };
type ScenarioSettings = Record<ScenarioId, { discounts: [string, string, string]; googlerDiscount: string }>;
const INITIAL_SCENARIOS: ScenarioSettings = {
  "attach-100": { discounts: ["60", "50", "40"], googlerDiscount: "35" },
  "attach-50": { discounts: ["49", "49", "49"], googlerDiscount: "34.25" },
  "attach-25": { discounts: ["42.5", "42.5", "42.5"], googlerDiscount: "15.25" },
  "no-gemini": { discounts: ["17.5", "17.5", "17.5"], googlerDiscount: "0" },
};
const QUOTE_COPY: Record<QuoteLanguage, Record<string, string>> = {
  English: { proposal: "Investment Proposal", estimatedMonthly: "Estimated customer monthly investment", recommendation: "Selected recommendation · itemized pricing", otherOptions: "Other proposed options", selected: "Selected recommendation", current: "Current monthly", proposed: "Proposed monthly average", savings: "Estimated Workspace savings", increase: "Estimated Workspace cost increase", fullProposal: "Full proposal monthly", workspaceOnly: "Workspace only · excludes Gemini", productSeats: "Product and seats", yearlyPricing: "Year-by-year customer pricing", year: "Year", discount: "discount", perSeat: "/ seat / mo", perMonth: "/ month", perYear: "/ year", averageMonthly: "Estimated average customer monthly investment", annualAverage: "annual average", print: "Print Proposal", seats: "seats", list: "List", combinedDiscount: "combined discount", notice: "Example prices and discount policies are prefilled from the supplied screenshots. Confirm commercial approval before sending this estimate. This preview is not saved or shareable yet.", currentVs: "Current deployment vs." },
  French: { proposal: "Proposition d’investissement", estimatedMonthly: "Investissement mensuel estimé du client", recommendation: "Recommandation sélectionnée · détail des prix", otherOptions: "Autres options proposées", selected: "Recommandation sélectionnée", current: "Mensuel actuel", proposed: "Moyenne mensuelle proposée", savings: "Économies Workspace estimées", increase: "Hausse estimée du coût Workspace", fullProposal: "Total mensuel de la proposition", workspaceOnly: "Workspace uniquement · Gemini exclu", productSeats: "Produit et licences", yearlyPricing: "Tarifs client par année", year: "Année", discount: "de remise", perSeat: "/ licence / mois", perMonth: "/ mois", perYear: "/ an", averageMonthly: "Investissement mensuel moyen estimé", annualAverage: "moyenne annuelle", print: "Imprimer la proposition", seats: "licences", list: "Tarif", combinedDiscount: "de remise combinée", notice: "Les prix et remises fournis sont des exemples tirés des captures d’écran. Confirmez les conditions commerciales avant l’envoi. Cet aperçu n’est pas encore enregistré ni partageable.", currentVs: "Déploiement actuel vs." },
  Spanish: { proposal: "Propuesta de inversión", estimatedMonthly: "Inversión mensual estimada del cliente", recommendation: "Recomendación seleccionada · precios detallados", otherOptions: "Otras opciones propuestas", selected: "Recomendación seleccionada", current: "Mensual actual", proposed: "Promedio mensual propuesto", savings: "Ahorro estimado en Workspace", increase: "Aumento estimado del costo de Workspace", fullProposal: "Total mensual de la propuesta", workspaceOnly: "Solo Workspace · Gemini excluido", productSeats: "Producto y licencias", yearlyPricing: "Precios del cliente por año", year: "Año", discount: "de descuento", perSeat: "/ licencia / mes", perMonth: "/ mes", perYear: "/ año", averageMonthly: "Inversión mensual promedio estimada", annualAverage: "promedio anual", print: "Imprimir propuesta", seats: "licencias", list: "Precio", combinedDiscount: "descuento combinado", notice: "Los precios y descuentos proporcionados son ejemplos de las capturas. Confirme las condiciones comerciales antes de enviar esta estimación. Esta vista previa aún no se guarda ni se puede compartir.", currentVs: "Implementación actual vs." },
};
function quoteCopy(language: QuoteLanguage, key: string) { return QUOTE_COPY[language][key] ?? QUOTE_COPY.English[key] ?? key; }
function quoteOptionName(language: QuoteLanguage, option: ScenarioOption) {
  if (language === "French") return option.id === "no-gemini" ? "Sans Gemini Business" : `Gemini Business pour ${option.attachRate} des effectifs`;
  if (language === "Spanish") return option.id === "no-gemini" ? "Sin Gemini Business" : `Gemini Business para el ${option.attachRate} de la plantilla`;
  return option.name;
}

const OPTIONS: ScenarioOption[] = [
  { id: "attach-100", name: "Gemini Business for 100% of your Workforce", attachRate: "100%" },
  { id: "attach-50", name: "Gemini Business for 50% of your Workforce", attachRate: "50%" },
  { id: "attach-25", name: "Gemini Business for 25% of your Workforce", attachRate: "25%" },
  { id: "no-gemini", name: "No Gemini Business", attachRate: "0%" },
];
const WORKSPACE_SKUS = SKU_CATALOG.filter((item) => item.category === "workspace") as { id: WorkspaceSku; label: string }[];
const GEMINI_SKUS = SKU_CATALOG.filter((item) => item.category === "gemini") as { id: GeminiSku; label: string }[];
const USER_GEMINI_PRICE_DEFAULTS: Partial<Record<GeminiSku, string>> = {
  "gemini-enterprise-standard": "30.00",
  "gemini-enterprise-plus": "50.00",
};
const INITIAL_LINES: WorkspaceLine[] = [
  { sku: "business-standard", seats: "100", listPrice: "14.00", discounts: ["60", "50", "40"], partnerDiscount: "20" },
];
const INITIAL_CURRENT_LINES: CurrentWorkspaceLine[] = [
  { sku: "business-standard", billingPlan: "flexible", seats: "100", listPrice: "16.80", discount: "0" },
];

function dollars(value: string | number, currency: CatalogCurrency = "USD", language: QuoteLanguage = "English") {
  const number = Number(value);
  const locale = language === "French" ? "fr-FR" : language === "Spanish" ? "es-ES" : "en-US";
  return Number.isFinite(number) ? new Intl.NumberFormat(locale, { style: "currency", currency }).format(number) : "—";
}

function shownDollars(value?: string | null, currency: CatalogCurrency = "USD", language: QuoteLanguage = "English") {
  return value == null || value === "" ? "—" : dollars(value, currency, language);
}

function acceptNonnegativeNumber(value: string, onChange: (value: string) => void, max = Number.POSITIVE_INFINITY, integer = false) {
  if (value === "") { onChange(""); return; }
  const pattern = integer ? /^\d+$/ : /^(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!pattern.test(value)) return;
  const number = Number(value);
  if (number >= 0 && number <= max) onChange(value);
}

function quotePriceForSku(sku: WorkspaceSku, term: PricingTermYears, currency: CatalogCurrency = "USD"): string {
  // The screenshots show these two fixed prices on the 3-year quote example.
  if (currency === "USD" && term === 3 && sku === "business-standard") return "14.00";
  if (currency === "USD" && term === 3 && sku === "business-starter") return "7.00";
  const catalogTerm: CatalogTerm = term === 1 ? "fixed-1y" : term === 2 ? "fixed-2y" : "fixed-3y";
  const catalogPrice = lookupCatalogPrice(sku, catalogTerm, currency);
  return catalogPrice.status === "known" ? catalogPrice.monthlyPrice : "";
}

function quoteGeminiPriceForSku(sku: GeminiSku, term: PricingTermYears, currency: CatalogCurrency = "USD"): string {
  const suppliedPrice = USER_GEMINI_PRICE_DEFAULTS[sku];
  if (suppliedPrice && currency === "USD") return suppliedPrice;
  if (term === 3 && sku === "gemini-business" && currency === "USD") return "21.00";
  const catalogPrice = lookupCatalogPrice(sku, term === 1 ? "fixed-1y" : term === 2 ? "fixed-2y" : "fixed-3y", currency);
  return catalogPrice.status === "known" ? catalogPrice.monthlyPrice : "";
}

function quoteGeminiPriceStatus(sku: GeminiSku, term: PricingTermYears, currency: CatalogCurrency = "USD"): string {
  const suppliedPrice = USER_GEMINI_PRICE_DEFAULTS[sku];
  if (suppliedPrice && currency === "USD") return `Price supplied for this edition: ${dollars(suppliedPrice, currency)} per seat / month (unconfirmed).`;
  if (term === 3 && sku === "gemini-business" && currency === "USD") return "Example price from the supplied screenshots: $21.00 per seat / month (unconfirmed).";
  const catalogTerm: CatalogTerm = term === 1 ? "fixed-1y" : term === 2 ? "fixed-2y" : "fixed-3y";
  const price = lookupCatalogPrice(sku, catalogTerm, currency);
  return price.status === "known"
    ? `Catalog price: ${dollars(price.monthlyPrice, currency)} per seat / month (unconfirmed).`
    : `No catalog price for this Gemini edition, ${term}-year term, and ${currency}. Enter an approved price.`;
}

function calculateScenario(id: ScenarioId, lines: WorkspaceLine[], term: PricingTermYears, settings: ScenarioSettings, options: { resold: boolean; newBusiness: boolean; geminiSku: GeminiSku; geminiPrice: string; bundleDiscount: string; geminiPartnerDiscount: string; rebate: string; minimumSeats: string; geminiRebate: string }): QuoteCalculationSuccess | null {
  const policy = getProvisionalScenarioPolicy(id);
  if (!policy) return null;
  const scenarioLines = lines.map((line) => ({
    ...line,
    seats: Number(line.seats),
    discounts: settings[id].discounts,
    workspaceMaxApproved: policy.workspaceMaxApproved,
  }));
  const result = calculateQuote({
    termYears: term,
    newBusiness: options.newBusiness,
    isResold: options.resold,
    workspaceLines: scenarioLines,
    gemini: policy.googlerDiscount === null ? null : {
      sku: options.geminiSku,
      listPrice: options.geminiPrice,
      attachRate: policy.attachRate,
      requestedSeats: null,
      bundleDiscount: options.bundleDiscount,
      googlerDiscount: settings[id].googlerDiscount,
      partnerDiscount: options.geminiPartnerDiscount,
      geminiMaxApproved: policy.geminiMaxApproved,
    },
    rebates: {
      approval: "provisional",
      newCustomerPercent: options.rebate,
      minimumWorkspaceSeats: Number(options.minimumSeats),
      geminiDealPercent: options.geminiRebate,
    },
  });
  return result.status === "ok" ? result : null;
}

function PriceField({ label, value, onChange, id, suffix, integer = false }: { label: string; value: string; onChange: (value: string) => void; id: string; suffix?: string; integer?: boolean }) {
  return <label className="wizard-field" htmlFor={id}><span>{label}</span><div className="input-suffix"><input id={id} type="number" min="0" max={suffix === "%" ? 100 : undefined} step={integer ? 1 : "any"} value={value} onChange={(event) => acceptNonnegativeNumber(event.currentTarget.value, onChange, suffix === "%" ? 100 : Number.POSITIVE_INFINITY, integer)} /><em>{suffix}</em></div></label>;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [customerName, setCustomerName] = useState("Acme Inc.");
  const [domain, setDomain] = useState("acme.com");
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState<CatalogCurrency>("USD");
  const [quoteLanguage, setQuoteLanguage] = useState<QuoteLanguage>("English");
  const [currentLines, setCurrentLines] = useState<CurrentWorkspaceLine[]>(INITIAL_CURRENT_LINES);
  const [term, setTerm] = useState<PricingTermYears>(1);
  const [lines, setLines] = useState<WorkspaceLine[]>(INITIAL_LINES);
  const [geminiSku, setGeminiSku] = useState<GeminiSku>("gemini-business");
  const [geminiPrice, setGeminiPrice] = useState("21.00");
  const [bundleDiscount, setBundleDiscount] = useState("15");
  const [geminiPartnerDiscount, setGeminiPartnerDiscount] = useState("13");
  const [resold, setResold] = useState(true);
  const [newBusiness, setNewBusiness] = useState(true);
  const [rebate, setRebate] = useState("10");
  const [minimumSeats, setMinimumSeats] = useState("100");
  const [geminiRebate, setGeminiRebate] = useState("10");
  const [selected, setSelected] = useState<ScenarioId[]>(["attach-100", "attach-50", "attach-25", "no-gemini"]);
  const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettings>(INITIAL_SCENARIOS);
  const [anchor, setAnchor] = useState<ScenarioId>("attach-100");
  const [error, setError] = useState("");

  const scenarioResults = useMemo(() => Object.fromEntries(OPTIONS.map((option) => [option.id, calculateScenario(option.id, lines, term, scenarioSettings, { resold, newBusiness, geminiSku, geminiPrice, bundleDiscount, geminiPartnerDiscount, rebate, minimumSeats, geminiRebate })])) as Record<ScenarioId, QuoteCalculationSuccess | null>, [lines, term, scenarioSettings, resold, newBusiness, geminiSku, geminiPrice, bundleDiscount, geminiPartnerDiscount, rebate, minimumSeats, geminiRebate]);
  const currentCost = useMemo(() => {
    if (currentLines.length === 0) return null;
    let total = new Decimal(0);
    for (const line of currentLines) {
      const result = calculateCustomerPrice({ listPrice: line.listPrice, discountPercent: line.discount, seats: Number(line.seats) });
      if (result.status === "error") return null;
      total = total.plus(result.lineTotal);
    }
    return total;
  }, [currentLines]);
  const currentSeatTotal = currentLines.reduce((sum, line) => sum + (Number(line.seats) || 0), 0);
  function updateScenario(id: ScenarioId, field: "googlerDiscount" | "discounts", value: string, year?: number) {
    setScenarioSettings((current) => {
      if (field === "googlerDiscount") return { ...current, [id]: { ...current[id], googlerDiscount: value } };
      const discounts = [...current[id].discounts] as [string, string, string];
      if (year !== undefined) discounts[year] = value;
      return { ...current, [id]: { ...current[id], discounts } };
    });
  }

  function updateLine(index: number, field: keyof WorkspaceLine, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  }
  function updateCurrentLine(index: number, field: keyof CurrentWorkspaceLine, value: string) {
    setCurrentLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  }
  function updateDiscount(index: number, year: number, value: string) {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const discounts = [...line.discounts] as WorkspaceLine["discounts"];
      discounts[year] = value;
      return { ...line, discounts };
    }));
  }
  function continueFromCustomer(event: FormEvent) {
    event.preventDefault();
    if (!customerName.trim() || !domain.trim() || (accountId !== "" && !/^001[A-Za-z0-9]{15}$/.test(accountId)) || !currentLines.length || currentLines.some((line) => !Number.isSafeInteger(Number(line.seats)) || Number(line.seats) <= 0) || !currentCost) {
      setError("Enter customer name and domain, a valid optional Account ID if provided, and valid current Workspace prices and seats.");
      return;
    }
    setError("");
    setStep(2);
  }
  function continueFromConfiguration(event: FormEvent) {
    event.preventDefault();
    const percentages = [bundleDiscount, geminiPartnerDiscount, rebate, geminiRebate, ...lines.map((line) => line.partnerDiscount), ...Object.values(scenarioSettings).flatMap((settings) => [...settings.discounts, settings.googlerDiscount])];
    const validPercentages = percentages.every((value) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100);
    const validLines = lines.length > 0 && lines.every((line) => Number.isSafeInteger(Number(line.seats)) && Number(line.seats) > 0 && Number.isFinite(Number(line.listPrice)) && Number(line.listPrice) > 0);
    if (!validLines) {
      setError("Enter a positive price and a positive whole-number seat count for every Workspace SKU.");
      return;
    }
    if (!Number.isSafeInteger(Number(minimumSeats)) || Number(minimumSeats) < 0 || !validPercentages) {
      setError("Discounts and rebates must be between 0% and 100%; minimum seats must be a non-negative whole number.");
      return;
    }
    setError("");
    setStep(3);
  }
  function changeTerm(nextTerm: PricingTermYears) {
    setTerm(nextTerm);
    setLines((current) => current.map((line) => ({ ...line, listPrice: quotePriceForSku(line.sku, nextTerm, currency) })));
    setGeminiPrice(quoteGeminiPriceForSku(geminiSku, nextTerm, currency));
  }
  function changeWorkspaceSku(index: number, sku: WorkspaceSku) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, sku, listPrice: quotePriceForSku(sku, term, currency) } : line));
  }
  function changeGeminiSku(sku: GeminiSku) {
    setGeminiSku(sku);
    setGeminiPrice(quoteGeminiPriceForSku(sku, term, currency));
  }
  function changeCurrentSku(index: number, sku: WorkspaceSku) {
    const line = currentLines[index];
    if (!line) return;
    const price = lookupCatalogPrice(sku, line.billingPlan, currency);
    updateCurrentLine(index, "sku", sku);
    updateCurrentLine(index, "listPrice", price.status === "known" ? price.monthlyPrice : "");
  }
  function changeCurrentBillingPlan(index: number, plan: "flexible" | "fixed-1y") {
    const line = currentLines[index];
    if (!line) return;
    const price = lookupCatalogPrice(line.sku, plan, currency);
    updateCurrentLine(index, "billingPlan", plan);
    updateCurrentLine(index, "listPrice", price.status === "known" ? price.monthlyPrice : "");
  }
  function addCurrentSku() {
    const sku: WorkspaceSku = "business-starter";
    const price = lookupCatalogPrice(sku, "flexible", currency);
    setCurrentLines((current) => [...current, { sku, billingPlan: "flexible", seats: "1", listPrice: price.status === "known" ? price.monthlyPrice : "", discount: "0" }]);
  }
  function changeCurrency(nextCurrency: CatalogCurrency) {
    setCurrency(nextCurrency);
    setCurrentLines((current) => current.map((line) => {
      const price = lookupCatalogPrice(line.sku, line.billingPlan, nextCurrency);
      return { ...line, listPrice: price.status === "known" ? price.monthlyPrice : "" };
    }));
    setLines((current) => current.map((line) => ({ ...line, listPrice: quotePriceForSku(line.sku, term, nextCurrency) })));
    setGeminiPrice(quoteGeminiPriceForSku(geminiSku, term, nextCurrency));
  }
  function selectOptions(event: FormEvent) {
    event.preventDefault();
    if (!selected.length) { setError("Select at least one proposal option."); return; }
    if (selected.some((id) => id !== "no-gemini") && (!geminiPrice.trim() || !Number.isFinite(Number(geminiPrice)) || Number(geminiPrice) <= 0)) {
      setError("Enter an approved Gemini list price in Quote Configuration or select only the no-Gemini option.");
      return;
    }
    setError("");
    setStep(4);
  }
  function toggleOption(id: ScenarioId) {
    setError("");
    if (!selected.includes(id)) { setSelected([...selected, id]); return; }
    if (selected.length === 1) { setError("Keep at least one quote option selected."); return; }
    const next = selected.filter((value) => value !== id);
    setSelected(next);
    if (anchor === id) setAnchor(next[0]);
  }

  return <>
    <header className="topbar"><div className="brand"><Image className="marketstar-logo" src="/marketstar-logo.png" alt="MarketStar" width={175} height={24} priority/><span className="brand-divider" aria-hidden="true"/><span className="brand-product">Workspace + Gemini Quote Calculator</span></div><div className="topbar-note">Investment proposal calculator</div></header>
    <main className="wizard-main">
      <div className="wizard-progress" aria-label={`Step ${step} of 5`}>{[1, 2, 3, 4, 5].map((number) => <div className={number === step ? "current" : number < step ? "complete" : ""} key={number}><span>{number < step ? "✓" : number}</span><small>{["Customer Current State", "Quote Type & Configuration", "Select Quote Options", "Adjust Quote", "Proposal Preview"][number - 1]}</small></div>)}</div>

      {step === 1 && <form className="wizard-card" onSubmit={continueFromCustomer}>
        <div className="wizard-title"><p>STEP 1 · CUSTOMER CURRENT STATE</p><h1>Customer Current State</h1><span>Enter customer and current deployment details.</span></div>
        <div className="wizard-content">
          <div className="two-fields"><label className="wizard-field">Customer Name<input value={customerName} onChange={(e) => setCustomerName(e.currentTarget.value)} /></label><label className="wizard-field">Customer Domain<input value={domain} onChange={(e) => setDomain(e.currentTarget.value)} /></label><label className="wizard-field">Currency<select value={currency} onChange={(e) => changeCurrency(e.currentTarget.value as CatalogCurrency)}>{CATALOG_CURRENCIES.map((code) => <option key={code} value={code}>{code}, {new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(1).replace("1.00", "")}</option>)}</select></label><label className="wizard-field">Quote Language<select value={quoteLanguage} onChange={(e) => setQuoteLanguage(e.currentTarget.value as QuoteLanguage)}><option>English</option><option>French</option><option>Spanish</option></select></label></div>
          <div className="form-section-head"><div><h2>Current Workspace deployment</h2><p>Add the customer’s current editions and license counts.</p></div><button className="text-button" type="button" onClick={addCurrentSku}>＋ Add SKU</button></div>
          {currentLines.map((line, index) => {
            const catalogPrice = lookupCatalogPrice(line.sku, line.billingPlan, currency);
            const unitResult = calculateCustomerPrice({ listPrice: line.listPrice, discountPercent: line.discount, seats: 1 });
            return <div className="sku-box" key={index}><div className="sku-fields"><label className="wizard-field">Workspace SKU<select value={line.sku} onChange={(e) => changeCurrentSku(index, e.currentTarget.value as WorkspaceSku)}>{WORKSPACE_SKUS.map((sku) => <option key={sku.id} value={sku.id}>{sku.label}</option>)}</select></label><label className="wizard-field">Billing plan<select value={line.billingPlan} onChange={(e) => changeCurrentBillingPlan(index, e.currentTarget.value as "flexible" | "fixed-1y")}><option value="flexible">Flexible</option><option value="fixed-1y">Fixed term</option></select></label><label className="wizard-field">Licenses<input type="number" min="1" step="1" value={line.seats} onChange={(e) => acceptNonnegativeNumber(e.currentTarget.value, (value) => updateCurrentLine(index, "seats", value), Number.POSITIVE_INFINITY, true)} /></label></div><div className="sku-fields price-fields"><PriceField id={`current-list-price-${index}`} label="List price / month" value={line.listPrice} onChange={(v) => updateCurrentLine(index, "listPrice", v)} suffix={currency}/><PriceField id={`current-discount-${index}`} label="Current discount" value={line.discount} onChange={(v) => updateCurrentLine(index, "discount", v)} suffix="%"/><div className="wizard-field"><span>Current net price / seat</span><div className="value-field">{unitResult.status === "ok" ? dollars(unitResult.unitPrice, currency) : "Enter price"}</div></div>{currentLines.length > 1 && <button className="delete-sku-button" type="button" onClick={() => setCurrentLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} aria-label={`Delete current ${WORKSPACE_SKUS.find((sku) => sku.id === line.sku)?.label ?? "Workspace SKU"}`}>Delete</button>}</div>{catalogPrice.status === "missing" && <small className="catalog-help">No catalog price for this SKU, plan, and currency. Enter the approved current list price above.</small>}</div>;
          })}
          <div className="total-strip"><span>GE Eligible SKUs</span><strong>{currentSeatTotal}</strong></div>
          <div className="gemini-interest"><div className="gemini-interest-heading"><strong>Gemini Interest</strong><small>Select a Gemini edition and enter its approved list price.</small><small className="gemini-price-status" aria-live="polite">{quoteGeminiPriceStatus(geminiSku, term, currency)}</small></div><div className="gemini-edition-picker" role="radiogroup" aria-label="Gemini edition"><span className="picker-label">Gemini edition</span>{GEMINI_SKUS.map((sku) => <label className={geminiSku === sku.id ? "gemini-edition selected" : "gemini-edition"} key={sku.id}><input type="radio" name="gemini-edition" value={sku.id} checked={geminiSku === sku.id} onChange={() => changeGeminiSku(sku.id)} /><span><strong>{sku.label}</strong><small>{quoteGeminiPriceForSku(sku.id, term, currency) ? `${dollars(quoteGeminiPriceForSku(sku.id, term, currency), currency)} / seat / month` : "Enter approved price"}</small></span></label>)}</div><PriceField id="initial-gemini-price" label="Gemini list price / month" value={geminiPrice} onChange={setGeminiPrice} suffix={currency}/></div>
          <label className="wizard-field account-field">Account ID <span className="optional-marker">Optional</span><input inputMode="text" autoCapitalize="off" autoComplete="off" value={accountId} onChange={(e) => setAccountId(e.currentTarget.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 18))} placeholder="001 followed by 15 letters or numbers" maxLength={18} aria-invalid={accountId.length > 0 && !/^001[A-Za-z0-9]{15}$/.test(accountId)} aria-describedby="account-id-help" /><small id="account-id-help">If entered, use exactly 18 alphanumeric characters, starting with 001.</small></label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="wizard-actions end"><button className="primary-button" type="submit">Next: Quote Type <span>→</span></button></div>
        </div>
      </form>}

      {step === 2 && <form className="wizard-card narrow" onSubmit={continueFromConfiguration}>
        <div className="wizard-back"><button type="button" onClick={() => setStep(1)}>←</button><span>Quote Type &amp; Configuration</span></div>
        <div className="wizard-content"><label className="wizard-field">Contract Term<select value={term} onChange={(e) => changeTerm(Number(e.currentTarget.value) as PricingTermYears)}><option value={1}>1 Year</option><option value={2}>2 Years</option><option value={3}>3 Years</option></select></label>
          <div className="form-section-head"><div><h2>Workspace Configuration</h2><p>List prices follow the selected contract term. If a catalog price is missing, enter an approved price.</p></div><button className="text-button" type="button" onClick={() => setLines((current) => [...current, { sku: "business-starter", seats: "1", listPrice: quotePriceForSku("business-starter", term, currency), discounts: ["60", "50", "40"], partnerDiscount: "20" }])}>＋ Add SKU</button></div>
          {lines.map((line, index) => <div className="config-line" key={index}><label className="wizard-field">SKU<select value={line.sku} onChange={(e) => changeWorkspaceSku(index, e.currentTarget.value as WorkspaceSku)}>{WORKSPACE_SKUS.map((sku) => <option key={sku.id} value={sku.id}>{sku.label}</option>)}</select></label><label className="wizard-field">Licenses<input type="number" min="1" value={line.seats} onChange={(e) => acceptNonnegativeNumber(e.currentTarget.value, (value) => updateLine(index, "seats", value), Number.POSITIVE_INFINITY, true)} /></label><PriceField id={`proposal-list-price-${index}`} label="List price / month" value={line.listPrice} onChange={(v) => updateLine(index, "listPrice", v)} suffix={currency}/><PriceField id={`partner-discount-${index}`} label="Partner %" value={line.partnerDiscount} onChange={(v) => updateLine(index, "partnerDiscount", v)} suffix="%"/>{lines.length > 1 && <button className="delete-sku-button" type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} aria-label={`Delete ${WORKSPACE_SKUS.find((sku) => sku.id === line.sku)?.label ?? "Workspace SKU"}`}>Delete</button>}</div>)}
          <div className="form-section-head"><div><h2>Gemini Configuration</h2><p>{GEMINI_SKUS.find((sku) => sku.id === geminiSku)?.label} · List {geminiPrice ? dollars(geminiPrice, currency) : "price needed"}/mo · Max approved 35%</p></div></div>
          <div className="config-line gemini-config"><label className="wizard-field">Gemini edition<select value={geminiSku} onChange={(e) => changeGeminiSku(e.currentTarget.value as GeminiSku)}>{GEMINI_SKUS.map((sku) => <option key={sku.id} value={sku.id}>{sku.label}</option>)}</select></label><PriceField id="quote-gemini-price" label="List price / month" value={geminiPrice} onChange={setGeminiPrice} suffix={currency}/><PriceField id="bundle-discount" label="GWS soft bundle discount" value={bundleDiscount} onChange={setBundleDiscount} suffix="%"/><PriceField id="gemini-partner-discount" label="Gemini partner discount" value={geminiPartnerDiscount} onChange={setGeminiPartnerDiscount} suffix="%"/></div>
          <div className="advanced-config"><label><input type="checkbox" checked={resold} onChange={(e) => setResold(e.currentTarget.checked)}/> Resold through partner</label><label><input type="checkbox" checked={newBusiness} onChange={(e) => setNewBusiness(e.currentTarget.checked)}/> New business</label><details><summary>Rebate assumptions</summary><div className="year-inputs"><PriceField id="rebate" label="New customer rebate" value={rebate} onChange={setRebate} suffix="%"/><PriceField id="minimum-seats" label="Minimum seats" value={minimumSeats} onChange={setMinimumSeats} integer/><PriceField id="gemini-rebate" label="Gemini deal rebate" value={geminiRebate} onChange={setGeminiRebate} suffix="%"/></div></details></div>
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="wizard-actions"><button className="secondary-button" type="button" onClick={() => setStep(1)}>Back</button><button className="primary-button" type="submit">Next: Quote Options <span>→</span></button></div>
        </div>
      </form>}

      {step === 3 && <form className="wizard-card options-card" onSubmit={selectOptions}>
        <div className="wizard-back"><button type="button" onClick={() => setStep(2)}>←</button><span>Select Quote Options</span></div>
        <div className="wizard-content"><p className="intro-copy">Choose which optional quote scenarios to include. Select any combination.</p><div className="option-list">{OPTIONS.map((option) => <label key={option.id} className={`option-row ${selected.includes(option.id) ? "checked" : ""}`}><input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggleOption(option.id)} /><span><strong>{option.name}</strong><small>Optional scenario</small></span></label>)}</div>{error && <p className="error-message" role="alert">{error}</p>}<div className="wizard-actions"><button className="secondary-button" type="button" onClick={() => setStep(2)}>Back</button><button className="primary-button" type="submit">Continue to Adjust Quote</button></div></div>
      </form>}

      {step === 4 && <div className="quote-page"><div className="quote-page-heading"><button className="back-arrow" onClick={() => setStep(3)}>←</button><div><h1>Adjust Quote</h1><p>Select a proposed solution based on Gemini attach rate.</p></div><button className="primary-button" onClick={() => setStep(5)}>Preview Proposal →</button></div><SavingsComparison currentMonthly={currentCost?.toFixed(2) ?? null} result={scenarioResults[anchor]} scenarioName={OPTIONS.find((option) => option.id === anchor)?.name ?? "Selected scenario"} currency={currency} language={quoteLanguage} /><div className="scenario-grid">{OPTIONS.filter((option) => selected.includes(option.id)).map((option) => <ScenarioCard key={option.id} option={option} result={scenarioResults[option.id]} lines={lines} settings={scenarioSettings[option.id]} term={term} geminiPrice={geminiPrice} bundleDiscount={bundleDiscount} currency={currency} anchor={anchor} onAnchor={() => setAnchor(option.id)} onUpdate={(field, value, year) => updateScenario(option.id, field, value, year)} />)}</div></div>}

      {step === 5 && <div className="wizard-card preview-card"><div className="wizard-title"><p>PROPOSAL PREVIEW</p><h1>{quoteCopy(quoteLanguage, "proposal")}</h1><span>{customerName} · {domain} · {term}-year term · {quoteLanguage} · {currency}</span></div><div className="wizard-content"><div className="preview-total"><span>{quoteCopy(quoteLanguage, "estimatedMonthly")}</span><strong>{shownDollars(scenarioResults[anchor]?.customerMonthlyInvestment, currency, quoteLanguage)}</strong><small>{quoteOptionName(quoteLanguage, OPTIONS.find((option) => option.id === anchor)!)}</small></div><SavingsComparison currentMonthly={currentCost?.toFixed(2) ?? null} result={scenarioResults[anchor]} scenarioName={quoteOptionName(quoteLanguage, OPTIONS.find((option) => option.id === anchor)!)} currency={currency} language={quoteLanguage} /><h2>{quoteCopy(quoteLanguage, "recommendation")}</h2>{scenarioResults[anchor] && <DetailedQuote result={scenarioResults[anchor]!} lines={lines} term={term} geminiPrice={geminiPrice} currency={currency} language={quoteLanguage} workspaceDiscounts={scenarioSettings[anchor].discounts} /> }<h2 className="preview-options-heading">{quoteCopy(quoteLanguage, "otherOptions")}</h2>{OPTIONS.filter((option) => selected.includes(option.id)).map((option) => <div className={`preview-option ${anchor === option.id ? "chosen" : ""}`} key={option.id}><div><strong>{quoteOptionName(quoteLanguage, option)}</strong>{anchor === option.id && <span className="anchor-tag">{quoteCopy(quoteLanguage, "selected")}</span>}</div><strong>{shownDollars(scenarioResults[option.id]?.averageCustomerAnnualPrice, currency, quoteLanguage)} {quoteCopy(quoteLanguage, "perYear")}</strong></div>)}<div className="notice-box">{quoteCopy(quoteLanguage, "notice")}</div><div className="wizard-actions"><button className="secondary-button" onClick={() => setStep(4)}>Back to Adjust Quote</button><button className="primary-button" onClick={() => window.print()}>{quoteCopy(quoteLanguage, "print")}</button></div></div></div>}
    </main>
  </>;
}

function ScenarioCard({ option, result, lines, settings, term, geminiPrice, bundleDiscount, currency, anchor, onAnchor, onUpdate }: { option: ScenarioOption; result: QuoteCalculationSuccess | null; lines: WorkspaceLine[]; settings: ScenarioSettings[ScenarioId]; term: PricingTermYears; geminiPrice: string; bundleDiscount: string; currency: CatalogCurrency; anchor: ScenarioId; onAnchor: () => void; onUpdate: (field: "googlerDiscount" | "discounts", value: string, year?: number) => void }) {
  return <article className={`scenario-card ${anchor === option.id ? "anchor-card" : ""}`}>
    <div className="scenario-summary">
      <div><h2>{option.name}</h2>{anchor === option.id && <span className="anchor-tag">⚓ Anchor</span>}</div>
      <strong className="scenario-annual">{shownDollars(result?.averageCustomerAnnualPrice, currency)}</strong><small>Average Customer Annual Price</small>
      <strong>{shownDollars(result?.workspaceAttainmentAnnual, currency)}</strong><small>Est. Workspace Attainment</small>
      <strong>{shownDollars(result?.geminiAttainmentAnnual, currency)}</strong><small>Est. Gemini Attainment</small>
      <button className="anchor-button" onClick={onAnchor}>{anchor === option.id ? "Selected anchor" : "Set as anchor"}</button>
    </div>
    <div className="scenario-detail">
      <h3>WORKSPACE CONFIGURATION</h3>
      {lines.map((line, index) => <div className="scenario-product" key={index}>
        <div className="product-title"><strong>{line.seats}× Google Workspace {WORKSPACE_SKUS.find((sku) => sku.id === line.sku)?.label}</strong><span>List: {shownDollars(line.listPrice, currency)}/mo</span></div>
        <div className="approval">Max Approved: 50%</div>
        <div className="scenario-discounts">{Array.from({ length: term }, (_, year) => <label key={year}>
          <small>YEAR {year + 1} DISCOUNT %</small>
          <input type="number" min="0" max="100" step="any" value={settings.discounts[year]} onChange={(event) => acceptNonnegativeNumber(event.currentTarget.value, (value) => onUpdate("discounts", value, year), 100)} />
          <span className="scenario-price-detail">{shownDollars(result?.workspace.lines[index]?.customerUnitPrices[year], currency)} / seat / mo</span>
          <b>{shownDollars(result?.workspace.lines[index]?.customerLineTotals[year], currency)} / month</b>
          <em>{result ? dollars(new Decimal(result.workspace.lines[index]?.customerLineTotals[year] ?? "0").times(12).toFixed(2), currency) : "—"} / year</em>
        </label>)}</div>
        <div className="average-discount"><span>Average Discount</span><strong>{result?.workspace.lines[index]?.averageDiscountPercent}%</strong></div>
      </div>)}
      {!result && <p className="warning-message">This option cannot be calculated. Check the selected prices and percentage fields.</p>}{result && result.discountWarnings.length > 0 && <p className="warning-message">Discount exceeds the configured approval limit. Approval is required.</p>}
      {option.id !== "no-gemini" && result && <><h3 className="gemini-heading">GEMINI CONFIGURATION</h3><div className="scenario-product gemini-product">
        <div className="product-title"><strong>{result?.gemini?.seats ?? 0}× {GEMINI_SKUS.find((sku) => sku.id === result?.gemini?.sku)?.label}</strong><span>List: {dollars(geminiPrice, currency)}/mo</span></div>
        <div className="approval">Max Approved: 35%</div>
        <div className="scenario-discounts gemini-discounts">
          <label><small>GWS SOFT BUNDLE DISCOUNT %</small><input type="number" value={bundleDiscount} readOnly /></label>
          <label><small>GOOGLER PROVIDED DISCOUNT %</small><input type="number" min="0" max="100" step="any" value={settings.googlerDiscount} onChange={(event) => acceptNonnegativeNumber(event.currentTarget.value, (value) => onUpdate("googlerDiscount", value), 100)} /></label>
        </div>
        <div className="average-discount"><span>Total Discount</span><strong>{result?.gemini?.totalDiscountPercent}%</strong><span>{shownDollars(result?.gemini?.customerUnitPrice, currency)} / seat · {shownDollars(result?.gemini?.customerMonthly, currency)} monthly</span></div>
      </div></>}
    </div>
  </article>;
}

function SavingsComparison({ currentMonthly, result, scenarioName, currency, language }: { currentMonthly: string | null; result: QuoteCalculationSuccess | null | undefined; scenarioName: string; currency: CatalogCurrency; language: QuoteLanguage }) {
  if (!currentMonthly || !result) return <div className="savings-comparison unavailable"><strong>Cost comparison unavailable</strong><span>Enter valid current and proposed prices to compare Workspace costs.</span></div>;
  const current = new Decimal(currentMonthly);
  const proposed = new Decimal(result.workspace.averageCustomerMonthly);
  const change = current.minus(proposed);
  const label = quoteCopy(language, change.isNegative() ? "increase" : "savings");
  return <section className={"savings-comparison " + (change.isNegative() ? "cost-increase" : "cost-savings")} aria-label="Current versus proposed Workspace cost comparison">
    <div className="savings-heading"><div><p>{quoteCopy(language, "workspaceOnly").toUpperCase()}</p><h2>{quoteCopy(language, "currentVs")} {scenarioName}</h2></div><span>{quoteCopy(language, "workspaceOnly")}</span></div>
    <div className="savings-metrics"><div><small>{quoteCopy(language, "current")}</small><strong>{dollars(current.toFixed(2), currency, language)}</strong></div><div><small>{quoteCopy(language, "proposed")}</small><strong>{dollars(proposed.toFixed(2), currency, language)}</strong></div><div className="change-metric"><small>{label}</small><strong>{dollars(change.abs().toFixed(2), currency, language)}<em>/mo</em></strong><span>{dollars(change.abs().times(12).toFixed(2), currency, language)} / year</span></div><div><small>{quoteCopy(language, "fullProposal")}</small><strong>{dollars(result.customerMonthlyInvestment, currency, language)}</strong><span>{quoteCopy(language, "estimatedMonthly")}</span></div></div>
  </section>;
}

function DetailedQuote({ result, lines, term, geminiPrice, currency, language, workspaceDiscounts }: { result: QuoteCalculationSuccess; lines: WorkspaceLine[]; term: PricingTermYears; geminiPrice: string; currency: CatalogCurrency; language: QuoteLanguage; workspaceDiscounts: [string, string, string] }) {
  return <div className="detailed-quote"><div className="detail-table-head"><span>{quoteCopy(language, "productSeats")}</span><span>{quoteCopy(language, "yearlyPricing")}</span></div>{lines.map((line, index) => {
    const calculated = result.workspace.lines[index];
    if (!calculated) return null;
    return <section className="detail-line" key={line.sku + "-" + index}><div className="detail-product"><strong>{WORKSPACE_SKUS.find((sku) => sku.id === line.sku)?.label}</strong><span>{line.seats} {quoteCopy(language, "seats")} · {quoteCopy(language, "list")} {dollars(line.listPrice, currency, language)}{quoteCopy(language, "perSeat")}</span></div><div className="detail-years">{Array.from({ length: term }, (_, year) => <div className="detail-year" key={year}><small>{quoteCopy(language, "year")} {year + 1} · {workspaceDiscounts[year]}% {quoteCopy(language, "discount")}</small><span>{dollars(calculated.customerUnitPrices[year] ?? "0", currency, language)} {quoteCopy(language, "perSeat")}</span><strong>{dollars(calculated.customerLineTotals[year] ?? "0", currency, language)} {quoteCopy(language, "perMonth")}</strong><em>{dollars(new Decimal(calculated.customerLineTotals[year] ?? "0").times(12).toFixed(2), currency, language)} {quoteCopy(language, "perYear")}</em></div>)}</div></section>;
  })}{result.gemini && <section className="detail-line gemini-detail"><div className="detail-product"><strong>{GEMINI_SKUS.find((sku) => sku.id === result.gemini?.sku)?.label}</strong><span>{result.gemini.seats} {quoteCopy(language, "seats")} · {quoteCopy(language, "list")} {dollars(geminiPrice, currency, language)}{quoteCopy(language, "perSeat")}</span></div><div className="detail-years"><div className="detail-year"><small>{result.gemini.totalDiscountPercent}% {quoteCopy(language, "combinedDiscount")}</small><span>{dollars(result.gemini.customerUnitPrice, currency, language)} {quoteCopy(language, "perSeat")}</span><strong>{dollars(result.gemini.customerMonthly, currency, language)} {quoteCopy(language, "perMonth")}</strong><em>{dollars(new Decimal(result.gemini.customerMonthly).times(12).toFixed(2), currency, language)} {quoteCopy(language, "perYear")}</em></div></div></section>}<div className="detail-total"><span>{quoteCopy(language, "averageMonthly")}</span><strong>{dollars(result.customerMonthlyInvestment, currency, language)}</strong><small>{dollars(result.averageCustomerAnnualPrice, currency, language)} {quoteCopy(language, "annualAverage")}</small></div></div>;
}
