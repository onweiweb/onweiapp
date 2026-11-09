import { prisma, type Prisma } from "@onwei/database";
import { mapAttributes, mapVariant } from "../catalog/mapProduct";
import type { ProductVariantDTO } from "../catalog/types";
import { toMinorUnits } from "../catalog/helpers";
import { normalizeCode, isInsiderCodeFormat } from "../insiders/insiderCode";
import {
  priceCart,
  type PricingLine,
  type PricingResult,
  type RejectedCoupon,
} from "../pricing/engine";
import { resolveCoupons, type CodeProblem } from "./couponEligibility";
import {
  getCustomerIdentity,
  getInsiderStatus,
  type CustomerIdentity,
  type InsiderStatus,
} from "./customerIdentity";
import { getStoreSettings, type StoreSettings } from "./storeSettings";

/** Who the cart belongs to: a signed-in customer, or a guest cookie. */
export interface CartOwner {
  customerId?: string | null;
  guestToken?: string | null;
}

export const MAX_PER_LINE = 10;

const cartInclude = {
  items: {
    orderBy: { id: "asc" },
    include: {
      productVariant: {
        include: {
          inventory: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          product: {
            include: {
              category: { select: { id: true, isReturnable: true } },
              images: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type CartItemRow = CartWithItems["items"][number];

export function variantLabelOf(attributes: unknown): string {
  return Object.values(mapAttributes(attributes)).join(" / ");
}

function available(item: CartItemRow["productVariant"]): number {
  return item.inventory.reduce(
    (sum, row) => sum + Math.max(0, row.quantityOnHand - row.quantityReserved),
    0,
  );
}

function sellable(variant: CartItemRow["productVariant"]): boolean {
  return (
    variant.status === "ACTIVE" &&
    variant.product.status === "ACTIVE" &&
    variant.product.deletedAt === null
  );
}

function leadImage(variant: CartItemRow["productVariant"]): string | null {
  const own = variant.images.find((image) => !image.isPlaceholder);
  if (own) return own.url;
  const productImage =
    variant.product.images.find((image) => !image.isPlaceholder) ?? null;
  return productImage?.url ?? null;
}

async function findCart(owner: CartOwner): Promise<CartWithItems | null> {
  if (owner.customerId) {
    return prisma.cart.findUnique({
      where: { customerId: owner.customerId },
      include: cartInclude,
    });
  }
  if (owner.guestToken) {
    return prisma.cart.findUnique({
      where: { guestToken: owner.guestToken },
      include: cartInclude,
    });
  }
  return null;
}

async function findOrCreateCart(owner: CartOwner): Promise<CartWithItems> {
  const existing = await findCart(owner);
  if (existing) return existing;
  if (!owner.customerId && !owner.guestToken) {
    throw new Error("A cart needs a customer or a guest token");
  }
  try {
    return await prisma.cart.create({
      data: owner.customerId
        ? { customerId: owner.customerId }
        : { guestToken: owner.guestToken },
      include: cartInclude,
    });
  } catch {
    // Created by a parallel request.
    const again = await findCart(owner);
    if (again) return again;
    throw new Error("Could not create the cart");
  }
}

export type CartActionResult =
  | { ok: true; quantity?: number; limited?: boolean }
  | {
      ok: false;
      reason: "NOT_AVAILABLE" | "OUT_OF_STOCK" | "INVALID_QUANTITY";
    };

/** Adds to a line (or creates it), capped by stock and the per-line limit. */
export async function addToCart(
  owner: CartOwner,
  variantId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PER_LINE) {
    return { ok: false, reason: "INVALID_QUANTITY" };
  }
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: true },
  });
  if (
    !variant ||
    variant.status !== "ACTIVE" ||
    variant.product.status !== "ACTIVE" ||
    variant.product.deletedAt
  ) {
    return { ok: false, reason: "NOT_AVAILABLE" };
  }
  const stock = variant.inventory.reduce(
    (sum, row) => sum + Math.max(0, row.quantityOnHand - row.quantityReserved),
    0,
  );
  if (stock <= 0) return { ok: false, reason: "OUT_OF_STOCK" };

  const cart = await findOrCreateCart(owner);
  const current =
    cart.items.find((item) => item.productVariantId === variantId)?.quantity ??
    0;
  const wanted = current + quantity;
  const allowed = Math.min(wanted, stock, MAX_PER_LINE);
  await prisma.cartItem.upsert({
    where: {
      cartId_productVariantId: { cartId: cart.id, productVariantId: variantId },
    },
    create: { cartId: cart.id, productVariantId: variantId, quantity: allowed },
    update: { quantity: allowed },
  });
  return { ok: true, quantity: allowed, limited: allowed < wanted };
}

/** Sets a line's quantity; 0 removes it. */
export async function setCartQuantity(
  owner: CartOwner,
  variantId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_PER_LINE) {
    return { ok: false, reason: "INVALID_QUANTITY" };
  }
  const cart = await findCart(owner);
  if (!cart) return { ok: true, quantity: 0 };
  if (quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productVariantId: variantId },
    });
    return { ok: true, quantity: 0 };
  }
  const item = cart.items.find((row) => row.productVariantId === variantId);
  if (!item) return addToCart(owner, variantId, quantity);
  const stock = available(item.productVariant);
  const allowed = Math.min(quantity, stock, MAX_PER_LINE);
  if (allowed <= 0) return { ok: false, reason: "OUT_OF_STOCK" };
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: allowed },
  });
  return { ok: true, quantity: allowed, limited: allowed < quantity };
}

