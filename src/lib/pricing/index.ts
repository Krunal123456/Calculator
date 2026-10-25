export type CustomerPriceInput = {
  listPrice: string;
  discountPercent: string;
  seats: number;
};

export type CustomerPriceResult =
  | { status: "ok"; unitPrice: string; lineTotal: string }
  | { status: "error"; message: string };

export function calculateCustomerPrice(
  _input: CustomerPriceInput,
): CustomerPriceResult {
  return { status: "ok", unitPrice: "0.00", lineTotal: "0.00" };
}
