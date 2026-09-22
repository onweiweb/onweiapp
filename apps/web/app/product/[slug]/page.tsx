import Image from "next/image";
import { notFound } from "next/navigation";
import { getActiveProductBySlug, formatCurrency } from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { ProductVariantPicker } from "@/_components/ProductVariantPicker";

// Built from Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame 759:2979 "PDP_draft
// 2", node 759:3025 "INFO."). Scoped per the Phase 1 plan to gallery, title/
// price, variant picker, a disabled Add to Cart (cart is Phase 2), and the
// description accordion. The Figma frame also has a power/spin/control
// slider widget, Materials & Care / Shipping accordions, an FAQ chat
// widget, a spec comparison table, a review wall, and a "you may also
// like" grid — none of those have real data behind them yet (no review
// system, no per-product spec/FAQ fields in the schema), so they're left
// out rather than filled with invented copy.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const leadImage = product.images[0] ?? null;
  const thumbnails = product.images.slice(1, 4);
  const displayPrice = formatCurrency(
    product.variants[0]?.priceMinorUnits ?? 0,
    "INR",
  );

  return (
    <main>
      <SiteHeader />

      <section className="flex flex-col items-center bg-onwei-green px-6 py-14 sm:px-14">
        <div className="flex w-full max-w-[1440px] flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex w-full gap-4 lg:w-auto">
            {thumbnails.length > 0 ? (
              <div className="hidden w-[202px] flex-col gap-4 sm:flex">
                {thumbnails.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square w-full overflow-hidden rounded-[20px]"
                  >
                    <Image
                      src={image.url}
                      alt={image.altText ?? product.name}
                      fill
                      sizes="202px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="relative aspect-square w-full overflow-hidden rounded-[30px] border border-onwei-blue bg-onwei-green lg:h-[707px] lg:w-[636px]">
              {leadImage ? (
                <Image
                  src={leadImage.url}
                  alt={leadImage.altText ?? product.name}
                  fill
                  sizes="(min-width: 1024px) 636px, 100vw"
                  className="object-contain p-10"
                />
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-3 rounded-[30px] bg-onwei-white px-6 py-8 sm:px-8 sm:py-12 lg:flex-1">
            <div className="flex w-full items-center justify-between gap-4">
              <p className="font-display text-[32px] font-bold uppercase leading-none text-onwei-blue sm:text-[40px]">
                {product.name}
              </p>
              <p className="font-display text-[20px] font-medium text-onwei-blue">
                {displayPrice}
              </p>
            </div>

            <ProductVariantPicker variants={product.variants} />
          </div>
        </div>
      </section>

      {product.description ? (
        <section className="flex flex-col items-center bg-onwei-white px-6 py-14 sm:px-14">
          <div className="flex w-full max-w-[900px] flex-col gap-4">
            <p className="font-display text-[16px] font-medium uppercase tracking-[-0.16px] text-onwei-blue">
              Description
            </p>
            <p className="whitespace-pre-line font-grotesk text-[14px] text-onwei-blue">
              {product.description}
            </p>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