export async function setApplyInsider(
  owner: CartOwner,
  on: boolean,
): Promise<void> {
  const cart = await findOrCreateCart(owner);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { applyInsider: on },
  });
}

export async function removeCartCode(
  owner: CartOwner,
  code: string,
): Promise<void> {
  const cart = await findCart(owner);
  if (!cart) return;
  const normalized = normalizeCode(code);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCodes: cart.couponCodes.filter((c) => c !== normalized) },
  });
}

/**
 * Moves a guest cart into the customer's cart at sign-in: quantities are
 * added (capped by stock and the per-line limit), entered codes carried over,
 * and the guest cart is deleted.
 */
export async function mergeGuestCart(
  guestToken: string,
  customerId: string,
): Promise<void> {
  const guest = await prisma.cart.findUnique({
    where: { guestToken },
    include: cartInclude,
  });
  if (!guest) return;
  const target = await findOrCreateCart({ customerId });
  for (const item of guest.items) {
    const existing = target.items.find(
      (row) => row.productVariantId === item.productVariantId,
    );
    const stock = available(item.productVariant);
    const quantity = Math.min(
      (existing?.quantity ?? 0) + item.quantity,
      stock,
      MAX_PER_LINE,
    );
    if (quantity <= 0) continue;
    await prisma.cartItem.upsert({
      where: {
        cartId_productVariantId: {
          cartId: target.id,
          productVariantId: item.productVariantId,
        },
      },
      create: {
        cartId: target.id,
        productVariantId: item.productVariantId,
        quantity,
      },
      update: { quantity },
    });
  }
  const codes = Array.from(
    new Set([...target.couponCodes, ...guest.couponCodes]),
  );
  await prisma.cart.update({
    where: { id: target.id },
    data: { couponCodes: codes },
  });
  await prisma.cartItem.deleteMany({ where: { cartId: guest.id } });
  await prisma.cart.delete({ where: { id: guest.id } });
}

export interface CartLineView {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  stock: number;
  subtotal: number;
  discount: number;
  total: number;
  /** Something the customer has to fix before checkout. */
  issue: "UNAVAILABLE" | "OUT_OF_STOCK" | null;
  /** We lowered the quantity to what's in stock. */
  adjusted: boolean;
  isReturnable: boolean;
  gstRate: number | null;
  categoryId: string;
}

export interface CodeView {
  code: string;
  applied: boolean;
  isInsiderCode: boolean;
  problem: CodeProblem | RejectedCoupon["reason"] | null;
  short?: number;
  blockedBy?: string;
}

export interface CartView {
  cartId: string | null;
  lines: CartLineView[];
  itemCount: number;
  pricing: PricingResult;
  freeShippingThreshold: number;
  codes: CodeView[];
  insider: {
    code: string;
    percent: number;
    switchedOn: boolean;
    applied: boolean;
    blockedBy: string | null;
  } | null;
  signedIn: boolean;
  /** Nothing in the cart stops checkout. */
  canCheckout: boolean;
}

export interface CartContext {
  identity: CustomerIdentity | null;
  insider: InsiderStatus | null;
  settings: StoreSettings;
}

