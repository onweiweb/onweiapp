/**
 * Formats a minor-unit integer amount (e.g. paise) as a currency string.
 * Amounts are always handled as integers in the smallest unit to avoid
 * floating-point rounding errors in prices and totals.
 */
export function formatCurrency(
  amountInMinorUnits: number,
  currency: "INR" = "INR",
  locale = "en-IN",
  // Storefront prices read "₹1,500", not "₹1,500.00" (Figma), but keep the
  // paise when there are any. Admin keeps the default fixed two decimals.
  options: { dropZeroPaise?: boolean } = {},
): string {
  const amount = amountInMinorUnits / 100;
  const hidePaise =
    options.dropZeroPaise === true && amountInMinorUnits % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: hidePaise ? 0 : 2,
    maximumFractionDigits: hidePaise ? 0 : 2,
  }).format(amount);
}
