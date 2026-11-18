import { mapAttributes } from "../catalog/mapProduct";

/** "M / Navy" from a variant's attributes. */
export function variantLabelOf(attributes: unknown): string {
  return Object.values(mapAttributes(attributes)).join(" / ");
}
