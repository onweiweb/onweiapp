import type { ArticleDetail, FaqItem, ProductDetail } from "@onwei/core";
import { SITE_URL } from "./siteUrl";

/** Sitewide, rendered once from app/layout.tsx. No `potentialAction`
 * SearchAction, no real site-search route exists to point it at. */
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Onwei",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Onwei",
    url: SITE_URL,
  };
}

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

export function buildBreadcrumbJsonLd(entries: BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: `${SITE_URL}${entry.path}`,
    })),
  };
}

/** AggregateOffer across variants, not a single Offer, the PDP shows a
 * variant picker, so a single price would misrepresent a product whose
 * variants span a price range. */
export function buildProductJsonLd(product: ProductDetail) {
  const prices = product.variants.map((v) => v.priceMinorUnits / 100);
  const inStock = product.variants.some((v) => v.inStock);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((image) => image.url),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: prices.length > 0 ? Math.min(...prices) : undefined,
      highPrice: prices.length > 0 ? Math.max(...prices) : undefined,
      offerCount: product.variants.length,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function buildArticleJsonLd(article: ArticleDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.coverImageUrl ?? undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
  };
}

export function buildFaqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
