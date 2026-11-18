import { Prisma, prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import { istDayStart } from "../insiders/insiderTiers";

/**
 * The pre-order campaign (docs/COMMERCE_BUILD_PLAN.md section 14a). Tiers
 * run back to back from the start date, each for its number of days, so
 * extending a tier pushes the later ones back. Orders keep their own copy of
 * the tier, discount and gifts, so editing the campaign never changes a
 * reservation that's already paid.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_RESERVE_RUPEES = 900;
export const MAX_PREORDER_TIERS = 5;

export interface PreorderTierView {
  id: string;
  position: number;
  label: string;
  days: number;
  percent: number;
  giftVariantId: string | null;
  giftLabel: string | null;
  startsAt: Date;
  /** Exclusive. */
  endsAt: Date;
}

export interface PreorderCampaignView {
  id: string;
  name: string;
  isActive: boolean;
  startsAt: Date;
  /** Paise, per item. */
  reserveAmount: number;
  expectedShipDate: Date | null;
  productIds: string[];
  insiderGiftVariantId: string | null;
  tiers: PreorderTierView[];
  /** Exclusive: the end of the last tier. */
  endsAt: Date;
}

export type TierState = "CLOSED" | "LIVE" | "LOCKED";

/** Start and end of each tier, back to back from `startsAt`. */
export function tierWindows<T extends { days: number }>(
  startsAt: Date,
  tiers: readonly T[],
): (T & { startsAt: Date; endsAt: Date })[] {
  let cursor = startsAt.getTime();
  return tiers.map((tier) => {
    const start = cursor;
    cursor += tier.days * DAY_MS;
    return { ...tier, startsAt: new Date(start), endsAt: new Date(cursor) };
  });
}

/** Which tier is on sale now, or null before the start and after the end. */
export function liveTier(
  campaign: Pick<PreorderCampaignView, "tiers" | "isActive">,
  now: Date = new Date(),
): PreorderTierView | null {
  if (!campaign.isActive) return null;
  return (
    campaign.tiers.find((tier) => tier.startsAt <= now && now < tier.endsAt) ??
    null
  );
}

export function tierState(
  tier: PreorderTierView,
  now: Date = new Date(),
): TierState {
  if (now >= tier.endsAt) return "CLOSED";
  if (now >= tier.startsAt) return "LIVE";
  return "LOCKED";
}

const include = {
  tiers: { orderBy: { position: "asc" } },
} satisfies Prisma.PreorderCampaignInclude;

type CampaignRow = Prisma.PreorderCampaignGetPayload<{
  include: typeof include;
}>;

function toView(row: CampaignRow): PreorderCampaignView {
  const tiers = tierWindows(row.startsAt, row.tiers).map((tier) => ({
    id: tier.id,
    position: tier.position,
    label: tier.label,
    days: tier.days,
    percent: tier.percent,
    giftVariantId: tier.giftVariantId,
    giftLabel: tier.giftLabel,
    startsAt: tier.startsAt,
    endsAt: tier.endsAt,
  }));
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    startsAt: row.startsAt,
    reserveAmount: toMinorUnits(row.reserveAmount),
    expectedShipDate: row.expectedShipDate,
    productIds: row.productIds,
    insiderGiftVariantId: row.insiderGiftVariantId,
    tiers,
    endsAt: tiers.at(-1)?.endsAt ?? row.startsAt,
  };
}

/** The campaign staff edit: the most recent one, switched on or not. */
export async function getPreorderCampaignForAdmin(): Promise<PreorderCampaignView | null> {
  const row = await prisma.preorderCampaign.findFirst({
    orderBy: { createdAt: "desc" },
    include,
  });
  return row ? toView(row) : null;
}

/** The switched-on campaign customers see, or null. */
export async function getActivePreorderCampaign(): Promise<PreorderCampaignView | null> {
  const row = await prisma.preorderCampaign.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include,
  });
  return row ? toView(row) : null;
}

export async function getPreorderCampaign(
  id: string,
): Promise<PreorderCampaignView | null> {
  const row = await prisma.preorderCampaign.findUnique({
    where: { id },
    include,
  });
  return row ? toView(row) : null;
}

export interface PreorderCampaignInput {
  name: string;
  isActive: boolean;
  /** First day, "YYYY-MM-DD" in India time. */
  startDate: string;
  /** Rupees per item. */
  reserveAmount: number;
  /** "YYYY-MM-DD" in India time, or null. */
  expectedShipDate: string | null;
  productIds: string[];
  insiderGiftVariantId: string | null;
  tiers: {
    label: string;
    days: number;
    percent: number;
    giftVariantId: string | null;
    giftLabel: string | null;
  }[];
}

