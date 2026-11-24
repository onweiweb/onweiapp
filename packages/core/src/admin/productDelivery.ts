import { prisma, Prisma } from "@onwei/database";
import { writeAuditLog } from "./auditLog";
import type { AuditActor } from "./types";

/**
 * Delivery details the courier needs: the shipper box of a product's
 * category (size and empty weight) and a weight on each size/colour. Nothing
 * is blocked without them (owner, 2026-11-24): orders use the backup size and
 * weight in Settings, and the product shows under Products, "Missing
 * delivery details", with a warning on its page.
 */

/** Products whose category has no box, or with a size still sold but no weight. */
export const MISSING_DELIVERY_DETAILS: Prisma.ProductWhereInput = {
  OR: [
    {
      category: {
        OR: [
          { boxLengthCm: null },
          { boxWidthCm: null },
          { boxHeightCm: null },
          { boxWeightGrams: null },
        ],
      },
    },
    { variants: { some: { weightGrams: null, status: { not: "ARCHIVED" } } } },
  ],
};

export const BOX_SIDE_LIMIT_CM = 200;
export const WEIGHT_LIMIT_GRAMS = 50000;

export interface ShipperBox {
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightGrams: number | null;
}

function hasBox(c: {
  boxLengthCm: unknown;
  boxWidthCm: unknown;
  boxHeightCm: unknown;
  boxWeightGrams: unknown;
}): boolean {
  return (
    c.boxLengthCm !== null &&
    c.boxWidthCm !== null &&
    c.boxHeightCm !== null &&
    c.boxWeightGrams !== null
  );
}

function variantName(attributes: unknown, sku: string): string {
  if (attributes && typeof attributes === "object") {
    const parts = Object.values(attributes as Record<string, unknown>)
      .filter((v) => typeof v === "string" && v.trim())
      .map(String);
    if (parts.length > 0) return parts.join(" / ");
  }
  return sku;
}

/** What this product is missing for the courier, in plain words. Empty when complete. */
export async function getDeliveryDetailsGaps(
  productId: string,
  categoryId?: string,
): Promise<string[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      categoryId: true,
      variants: {
        where: { weightGrams: null, status: { not: "ARCHIVED" } },
        select: { sku: true, attributes: true },
      },
    },
  });
  if (!product) return [];
  const category = await prisma.category.findUnique({
    where: { id: categoryId ?? product.categoryId },
    select: {
      name: true,
      boxLengthCm: true,
      boxWidthCm: true,
      boxHeightCm: true,
      boxWeightGrams: true,
    },
  });
  const gaps: string[] = [];
  if (category && !hasBox(category)) {
    gaps.push(`the shipper box for ${category.name} (Categories)`);
  }
  if (product.variants.length > 0) {
    const names = product.variants.map((v) => variantName(v.attributes, v.sku));
    gaps.push(`a weight for ${names.join(", ")} (Variants tab)`);
  }
  return gaps;
}

/** Thrown when a box or weight entered isn't a sensible number. */
export class DeliveryDetailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryDetailsError";
  }
}

/** The warning shown on a product missing delivery details. */
export function deliveryGapsMessage(gaps: string[]): string {
  return `Missing delivery details: add ${gaps.join(" and ")}. Until then, orders go to the courier with the backup size and weight from Settings.`;
}

/** Checks a box; returns an error in plain words, or null when fine. */
export function checkShipperBox(box: ShipperBox): string | null {
  const sides = [box.lengthCm, box.widthCm, box.heightCm];
  const all = [...sides, box.weightGrams];
  if (all.every((v) => v === null)) return null;
  if (all.some((v) => v === null))
    return "Fill in the box's length, width, height and empty weight.";
  if (
    sides.some((v) => !Number.isFinite(v) || v! < 0.5 || v! > BOX_SIDE_LIMIT_CM)
  ) {
    return `Each side of the box should be between 0.5 and ${BOX_SIDE_LIMIT_CM} cm.`;
  }
  if (
    !Number.isInteger(box.weightGrams) ||
    box.weightGrams! < 0 ||
    box.weightGrams! > 10000
  ) {
    return "Enter the empty box weight in whole grams, from 0 to 10000.";
  }
  return null;
}

/** Checks a variant weight in grams; returns an error in plain words or null. */
export function checkWeightGrams(grams: number | null): string | null {
  if (grams === null) return null;
  if (!Number.isInteger(grams) || grams < 1 || grams > WEIGHT_LIMIT_GRAMS) {
    return `Enter the weight in whole grams, from 1 to ${WEIGHT_LIMIT_GRAMS}.`;
  }
  return null;
}

/** Saves a category's shipper box (all four parts, or none). */
export async function updateCategoryShipperBox(
  categoryId: string,
  box: ShipperBox,
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = checkShipperBox(box);
  if (problem) return { ok: false, error: problem };
  const select = {
    boxLengthCm: true,
    boxWidthCm: true,
    boxHeightCm: true,
    boxWeightGrams: true,
  } as const;
  await prisma.$transaction(async (tx) => {
    const before = await tx.category.findUniqueOrThrow({
      where: { id: categoryId },
      select,
    });
    const after = await tx.category.update({
      where: { id: categoryId },
      data: {
        boxLengthCm:
          box.lengthCm === null ? null : new Prisma.Decimal(box.lengthCm),
        boxWidthCm:
          box.widthCm === null ? null : new Prisma.Decimal(box.widthCm),
        boxHeightCm:
          box.heightCm === null ? null : new Prisma.Decimal(box.heightCm),
        boxWeightGrams: box.weightGrams,
      },
      select,
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "category.shipperBox",
        entityType: "Category",
        entityId: categoryId,
        beforeState: before,
        afterState: after,
      },
      tx,
    );
  });
  return { ok: true };
}