export async function loadCartContext(owner: CartOwner): Promise<CartContext> {
  const [identity, settings] = await Promise.all([
    owner.customerId
      ? getCustomerIdentity(owner.customerId)
      : Promise.resolve(null),
    getStoreSettings(),
  ]);
  const insider = identity ? await getInsiderStatus(identity) : null;
  return { identity, insider, settings };
}

/**
 * The priced cart. Lines that can't be bought are shown but left out of the
 * price; quantities above stock are lowered (and flagged) so the customer is
 * never charged for something we can't send.
 */
export async function getCartView(
  owner: CartOwner,
  options: {
    paymentMethod?: "RAZORPAY" | "COD" | null;
    context?: CartContext;
  } = {},
): Promise<CartView> {
  const [context, cart] = await Promise.all([
    options.context ? Promise.resolve(options.context) : loadCartContext(owner),
    findCart(owner),
  ]);
  const items = cart?.items ?? [];

  const lines: CartLineView[] = [];
  for (const item of items) {
    const variant = item.productVariant;
    const stock = available(variant);
    let issue: CartLineView["issue"] = null;
    let quantity = item.quantity;
    let adjusted = false;
    if (!sellable(variant)) issue = "UNAVAILABLE";
    else if (stock <= 0) issue = "OUT_OF_STOCK";
    else if (quantity > stock) {
      quantity = stock;
      adjusted = true;
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }
    const unitPrice = toMinorUnits(variant.price);
    lines.push({
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      productSlug: variant.product.slug,
      variantLabel: variantLabelOf(variant.attributes),
      sku: variant.sku,
      imageUrl: leadImage(variant),
      unitPrice,
      compareAtPrice: variant.compareAtPrice
        ? toMinorUnits(variant.compareAtPrice)
        : null,
      quantity,
      stock,
      subtotal: unitPrice * quantity,
      discount: 0,
      total: unitPrice * quantity,
      issue,
      adjusted,
      isReturnable:
        variant.product.isReturnable && variant.product.category.isReturnable,
      gstRate: variant.product.gstRate ? Number(variant.product.gstRate) : null,
      categoryId: variant.product.categoryId,
    });
  }

  const priceable = lines.filter((line) => line.issue === null);
  const pricingLines: PricingLine[] = priceable.map((line) => ({
    key: line.variantId,
    productId: line.productId,
    categoryId: line.categoryId,
    unitPrice: line.unitPrice,
    compareAtPrice: line.compareAtPrice,
    quantity: line.quantity,
  }));

  const resolved = await resolveCoupons({
    codes: cart?.couponCodes ?? [],
    identity: context.identity,
    insider: context.insider,
  });
  const insiderOn = Boolean(context.insider) && (cart?.applyInsider ?? true);
  const pricing = priceCart({
    lines: pricingLines,
    insider:
      insiderOn && context.insider
        ? { percent: context.insider.percent }
        : null,
    coupons: resolved.coupons,
    paymentMethod: options.paymentMethod ?? null,
    shipping: {
      freeThreshold: context.settings.freeShippingThreshold,
      fee: context.settings.deliveryFee,
    },
    codFee: context.settings.codFee,
  });

  for (const priced of pricing.lines) {
    const line = lines.find((l) => l.variantId === priced.key);
    if (line) {
      line.discount = priced.discount;
      line.total = priced.total;
    }
  }

  const appliedIds = new Set(
    pricing.discounts.map((d) => d.couponId).filter(Boolean),
  );
  const codes: CodeView[] = resolved.checks.map((check) => {
    if (check.problem) {
      return {
        code: check.code,
        applied: false,
        isInsiderCode: Boolean(check.isInsiderCode),
        problem: check.problem,
      };
    }
    if (check.isInsiderCode) {
      return {
        code: check.code,
        applied: pricing.insiderApplied,
        isInsiderCode: true,
        problem: null,
      };
    }
    const coupon = resolved.coupons.find((c) => c.code === check.code);
    const rejection = pricing.rejected.find((r) => r.code === check.code);
    return {
      code: check.code,
      applied: coupon ? appliedIds.has(coupon.id) : false,
      isInsiderCode: false,
      problem: rejection?.reason ?? null,
      short: rejection?.short,
      blockedBy: rejection?.blockedBy,
    };
  });

  return {
    cartId: cart?.id ?? null,
    lines,
    itemCount: lines.reduce(
      (sum, line) => sum + (line.issue ? 0 : line.quantity),
      0,
    ),
    pricing,
    freeShippingThreshold: context.settings.freeShippingThreshold,
    codes,
    insider: context.insider
      ? {
          code: context.insider.code,
          percent: context.insider.percent,
          switchedOn: insiderOn,
          applied: pricing.insiderApplied,
          blockedBy: pricing.insiderBlockedBy,
        }
      : null,
    signedIn: Boolean(context.identity),
    canCheckout:
      priceable.length > 0 && lines.every((line) => line.issue === null),
  };
}