export type PreorderCampaignErrors = Partial<
  Record<keyof PreorderCampaignInput | `tier${number}`, string>
>;

/** Checks the form and explains each problem in plain words. */
export function validatePreorderCampaign(
  input: PreorderCampaignInput,
): PreorderCampaignErrors {
  const errors: PreorderCampaignErrors = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80)
    errors.name = "Give the campaign a name (2 to 80 characters).";
  if (!istDayStart(input.startDate)) errors.startDate = "Pick a start date.";
  if (!(
    Number.isInteger(input.reserveAmount) &&
    input.reserveAmount >= 1 &&
    input.reserveAmount <= 100000
  ))
    errors.reserveAmount = "Enter a whole amount in rupees, at least ₹1.";
  if (input.expectedShipDate && !istDayStart(input.expectedShipDate))
    errors.expectedShipDate = "Pick a date, or leave it empty.";
  if (input.isActive && input.productIds.length === 0)
    errors.productIds = "Pick at least one product before switching it on.";
  if (input.tiers.length < 1 || input.tiers.length > MAX_PREORDER_TIERS)
    errors.tiers = `Add one to ${MAX_PREORDER_TIERS} tiers.`;
  input.tiers.forEach((tier, index) => {
    if (!tier.label.trim() || tier.label.trim().length > 40)
      errors[`tier${index}`] = "Give the tier a short name.";
    else if (!(
      Number.isInteger(tier.days) &&
      tier.days >= 1 &&
      tier.days <= 365
    ))
      errors[`tier${index}`] = "Days must be a whole number from 1 to 365.";
    else if (!(
      Number.isInteger(tier.percent) &&
      tier.percent >= 0 &&
      tier.percent <= 90
    ))
      errors[`tier${index}`] =
        "Discount must be a whole percentage from 0 to 90.";
  });
  return errors;
}

export type SavePreorderCampaignResult =
  { ok: true; id: string } | { ok: false; errors: PreorderCampaignErrors };

/** Creates the campaign, or updates the one with `id`. Tiers are replaced. */
export async function savePreorderCampaign(
  input: PreorderCampaignInput,
  actor: AuditActor,
  id?: string,
): Promise<SavePreorderCampaignResult> {
  const errors = validatePreorderCampaign(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const variantIds = [
    input.insiderGiftVariantId,
    ...input.tiers.map((t) => t.giftVariantId),
  ].filter((v): v is string => Boolean(v));
  if (variantIds.length) {
    const found = await prisma.productVariant.count({
      where: { id: { in: [...new Set(variantIds)] } },
    });
    if (found !== new Set(variantIds).size)
      return {
        ok: false,
        errors: {
          tiers: "One of the gift items no longer exists. Pick again.",
        },
      };
  }

  const before = id ? await getPreorderCampaign(id) : null;
  if (id && !before)
    return { ok: false, errors: { name: "This campaign no longer exists." } };

  const data = {
    name: input.name.trim(),
    isActive: input.isActive,
    startsAt: istDayStart(input.startDate)!,
    reserveAmount: new Prisma.Decimal(input.reserveAmount),
    expectedShipDate: input.expectedShipDate
      ? istDayStart(input.expectedShipDate)
      : null,
    productIds: [...new Set(input.productIds)],
    insiderGiftVariantId: input.insiderGiftVariantId || null,
  };

  const saved = await prisma.$transaction(async (tx) => {
    if (input.isActive) {
      // Only one campaign is live at a time.
      await tx.preorderCampaign.updateMany({
        where: { isActive: true, ...(id ? { NOT: { id } } : {}) },
        data: { isActive: false },
      });
    }
    const row = id
      ? await tx.preorderCampaign.update({ where: { id }, data })
      : await tx.preorderCampaign.create({ data });
    await tx.preorderTier.deleteMany({ where: { campaignId: row.id } });
    await tx.preorderTier.createMany({
      data: input.tiers.map((tier, index) => ({
        campaignId: row.id,
        position: index + 1,
        label: tier.label.trim(),
        days: tier.days,
        percent: tier.percent,
        giftVariantId: tier.giftVariantId || null,
        giftLabel: tier.giftLabel?.trim() || null,
      })),
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: id ? "preorder.campaign.update" : "preorder.campaign.create",
        entityType: "PreorderCampaign",
        entityId: row.id,
        beforeState: before ? { ...before } : null,
        afterState: { ...input },
      },
      tx,
    );
    return row;
  });
  return { ok: true, id: saved.id };
}
