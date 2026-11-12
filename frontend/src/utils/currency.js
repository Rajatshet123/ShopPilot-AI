export const INR_PER_USD = 85;

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? inrFormatter.format(amount) : "₹0";
}

export function formatUSD(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? usdFormatter.format(amount) : "$0.00";
}

export function usdFromInr(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount / INR_PER_USD) * 100) / 100 : 0;
}
