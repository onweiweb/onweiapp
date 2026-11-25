import { Prisma, prisma } from "@onwei/database";
import { randomInt } from "node:crypto";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { toMinorUnits } from "../catalog/helpers";
import { renderInviteRewardEmail, sendEmailSafely } from "@onwei/emails";

/**
 * Invite rewards (docs/COMMERCE_BUILD_PLAN.md section 20): "invite 10
 * people, get ₹500 off; invite 25, get a cap". Staff set the rules in admin.
 * When a member's Nth invitee becomes an Insider, they get each rule they
 * have reached once, as a personal coupon only they can use (money off, a
 * percentage off, or a free item from inventory).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export type InviteRewardType = "AMOUNT_OFF" | "PERCENT_OFF" | "FREE_ITEM";

export interface InviteRewardRuleView {
  id: string;
  invites: number;
  rewardType: InviteRewardType;
  /** Rupees for AMOUNT_OFF, percent for PERCENT_OFF. */
  value: number | null;
  freeVariantId: string | null;
  validDays: number;
  isActive: boolean;
  /** How many members got it so far. */
  granted: number;
}

export interface InviteRewardRuleInput {
  invites: number;
  rewardType: InviteRewardType;
  value: number | null;
  freeVariantId: string | null;
  validDays: number;
  isActive: boolean;
}

export type InviteRewardErrors = Partial<
  Record<keyof InviteRewardRuleInput, string>
>;

export function validateInviteRewardRule(
  input: InviteRewardRuleInput,
): InviteRewardErrors {
  const errors: InviteRewardErrors = {};
  if (!(
    Number.isInteger(input.invites) &&
    input.invites >= 1 &&
    input.invites <= 1000
  ))
    errors.invites = "Enter how many invites, a whole number from 1 to 1000.";
  if (
    input.rewardType === "AMOUNT_OFF" &&
    !(Number(input.value) >= 1 && Number(input.value) <= 100000)
  )
    errors.value = "Enter the amount off in rupees, at least ₹1.";
  if (
    input.rewardType === "PERCENT_OFF" &&
    !(
      Number.isInteger(input.value) &&
      Number(input.value) >= 1 &&
      Number(input.value) <= 90
    )
  )
    errors.value = "Enter a whole percentage from 1 to 90.";
  if (input.rewardType === "FREE_ITEM" && !input.freeVariantId)
    errors.freeVariantId = "Pick the free item.";
  if (!(
    Number.isInteger(input.validDays) &&
    input.validDays >= 1 &&
    input.validDays <= 730
  ))
    errors.validDays = "Enter how many days it can be used, from 1 to 730.";
  return errors;
}

export async function listInviteRewardRules(): Promise<InviteRewardRuleView[]> {
  const rules = await prisma.insiderRewardRule.findMany({
    orderBy: [{ invites: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { grants: true } } },
  });
  return rules.map((rule) => ({
    id: rule.id,
    invites: rule.invites,
    rewardType: rule.rewardType,
    value: rule.value === null ? null : Number(rule.value),
    freeVariantId: rule.freeVariantId,
    validDays: rule.validDays,
    isActive: rule.isActive,
    granted: rule._count.grants,
  }));
}

export type SaveInviteRewardResult =
  { ok: true; id: string } | { ok: false; errors: InviteRewardErrors };

export async function saveInviteRewardRule(
  input: InviteRewardRuleInput,
  actor: AuditActor,
  id?: string,
): Promise<SaveInviteRewardResult> {
  const errors = validateInviteRewardRule(input);
  if (Object.keys(errors).length) return { ok: false, errors };
  if (input.rewardType === "FREE_ITEM") {
    const found = await prisma.productVariant.count({
      where: { id: input.freeVariantId! },
    });
    if (!found)
      return {
        ok: false,
        errors: { freeVariantId: "That item no longer exists." },
      };
  }
  const data = {
    invites: input.invites,
    rewardType: input.rewardType,
    value:
      input.rewardType === "FREE_ITEM" || input.value === null
        ? null
        : new Prisma.Decimal(input.value),
    freeVariantId:
      input.rewardType === "FREE_ITEM" ? input.freeVariantId : null,
    validDays: input.validDays,
    isActive: input.isActive,
  };
  const saved = await prisma.$transaction(async (tx) => {
    const before = id
      ? await tx.insiderRewardRule.findUnique({ where: { id } })
      : null;
    const row = id
      ? await tx.insiderRewardRule.update({ where: { id }, data })
      : await tx.insiderRewardRule.create({ data });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: id ? "insider.reward.update" : "insider.reward.create",
        entityType: "InsiderRewardRule",
        entityId: row.id,
        beforeState: before,
        afterState: row,
      },
      tx,
    );
    return row;
  });
  return { ok: true, id: saved.id };
}

