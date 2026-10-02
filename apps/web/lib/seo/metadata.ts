import type {
  ArticleDetail,
  CategorySummary,
  ProductDetail,
} from "@onwei/core";
import type { Metadata } from "next";

const MAX_DESCRIPTION_LENGTH = 155;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function computeProductDescription(product: ProductDetail): string {
  if (product.description) {
    return truncate(product.description, MAX_DESCRIPTION_LENGTH);
  }
  const tags = product.highlightTags.slice(0, 3);
  return tags.length > 0
    ? `Shop ${product.name}, ${tags.join(", ")}, from Onwei.`
    : `Shop ${product.name} from Onwei.`;
}

/** Product.metaTitle/metaDescription override when set, otherwise a
 * computed default from name/description/highlightTags, see
 * docs/OPEN_DECISIONS.md's SEO entry for why overrides exist at all. */
export function buildProductMetadata(product: ProductDetail): Metadata {
  const title = product.metaTitle ?? product.name;
  const description =
    product.metaDescription ?? computeProductDescription(product);
  const leadImage = product.images[0] ?? null;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: leadImage ? [{ url: leadImage.url }] : undefined,
    },
  };
}

export function buildCategoryMetadata(category: CategorySummary): Metadata {
  const title = category.metaTitle ?? category.name;
  const description =
    category.metaDescription ??
    `Shop ${category.name} sports and fitness accessories, from Onwei.`;

  return {
    title,
    description,
    alternates: { canonical: `/collection/${category.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export function buildArticleMetadata(article: ArticleDetail): Metadata {
  const description =
    article.excerpt ?? `Read ${article.title} on the Onwei playbook.`;

  return {
    title: article.title,
    description,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      images: article.coverImageUrl
        ? [{ url: article.coverImageUrl }]
        : undefined,
    },
  };
}

/** The literal /collection/all route, no single Category row backs it, so
 * it needs its own static copy rather than reusing one category's. */
export const SHOP_ALL_METADATA: Metadata = {
  title: "Shop All",
  description:
    "Shop our full range of sports and fitness accessories, from Onwei.",
  alternates: { canonical: "/collection/all" },
  openGraph: {
    title: "Shop All",
    description:
      "Shop our full range of sports and fitness accessories, from Onwei.",
    type: "website",
  },
};
