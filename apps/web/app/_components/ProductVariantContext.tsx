"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ProductVariantDTO } from "@onwei/core";

// Seed data only ever puts "size" and "color" keys in a variant's
// attributes JSON (see packages/database/prisma/seed.ts) — this reads
// those two specifically rather than rendering an arbitrary attribute list.
export function uniqueValues(
  variants: ProductVariantDTO[],
  key: string,
): string[] {
  const seen = new Set<string>();
  for (const variant of variants) {
    const value = variant.attributes[key];
    if (value) seen.add(value);
  }
  return [...seen];
}

interface ProductVariantContextValue {
  colors: string[];
  sizes: string[];
  selectedColor: string | undefined;
  selectedSize: string | undefined;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: string) => void;
  // A product with an ACTIVE status always has at least one ACTIVE variant
  // in practice (see packages/database/prisma/seed.ts and
  // getActiveProductBySlug's query) — that's what makes the fallback here
  // safe, not the schema itself.
  selectedVariant: ProductVariantDTO;
  // Keyed by variant id, formatted server-side (page.tsx) with
  // formatCurrency. `@onwei/core` has no subpath exports, so importing
  // formatCurrency as a value here would pull its whole barrel — including
  // Prisma-backed modules — into the client bundle; passing pre-formatted
  // strings down avoids that entirely.
  formattedPrices: Record<string, string>;
}

const ProductVariantContext = createContext<ProductVariantContextValue | null>(
  null,
);

// Shared selection state between the price display (next to the product
// name, top of the info panel) and the color/size picker (further down) —
// they're not adjacent in the DOM, so the price can't just read the
// picker's local state. One provider wraps both.
export function ProductVariantProvider({
  variants,
  formattedPrices,
  children,
}: {
  variants: ProductVariantDTO[];
  formattedPrices: Record<string, string>;
  children: React.ReactNode;
}) {
  const colors = useMemo(() => uniqueValues(variants, "color"), [variants]);
  const sizes = useMemo(() => uniqueValues(variants, "size"), [variants]);

  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedSize, setSelectedSize] = useState(sizes[0]);

  const selectedVariant =
    variants.find(
      (variant) =>
        (colors.length === 0 || variant.attributes.color === selectedColor) &&
        (sizes.length === 0 || variant.attributes.size === selectedSize),
    ) ?? variants[0]!;

  return (
    <ProductVariantContext.Provider
      value={{
        colors,
        sizes,
        selectedColor,
        selectedSize,
        setSelectedColor,
        setSelectedSize,
        selectedVariant,
        formattedPrices,
      }}
    >
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  const context = useContext(ProductVariantContext);
  if (!context) {
    throw new Error(
      "useProductVariant must be used within a ProductVariantProvider",
    );
  }
  return context;
}