export type ApplyCodeResult =
  | { ok: true; view: CartView }
  | {
      ok: false;
      problem: CodeProblem | RejectedCoupon["reason"];
      short?: number;
      blockedBy?: string;
      view: CartView;
    };

/**
 * Adds a code to the cart if it's usable right now. An Insider code switches
 * the Insider discount on instead of being stored. A code that can't be used
 * is not kept, and the answer says why.
 */
export async function applyCartCode(
  owner: CartOwner,
  rawCode: string,
): Promise<ApplyCodeResult> {
  const code = normalizeCode(rawCode);
  const cart = await findOrCreateCart(owner);
  const context = await loadCartContext(owner);

  if (isInsiderCodeFormat(code)) {
    const check = await resolveCoupons({
      codes: [code],
      identity: context.identity,
      insider: context.insider,
    });
    const first = check.checks[0];
    if (first?.problem) {
      return {
        ok: false,
        problem: first.problem,
        view: await getCartView(owner, { context }),
      };
    }
    await prisma.cart.update({
      where: { id: cart.id },
      data: { applyInsider: true },
    });
    return { ok: true, view: await getCartView(owner, { context }) };
  }

  const codes = Array.from(new Set([...cart.couponCodes, code]));
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCodes: codes },
  });
  const view = await getCartView(owner, { context });
  const entry = view.codes.find((c) => c.code === code);
  if (entry && (entry.applied || entry.problem === null))
    return { ok: true, view };

  // Not usable: take it back out so it doesn't linger, unless it only
  // needs a bigger cart (then keeping it lets it switch on by itself).
  const keep = entry?.problem === "MIN_ORDER" || entry?.problem === "MIN_ITEMS";
  if (!keep) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponCodes: codes.filter((c) => c !== code) },
    });
  }
  return {
    ok: false,
    problem: entry?.problem ?? "NOT_VALID",
    short: entry?.short,
    blockedBy: entry?.blockedBy,
    view: keep ? view : await getCartView(owner, { context }),
  };
}

/** Empties the lines that were ordered (after payment or a COD order). */
export async function removeOrderedItems(
  customerId: string,
  variantIds: readonly string[],
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const cart = await tx.cart.findUnique({
    where: { customerId },
    select: { id: true },
  });
  if (!cart) return;
  await tx.cartItem.deleteMany({
    where: { cartId: cart.id, productVariantId: { in: [...variantIds] } },
  });
  await tx.cart.update({ where: { id: cart.id }, data: { couponCodes: [] } });
}

export interface QuickAddChoice {
  ok: false;
  reason: "NEEDS_CHOICE";
  slug: string;
  name: string;
  /** Every active option, so the card can show a size and colour picker. */
  variants: ProductVariantDTO[];
}

/**
 * "Add to cart" on a product card: adds straight away when the product has
 * one option, otherwise returns the options so the card can open a picker.
 */
export async function quickAddProduct(
  owner: CartOwner,
  productId: string,
): Promise<CartActionResult | QuickAddChoice> {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE", deletedAt: null },
    include: {
      variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
    },
  });
  if (!product) return { ok: false, reason: "NOT_AVAILABLE" };
  const inStock = product.variants.filter((variant) =>
    variant.inventory.some(
      (row) => row.quantityOnHand - row.quantityReserved > 0,
    ),
  );
  if (product.variants.length > 1)
    return {
      ok: false,
      reason: "NEEDS_CHOICE",
      slug: product.slug,
      name: product.name,
      variants: product.variants.map(mapVariant),
    };
  const only = inStock[0];
  if (!only) return { ok: false, reason: "OUT_OF_STOCK" };
  return addToCart(owner, only.id, 1);
}