export async function deleteInviteRewardRule(
  id: string,
  actor: AuditActor,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.insiderRewardRule.findUnique({ where: { id } });
    if (!before) return false;
    // Rewards already given stay: their coupons keep working.
    await tx.insiderRewardRule.update({
      where: { id },
      data: { isActive: false },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.reward.switchOff",
        entityType: "InsiderRewardRule",
        entityId: id,
        beforeState: before,
        afterState: { isActive: false },
      },
      tx,
    );
    return true;
  });
}

/** Members this person let in who are Insiders now. */
export async function countApprovedInvites(entryId: string): Promise<number> {
  return prisma.waitlistEntry.count({
    where: { invitedByEntryId: entryId, status: "APPROVED" },
  });
}

function rewardCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "INV-";
  for (let i = 0; i < 6; i++) out += letters[randomInt(letters.length)];
  return out;
}

export interface GrantedReward {
  entryId: string;
  ruleId: string;
  couponCode: string;
  invites: number;
  rewardType: InviteRewardType;
  value: number | null;
  endsAt: Date;
}

/**
 * Gives the inviter every active reward they have reached and not had yet.
 * Safe to call again: each rule is given once per member (unique row).
 */
export async function grantInviteRewards(
  inviterEntryId: string,
  now: Date = new Date(),
): Promise<GrantedReward[]> {
  const inviter = await prisma.waitlistEntry.findFirst({
    where: { id: inviterEntryId, status: "APPROVED" },
    select: { id: true, email: true, phone: true },
  });
  if (!inviter) return [];
  const invites = await countApprovedInvites(inviter.id);
  const due = await prisma.insiderRewardRule.findMany({
    where: {
      isActive: true,
      invites: { lte: invites },
      grants: { none: { waitlistEntryId: inviter.id } },
    },
    orderBy: { invites: "asc" },
  });
  const granted: GrantedReward[] = [];
  for (const rule of due) {
    const endsAt = new Date(now.getTime() + rule.validDays * DAY_MS);
    const result = await prisma
      .$transaction(
        async (tx) => {
          const claim = await tx.insiderRewardGrant.create({
            data: { waitlistEntryId: inviter.id, ruleId: rule.id },
          });
          let code = rewardCode();
          for (let i = 0; i < 5; i++) {
            const taken = await tx.coupon.findFirst({
              where: { code: { equals: code, mode: "insensitive" } },
              select: { id: true },
            });
            if (!taken) break;
            code = rewardCode();
          }
          const ruleConfig =
            rule.rewardType === "FREE_ITEM"
              ? {
                  type: "FREE_ITEM" as const,
                  config: { variantId: rule.freeVariantId, quantity: 1 },
                }
              : rule.rewardType === "PERCENT_OFF"
                ? {
                    type: "PERCENTAGE" as const,
                    config: { percentage: Number(rule.value) },
                  }
                : {
                    type: "FLAT" as const,
                    config: { amount: Number(rule.value) },
                  };
          const coupon = await tx.coupon.create({
            data: {
              code,
              description: `Invite reward: ${rule.invites} Insiders invited`,
              isActive: true,
              endsAt,
              usageLimit: 1,
              perCustomerLimit: 1,
              scope: "CART",
              audience: "SPECIFIC",
              allowedContacts: [inviter.email, inviter.phone].filter(
                (c): c is string => Boolean(c),
              ),
              appliesTo: "BOTH",
              rules: {
                create: {
                  type: ruleConfig.type,
                  config: ruleConfig.config as Prisma.InputJsonValue,
                },
              },
            },
            select: { id: true, code: true },
          });
          await tx.insiderRewardGrant.update({
            where: { id: claim.id },
            data: { couponId: coupon.id },
          });
          return coupon;
        },
        { timeout: 20_000, maxWait: 10_000 },
      )
      .catch((error: unknown) => {
        // Given already by a parallel call (unique member + rule).
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          return null;
        throw error;
      });
    if (result)
      granted.push({
        entryId: inviter.id,
        ruleId: rule.id,
        couponCode: result.code,
        invites: rule.invites,
        rewardType: rule.rewardType,
        value: rule.value === null ? null : Number(rule.value),
        endsAt,
      });
  }
  return granted;
}

