"use client";

import { useProductVariant } from "./ProductVariantContext";

export function VariantPrice() {
  const { selectedVariant, formattedPrices } = useProductVariant();
  return (
    <p className="font-display text-[1.25rem] font-medium text-onwei-blue">
      {formattedPrices[selectedVariant.id]}
    </p>
  );
}
