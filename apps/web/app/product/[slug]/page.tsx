import { notFound } from "next/navigation";
import {
  getActiveProductBySlug,
  formatCurrency,
  listSurfaceReviews,
  summarizeReviews,
  listRelatedProducts,
  listComparableProducts,
  listFaqs,
  listInstagramPhotos,
  listMarqueeItems,
  listValueProps,
} from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductVariantPicker } from "@/_components/ProductVariantPicker";
import { Accordion, AccordionItem } from "@/_components/Accordion";
import { PlayCharacteristics } from "@/_components/PlayCharacteristics";
import { StarRow } from "@/_components/StarRow";
import { MarqueeBar } from "@/_components/MarqueeBar";
import { ValueProps } from "@/_components/ValueProps";
import { ComparisonTable } from "@/_components/ComparisonTable";
import { ReviewWall } from "@/_components/ReviewWall";
import { RelatedProducts } from "@/_components/RelatedProducts";
import { FaqSection } from "@/_components/FaqSection";
import { InstagramGrid } from "@/_components/InstagramGrid";
import { AskMeWidget } from "@/_components/AskMeWidget";
import { ProductGallery } from "@/_components/ProductGallery";
import { ProductVariantProvider } from "@/_components/ProductVariantContext";
import { VariantPrice } from "@/_components/VariantPrice";

// Built from Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame 759:2979 "PDP_draft
// 2", node 759:3025 "INFO.", plus the mobile info-panel mockup at node
// 759:3410 "Product info"). All sections below the gallery/info panel are
// now built and DB-backed: comparison table (759:3121), review wall
// (759:3207), related products (759:3267), FAQ accordion (759:3281) — see
// each component's own file for the specific node and what was adapted vs.
// literal Figma copy. Two adaptations from the literal info-panel frames,
// noted rather than silent: (1) desktop's own ACCORDIONS node only groups
// content into DESCRIPTION/MATERIALS & CARE/SHIPPING — "who this is for"
// and "care" share the "Materials & care" item to match that 3-item list,
// rather than the mobile mockup's separate 5-item breakdown; (2) "Shipping
// & Returns" is static shared copy (it read as generic store policy in
// Figma, not product-specific), not a per-product field.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const [
    reviews,
    relatedProducts,
    comparableSiblings,
    faqs,
    marqueeItems,
    valueProps,
    instagramPhotos,
  ] = await Promise.all([
    listSurfaceReviews({ surface: "PRODUCT_WALL", productId: product.id }),
    listRelatedProducts(product.id, 4),
    listComparableProducts(product.id, 2),
    listFaqs(product.id),
    listMarqueeItems("PDP"),
    listValueProps(),
    listInstagramPhotos(),
  ]);

  const reviewSummary = summarizeReviews(reviews);
  const leadImage = product.images[0] ?? null;
  const formattedPrices = Object.fromEntries(
    product.variants.map((variant) => [
      variant.id,
      formatCurrency(variant.priceMinorUnits, "INR"),
    ]),
  );

  const comparisonProducts =
    comparableSiblings.length > 0
      ? [
          {
            slug: product.slug,
            name: product.name,
            priceMinorUnits: product.variants[0]?.priceMinorUnits ?? 0,
            imageUrl: leadImage?.url ?? null,
            specs: product.specs,
          },
          ...comparableSiblings,
        ]
      : [];

  const materialsAndCare = [product.whoThisIsFor, product.careInstructions]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return (
    <main>
      <SiteHeader />

      <section className="flex flex-col items-center bg-onwei-green px-6 py-14 sm:px-14">
        <div className="flex w-full max-w-[1440px] flex-col gap-8 lg:flex-row lg:items-start">
          <ProductGallery images={product.images} productName={product.name} />

          <ProductVariantProvider
            variants={product.variants}
            formattedPrices={formattedPrices}
          >
            <div className="flex w-full flex-col items-start gap-3 rounded-[30px] bg-onwei-white px-6 py-8 sm:px-8 sm:py-12 lg:flex-1">
              {reviewSummary.count > 0 ? (
                <div className="flex items-center gap-2">
                  <StarRow
                    count={Math.round(reviewSummary.average)}
                    size={14}
                    tone="dark"
                  />
                  <span className="font-grotesk text-[12px] text-onwei-blue">
                    ({reviewSummary.count})
                  </span>
                </div>
              ) : null}

              <div className="flex w-full items-center justify-between gap-4">
                <p className="font-display text-[32px] font-bold uppercase leading-none text-onwei-blue sm:text-[40px]">
                  {product.name}
                </p>
                <VariantPrice />
              </div>

              {product.highlightTags.length > 0 ? (
                <p className="font-grotesk text-[12px] uppercase text-onwei-blue">
                  {product.highlightTags.join(" ⬥ ")}
                </p>
              ) : null}

              <ProductVariantPicker />

              {product.playCharacteristics ? (
                <PlayCharacteristics
                  characteristics={product.playCharacteristics}
                />
              ) : null}

              <Accordion>
                {product.description ? (
                  <AccordionItem title="Description" defaultOpen>
                    <p className="whitespace-pre-line">{product.description}</p>
                  </AccordionItem>
                ) : null}

                {product.specs.length > 0 ? (
                  <AccordionItem title="Specs">
                    <div className="flex flex-col gap-3">
                      {product.specs.map((spec, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-4"
                        >
                          <p className="font-semibold">{spec.label}</p>
                          <p className="text-right">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionItem>
                ) : null}

                {materialsAndCare ? (
                  <AccordionItem title="Materials & care">
                    <p className="whitespace-pre-line">{materialsAndCare}</p>
                  </AccordionItem>
                ) : null}

                <AccordionItem title="Shipping & returns">
                  <p>
                    We offer standard shipping on all orders. Once your order is
                    handed over to the carrier, delivery typically takes 1-3
                    business days.
                  </p>
                  <p className="mt-3 font-semibold">Returns</p>
                  <p>
                    If you&apos;d like to return or exchange an item, contact
                    our support team and we&apos;ll guide you through the return
                    process. Once the returned item is received and inspected,
                    your refund will be processed.
                  </p>
                </AccordionItem>
              </Accordion>

              <AskMeWidget faqs={faqs} />
            </div>
          </ProductVariantProvider>
        </div>

        <div className="mt-14 w-full max-w-[1440px]">
          <MarqueeBar items={marqueeItems} />
        </div>
      </section>

      <section className="flex flex-col items-center bg-onwei-green px-3 pb-24 sm:px-6 lg:px-14">
        <div className="flex w-full max-w-[1440px] flex-col gap-6 sm:flex-row">
          <ValueProps items={valueProps} />
        </div>
      </section>

      <ComparisonTable products={comparisonProducts} />

      <ReviewWall
        reviews={reviews}
        heading="What athletes are saying"
        shareLabel="Share your On wei routine and get rewarded"
      />

      <RelatedProducts products={relatedProducts} />

      <FaqSection faqs={faqs} />

      <InstagramGrid photos={instagramPhotos} />

      <SiteFooter />
    </main>
  );
}
