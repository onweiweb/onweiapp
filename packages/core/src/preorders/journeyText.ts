import type { InsiderStackMode } from "../insiders/insiderTiers";

/**
 * What Insiders get in a pre-order tier: "15% + 5% = 20% off" when the
 * Insider discount adds on top, or the bigger one when only one counts.
 * Pure and browser-safe (exported as "@onwei/core/preorder-text"), so the
 * admin Pre-order journey table can show it as staff type.
 */
export function insiderExtraText(
  tierPercent: number,
  insiderPercent: number,
  mode: InsiderStackMode,
): string {
  if (insiderPercent <= 0) return `${tierPercent}% off`;
  if (mode === "ADD") {
    return `${tierPercent}% + ${insiderPercent}% = ${tierPercent + insiderPercent}% off`;
  }
  return insiderPercent > tierPercent
    ? `${insiderPercent}% off (Insider discount is bigger)`
    : `${tierPercent}% off (tier discount is bigger)`;
}
