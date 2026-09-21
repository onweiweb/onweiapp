/**
 * Formats a minor-unit integer amount (e.g. paise) as a currency string.
 * Amounts are always handled as integers in the smallest unit to avoid
 * floating-point rounding errors in prices and totals.
 */
export function formatCurrency(
  amountInMinorUnits: number,
  currency: "INR" = "INR",
  locale = "en-IN",
): string {
  const amount = amountInMinorUnits / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
