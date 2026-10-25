"use client";

import { FormEvent, useState } from "react";
import {
  calculateCustomerPrice,
  CustomerPriceResult,
} from "@/lib/pricing";

type FormValues = {
  listPrice: string;
  discountPercent: string;
  seats: string;
};

const INITIAL_VALUES: FormValues = {
  listPrice: "",
  discountPercent: "",
  seats: "",
};

export default function Home() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [result, setResult] = useState<CustomerPriceResult | null>(null);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError("");

    if (
      !values.listPrice.trim() ||
      !values.discountPercent.trim() ||
      !values.seats.trim()
    ) {
      setError("Enter a list price, discount, and seat count to calculate.");
      return;
    }

    if (!/^\d+$/.test(values.seats)) {
      setError("Seat count must be a positive whole number.");
      return;
    }

    const priceResult = calculateCustomerPrice({
      listPrice: values.listPrice,
      discountPercent: values.discountPercent,
      seats: Number(values.seats),
    });

    if (priceResult.status === "error") {
      setError(priceResult.message);
      return;
    }

    setResult(priceResult);
  }

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
    setResult(null);
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">WORKSPACE + GEMINI</div>
        <div className="topbar-note">Investment proposal calculator</div>
      </header>
      <main className="main">
        <p className="eyebrow">Transparent pricing, built on exact inputs</p>
        <h1>Plan an investment with confidence.</h1>
        <p className="intro">
          Start with a simple per-seat estimate. Enter your own list price and
          discount to see the customer price calculated with precise decimal
          arithmetic.
        </p>

        <section className="calculator-card" aria-labelledby="calculator-title">
          <div>
            <h2 className="card-heading" id="calculator-title">
              Try a per-seat calculation
            </h2>
            <p className="card-copy">
              Use values from your own approved price source.
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="list-price">List price per seat (USD)</label>
                  <input
                    id="list-price"
                    name="listPrice"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values.listPrice}
                    onChange={(event) =>
                      updateField("listPrice", event.currentTarget.value)
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "calculator-error" : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="discount">Discount (%)</label>
                  <input
                    id="discount"
                    name="discountPercent"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values.discountPercent}
                    onChange={(event) =>
                      updateField("discountPercent", event.currentTarget.value)
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "calculator-error" : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="seats">Number of seats</label>
                  <input
                    id="seats"
                    name="seats"
                    inputMode="numeric"
                    autoComplete="off"
                    value={values.seats}
                    onChange={(event) =>
                      updateField("seats", event.currentTarget.value)
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "calculator-error" : undefined}
                  />
                </div>
              </div>
              <button className="submit-button" type="submit">
                Calculate estimate
              </button>
              {error && (
                <p className="error-message" id="calculator-error" role="alert">
                  {error}
                </p>
              )}
            </form>
            <p className="disclaimer">
              This estimate uses only the values you enter. It does not confirm
              catalog prices or commercial policy.
            </p>
          </div>

          <aside className="result-panel" aria-live="polite">
            {result?.status === "ok" ? (
              <>
                <p className="result-label">Customer price per seat</p>
                <p className="result-value">${result.unitPrice}</p>
                <p className="result-detail">
                  ${result.lineTotal} total for {values.seats}{" "}
                  {values.seats === "1" ? "seat" : "seats"}
                </p>
              </>
            ) : (
              <>
                <p className="result-label">Your estimate</p>
                <p className="result-placeholder">
                  Your calculated amount will appear here.
                </p>
              </>
            )}
          </aside>
        </section>
      </main>
    </>
  );
}
