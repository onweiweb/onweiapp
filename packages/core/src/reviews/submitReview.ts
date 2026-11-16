import { prisma } from "@onwei/database";
import { createLazyLimiter } from "../rateLimit/lazyLimiter";
import { isValidEmail } from "../validation/email";

/**
 * "Write a review" on the storefront. Anyone with a valid email can write
 * one; nothing shows until staff approve it in admin Reviews. The email is
 * kept only to check for a delivered order (the "Verified" label) and is
 * never shown on the site.
 */

export const REVIEW_LIMITS = {
  title: 80,
  bodyMin: 10,
  bodyMax: 1500,
  name: 40,
} as const;

export interface SiteReviewInput {
  rating: number;
  title?: string;
  body: string;
  name: string;
  email: string;
  /** Empty means a review of Onwei as a brand. */
  productId?: string;
}

export type SiteReviewError =
  | "INVALID_RATING"
  | "TITLE_TOO_LONG"
  | "BODY_TOO_SHORT"
  | "BODY_TOO_LONG"
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "UNKNOWN_PRODUCT";

/** Pure checks, so every rule is unit tested without a database. */
export function checkSiteReview(
  input: SiteReviewInput,
): SiteReviewError | null {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return "INVALID_RATING";
  }
  if ((input.title ?? "").trim().length > REVIEW_LIMITS.title) {
    return "TITLE_TOO_LONG";
  }
  const body = input.body.trim();
  if (body.length < REVIEW_LIMITS.bodyMin) return "BODY_TOO_SHORT";
  if (body.length > REVIEW_LIMITS.bodyMax) return "BODY_TOO_LONG";
  const name = input.name.trim();
  if (!name || name.length > REVIEW_LIMITS.name) return "INVALID_NAME";
  if (!isValidEmail(input.email.trim().toLowerCase())) return "INVALID_EMAIL";
  return null;
}

/** True when this email belongs to a customer with a delivered order that
 * included the product. */
export async function hasDeliveredOrderFor(
  email: string,
  productId: string,
): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: {
      status: "DELIVERED",
      customer: { email: { equals: email, mode: "insensitive" } },
      items: { some: { productVariant: { productId } } },
    },
    select: { id: true },
  });
  return order !== null;
}

export async function submitSiteReview(
  input: SiteReviewInput,
  consent: { version: string; ipAddress?: string },
): Promise<{ ok: true; id: string } | { ok: false; reason: SiteReviewError }> {
  const problem = checkSiteReview(input);
  if (problem) return { ok: false, reason: problem };

  const email = input.email.trim().toLowerCase();
  const productId = input.productId?.trim() || null;
  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    if (!product) return { ok: false, reason: "UNKNOWN_PRODUCT" };
  }

  const verified = productId
    ? await hasDeliveredOrderFor(email, productId)
    : false;
  const review = await prisma.review.create({
    data: {
      targetType: productId ? "PRODUCT" : "BRAND",
      productId,
      source: "SITE",
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      authorDisplay: input.name.trim(),
      email,
      isVerifiedPurchase: verified,
      consentVersion: consent.version,
      ipAddress: consent.ipAddress ?? null,
    },
    select: { id: true },
  });
  return { ok: true, id: review.id };
}

// 3 reviews an hour per IP: plenty for a person, blunts scripted spam.
const limiter = createLazyLimiter({
  limit: 3,
  window: "1 h",
  prefix: "review",
});

export async function checkReviewRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}

export function _resetReviewRateLimiterForTests(): void {
  limiter.reset();
}
