import Image from "next/image";
import { formatCurrency } from "@onwei/core";
import type { ComparisonProduct } from "@onwei/core";
import { CtaLink } from "./CtaLink";

// Figma PDP (frame "PDP_draft 2", node 759:3121 "Table" / "pick what fits
// you") compares the current product against up to two others side by side.
// The third column in Figma was left as literal "Lorem ipsum" placeholders
// — real sibling products (from `listRelatedProducts`) fill that column
// here instead. Rows are the union of every product's spec labels, in the
// order the first product that has that label lists it, so a spec unique
// to one product still gets its own row rather than being dropped.
export function ComparisonTable({
  products,
}: {
  products: ComparisonProduct[];
}) {
  if (products.length < 2) return null;

  const rowLabels: string[] = [];
  for (const product of products) {
    for (const spec of product.specs) {
      if (!rowLabels.includes(spec.label)) rowLabels.push(spec.label);
    }
  }
  if (rowLabels.length === 0) return null;

  return (
    <section className="flex flex-col items-center gap-8 bg-onwei-green px-3 py-14 sm:px-6 lg:px-14">
      {/* Figma (Frame 2085661702) only shares this row's width with the
          heading — the spec-label rows below live in a separate sibling
          frame and get the full row width to themselves. Splitting into two
          blocks (rather than one shared flex row) keeps that budget: nesting
          the per-row 359px label inside a row that also reserves 299px+gap
          for the heading made every row wider than its available space,
          forcing horizontal scroll and clipping the third column even on
          desktop. */}
      <div className="flex w-full max-w-[1440px] flex-col gap-10 lg:flex-row">
        <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue lg:max-w-[299px]">
          pick what fits you
        </p>

        <div className="w-full overflow-x-auto">
          <div className="flex min-w-[720px] gap-6">
            {products.map((product) => (
              <div
                key={product.slug}
                className="flex w-[307px] shrink-0 flex-col items-center gap-4"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-onwei-white">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="307px"
                      className="object-contain p-6"
                    />
                  ) : null}
                </div>
                <div className="flex w-full items-center justify-between">
                  <p className="font-display text-[16px] font-semibold uppercase text-onwei-blue">
                    {product.name}
                  </p>
                  <p className="font-grotesk text-[14px] text-onwei-blue">
                    {formatCurrency(product.priceMinorUnits, "INR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1440px] overflow-x-auto">
        <div className="flex min-w-[1049px] flex-col divide-y divide-onwei-blue/20">
          {rowLabels.map((label) => (
            <div key={label} className="flex items-center gap-6 py-4">
              <p className="w-[359px] shrink-0 font-display text-[14px] font-semibold uppercase text-onwei-blue">
                {label}
              </p>
              {products.map((product) => {
                const value = product.specs.find(
                  (spec) => spec.label === label,
                )?.value;
                return (
                  <p
                    key={product.slug}
                    className="w-[307px] shrink-0 font-grotesk text-[14px] text-onwei-blue"
                  >
                    {value ?? "—"}
                  </p>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-8 flex min-w-[1049px] gap-6">
          <div className="w-[359px] shrink-0" aria-hidden />
          {products.map((product) => (
            <CtaLink
              key={product.slug}
              href={`/product/${product.slug}`}
              className="w-[307px] bg-onwei-blue text-onwei-beige"
            >
              Add to cart
            </CtaLink>
          ))}
        </div>
      </div>
    </section>
  );
}
