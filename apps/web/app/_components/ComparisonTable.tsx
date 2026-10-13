import Image from "@/_components/ScaledImage";
import { formatCurrency } from "@onwei/core";
import type { ComparisonProduct } from "@onwei/core";
import { CtaLink } from "./CtaLink";

// Figma PDP (frame "PDP_draft 2", node 759:3121 "Table" / "pick what fits
// you") compares the current product against up to two others side by side.
// The third column in Figma was left as literal "Lorem ipsum" placeholders
//, real sibling products (from `listRelatedProducts`) fill that column
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

  // Figma 759:3121: one 359px label column, then up to three 307px product
  // columns with 24px between. The same widths drive the top row (heading and
  // product photos) and the rows below so they line up.
  const COLUMN = "w-[19.1875rem] shrink-0";
  const LABEL_COLUMN = "w-[22.4375rem] shrink-0";

  return (
    <section className="flex flex-col items-center bg-onwei-white px-3 py-14 desk:px-14 desk:py-[4.5rem]">
      <div className="flex w-full max-w-[90rem] flex-col gap-5">
        <div className="flex w-full flex-col gap-10 desk:flex-row desk:gap-[3.75rem]">
          <p className="font-display text-display-md font-bold uppercase leading-[0.9] text-onwei-blue desk:w-[18.6875rem] desk:shrink-0">
            pick what fits you
          </p>

          <div className="w-full overflow-x-auto desk:overflow-visible">
            <div className="flex min-w-[45rem] gap-6">
              {products.map((product) => (
                <div
                  key={product.slug}
                  className={`flex ${COLUMN} flex-col gap-3`}
                >
                  <div className="relative h-[20.2837rem] w-full overflow-hidden rounded-[1.25rem]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="307px"
                        className="object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="flex w-full items-center justify-between px-3">
                    <p className="font-display text-[1.125rem] font-medium uppercase leading-[1.2] text-onwei-blue">
                      {product.name}
                    </p>
                    <p className="font-display text-[length:max(0.75rem,11px)] font-medium text-onwei-blue">
                      {formatCurrency(product.priceMinorUnits, "INR", "en-IN", {
                        dropZeroPaise: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto desk:overflow-visible">
          <div className="flex min-w-[65.5625rem] flex-col">
            {rowLabels.map((label, rowIndex) => (
              <div
                key={label}
                className={`flex items-center gap-6 py-[1.125rem] ${
                  rowIndex % 2 === 0 ? "rounded-[1.875rem] bg-onwei-green" : ""
                }`}
              >
                <div className={`${LABEL_COLUMN} flex justify-center`}>
                  <p className="w-[7.625rem] font-cta text-[length:max(0.75rem,11px)] font-extrabold uppercase text-onwei-blue">
                    {label}
                  </p>
                </div>
                {products.map((product) => {
                  const value = product.specs.find(
                    (spec) => spec.label === label,
                  )?.value;
                  return (
                    <p
                      key={product.slug}
                      className={`${COLUMN} font-grotesk text-body text-onwei-blue`}
                    >
                      {value ?? "-"}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-5 flex min-w-[65.5625rem] gap-6">
            <div className={LABEL_COLUMN} aria-hidden />
            {products.map((product) => (
              <CtaLink
                key={product.slug}
                href={`/product/${product.slug}`}
                className={`${COLUMN} bg-onwei-blue text-onwei-beige`}
              >
                Add to cart
              </CtaLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