export interface InviteProgress {
  insiderCode: string;
  invites: number;
  /** The next reward still to reach, if any. */
  next: {
    invites: number;
    rewardType: InviteRewardType;
    value: number | null;
    itemName: string | null;
  } | null;
}

/** "4 of 10 invites. At 10 you get ₹500 off." for the account page. */
export async function getInviteProgress(identity: {
  email: string | null;
  phone: string | null;
}): Promise<InviteProgress | null> {
  const or: Prisma.WaitlistEntryWhereInput[] = [];
  if (identity.email) or.push({ email: identity.email });
  if (identity.phone) or.push({ phone: identity.phone });
  if (or.length === 0) return null;
  const entry = await prisma.waitlistEntry.findFirst({
    where: { OR: or, status: "APPROVED", insiderCode: { not: null } },
    orderBy: { submittedAt: "asc" },
    select: { id: true, insiderCode: true },
  });
  if (!entry?.insiderCode) return null;
  const invites = await countApprovedInvites(entry.id);
  const rule = await prisma.insiderRewardRule.findFirst({
    where: {
      isActive: true,
      grants: { none: { waitlistEntryId: entry.id } },
    },
    orderBy: { invites: "asc" },
  });
  let itemName: string | null = null;
  if (rule?.freeVariantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: rule.freeVariantId },
      select: { product: { select: { name: true } } },
    });
    itemName = variant?.product.name ?? null;
  }
  return {
    insiderCode: entry.insiderCode,
    invites,
    next: rule
      ? {
          invites: rule.invites,
          rewardType: rule.rewardType,
          value: rule.value === null ? null : toMinorUnits(rule.value) / 100,
          itemName,
        }
      : null,
  };
}

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** "₹500 off", "10% off" or "A free Onwei Cap". */
export async function inviteRewardText(reward: {
  rewardType: InviteRewardType;
  value: number | null;
  ruleId?: string;
}): Promise<string> {
  if (reward.rewardType === "AMOUNT_OFF")
    return `₹${Number(reward.value).toLocaleString("en-IN")} off`;
  if (reward.rewardType === "PERCENT_OFF") return `${reward.value}% off`;
  const rule = reward.ruleId
    ? await prisma.insiderRewardRule.findUnique({
        where: { id: reward.ruleId },
        select: { freeVariantId: true },
      })
    : null;
  const variant = rule?.freeVariantId
    ? await prisma.productVariant.findUnique({
        where: { id: rule.freeVariantId },
        select: { product: { select: { name: true } } },
      })
    : null;
  return variant ? `A free ${variant.product.name}` : "A free item";
}

/** Emails each inviter their new reward code. Never throws. */
export async function sendInviteRewardEmails(
  rewards: readonly GrantedReward[],
  siteUrl?: string,
): Promise<void> {
  for (const reward of rewards) {
    try {
      const entry = await prisma.waitlistEntry.findUnique({
        where: { id: reward.entryId },
        select: { fullName: true, email: true },
      });
      if (!entry) continue;
      await sendEmailSafely(
        entry.email,
        renderInviteRewardEmail({
          name: entry.fullName,
          invites: reward.invites,
          reward: await inviteRewardText(reward),
          code: reward.couponCode,
          validUntil: DATE.format(reward.endsAt),
          siteUrl,
        }),
      );
    } catch (error) {
      console.error("[insiders] invite reward email failed", error);
    }
  }
}

/** The members who let the most people in, for admin. Counts only. */
export async function listTopInviters(limit = 20): Promise<
  {
    entryId: string;
    name: string;
    insiderCode: string | null;
    invites: number;
  }[]
> {
  const groups = await prisma.waitlistEntry.groupBy({
    by: ["invitedByEntryId"],
    where: { invitedByEntryId: { not: null }, status: "APPROVED" },
    _count: { _all: true },
    orderBy: { _count: { invitedByEntryId: "desc" } },
    take: limit,
  });
  const ids = groups
    .map((g) => g.invitedByEntryId)
    .filter((id): id is string => Boolean(id));
  const members = await prisma.waitlistEntry.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, insiderCode: true },
  });
  return groups.flatMap((g) => {
    const member = members.find((m) => m.id === g.invitedByEntryId);
    return member
      ? [
          {
            entryId: member.id,
            name: member.fullName,
            insiderCode: member.insiderCode,
            invites: g._count._all,
          },
        ]
      : [];
  });
}
