import { prisma, type Prisma, type WhatsAppStatus } from "@onwei/database";
import { writeAuditLog } from "../../admin/auditLog";
import type { AuditActor } from "../../admin/types";
import {
  createInsiderLinkToken,
  insiderAddressUrl,
} from "../../insiders/insiderLink";
import { readGupshupConfig, type GupshupConfig } from "./gupshupClient";
import type { GupshupTemplateSummary } from "./gupshupTemplates";
import {
  CAMPAIGN_FILL_KINDS,
  CAMPAIGN_GROUP_LABELS,
  CAMPAIGN_MAX_RECIPIENTS,
  CAMPAIGN_BATCH_SIZE,
  cleanFillText,
  sampleCampaignParams,
  type CampaignAudience,
  type CampaignFillKind,
  type CampaignFillSlot,
} from "./campaignFill";

import { firstNameOf } from "./purposes";
import { deliverTemplate } from "./send";

export * from "./campaignFill";

/**
 * Staff sends from Insiders > WhatsApp: any approved Gupshup template, each
 * blank filled from the member (name, code, address link) or with fixed
 * text, to a group of Insiders. The page sends in small batches so staff see
 * progress and can stop. People who replied STOP or unsubscribed are always
 * skipped.
 */

export interface CampaignMember {
  id: string;
  fullName: string;
  insiderCode: string | null;
}

export interface FillContext {
  siteUrl: string;
  secret: string | undefined;
}

/**
 * The params for one member, in Gupshup order. Null when a value is missing
 * (no Insider code yet, or the link secret isn't set).
 */
export function campaignParams(
  fill: CampaignFillSlot[],
  member: CampaignMember,
  context: FillContext,
): string[] | null {
  const params: string[] = [];
  for (const slot of fill) {
    let value: string | null = null;
    try {
      switch (slot.kind) {
        case "firstName":
          value = firstNameOf(member.fullName);
          break;
        case "fullName":
          value = cleanFillText(member.fullName) || null;
          break;
        case "insiderCode":
          value = member.insiderCode;
          break;
        case "addressLink":
          value = insiderAddressUrl(member.id, context.siteUrl, context.secret);
          break;
        case "addressToken":
          value = createInsiderLinkToken("address", member.id, context.secret);
          break;
        case "text":
          value = cleanFillText(slot.text ?? "") || null;
          break;
      }
    } catch {
      value = null;
    }
    if (!value) return null;
    params.push(value);
  }
  return params;
}

// ---------- Who it goes to ----------

function istDayStart(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function audienceWhere(
  audience: CampaignAudience,
): Prisma.WaitlistEntryWhereInput {
  switch (audience.group) {
    case "noAddress":
      return { cardAddress: { is: null } };
    case "addressShared":
      return { cardAddress: { isNot: null } };
    case "joined": {
      const from = audience.from ? istDayStart(audience.from) : null;
      const toStart = audience.to ? istDayStart(audience.to) : null;
      const to = toStart
        ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000)
        : null;
      return {
        submittedAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lt: to } : {}),
        },
      };
    }
    case "picked":
      return { id: { in: [...new Set(audience.ids ?? [])] } };
    default:
      return {};
  }
}

const DAY_LABEL = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function audienceLabel(audience: CampaignAudience): string {
  if (audience.group === "joined") {
    const from = audience.from ? istDayStart(audience.from) : null;
    const to = audience.to ? istDayStart(audience.to) : null;
    const parts = [
      from ? `from ${DAY_LABEL.format(from)}` : "",
      to ? `to ${DAY_LABEL.format(to)}` : "",
    ].filter(Boolean);
    return parts.length ? `Joined ${parts.join(" ")}` : "All Insiders";
  }
  if (audience.group === "picked") {
    const n = new Set(audience.ids ?? []).size;
    return `${n} picked ${n === 1 ? "person" : "people"}`;
  }
  return CAMPAIGN_GROUP_LABELS[audience.group];
}

export interface CampaignPlan {
  /** Matching Insiders before anyone is skipped. */
  matched: number;
  optedOut: number;
  unsubscribed: number;
  /** The message needs an Insider code and they don't have one yet. */
  missingCode: number;
  /** Already got this template (sent, delivered or read). */
  alreadyGot: number;
  /** Already got it, but still included because repeats are allowed. */
  repeats: number;
  /** Who will get it, oldest signup first. Ids only. */
  ids: string[];
  /** More matched than one send can take. */
  overLimit: boolean;
}

/** Counts who will get it and why others won't. No names or numbers. */
export async function planCampaign(input: {
  audience: CampaignAudience;
  templateName: string;
  needsCode: boolean;
  allowRepeat: boolean;
}): Promise<CampaignPlan> {
  const members = await prisma.waitlistEntry.findMany({
    where: audienceWhere(input.audience),
    orderBy: { submittedAt: "asc" },
    take: CAMPAIGN_MAX_RECIPIENTS + 1,
    select: { id: true, phone: true, insiderCode: true, unsubscribedAt: true },
  });
  const overLimit = members.length > CAMPAIGN_MAX_RECIPIENTS;
  const list = members.slice(0, CAMPAIGN_MAX_RECIPIENTS);

  const [optOuts, earlier] = await Promise.all([
    prisma.whatsAppOptOut.findMany({
      where: { phone: { in: list.map((m) => m.phone) } },
      select: { phone: true },
    }),
    prisma.whatsAppMessage.findMany({
      where: {
        templateName: input.templateName,
        status: { not: "FAILED" },
        waitlistEntryId: { in: list.map((m) => m.id) },
      },
      distinct: ["waitlistEntryId"],
      select: { waitlistEntryId: true },
    }),
  ]);
  const stopped = new Set(optOuts.map((o) => o.phone));
  const got = new Set(earlier.map((m) => m.waitlistEntryId));

  const plan: CampaignPlan = {
    matched: list.length,
    optedOut: 0,
    unsubscribed: 0,
    missingCode: 0,
    alreadyGot: 0,
    repeats: 0,
    ids: [],
    overLimit,
  };
  for (const member of list) {
    if (stopped.has(member.phone)) plan.optedOut++;
    else if (member.unsubscribedAt) plan.unsubscribed++;
    else if (input.needsCode && !member.insiderCode) plan.missingCode++;
    else if (got.has(member.id) && !input.allowRepeat) plan.alreadyGot++;
    else {
      if (got.has(member.id)) plan.repeats++;
      plan.ids.push(member.id);
    }
  }
  return plan;
}

// ---------- Sending ----------

export interface CreateCampaignInput {
  template: Pick<
    GupshupTemplateSummary,
    "id" | "name" | "category" | "language" | "bodyText"
  >;
  fill: CampaignFillSlot[];
  headerImageUrl: string | null;
  audience: CampaignAudience;
  plannedCount: number;
}

export async function createCampaign(
  input: CreateCampaignInput,
  actor: AuditActor,
): Promise<{ id: string }> {
  const fill = input.fill.map((slot) =>
    slot.kind === "text"
      ? { kind: slot.kind, text: cleanFillText(slot.text ?? "") }
      : { kind: slot.kind },
  );
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.whatsAppCampaign.create({
      data: {
        gupshupTemplateId: input.template.id,
        templateName: input.template.name,
        category: input.template.category,
        language: input.template.language,
        bodyText: input.template.bodyText,
        fill,
        headerImageUrl: input.headerImageUrl,
        audienceLabel: audienceLabel(input.audience),
        plannedCount: input.plannedCount,
        createdById: actor.staffUserId,
      },
      select: { id: true },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.whatsapp.campaign",
        entityType: "WhatsAppCampaign",
        entityId: campaign.id,
        afterState: {
          templateName: input.template.name,
          audience: audienceLabel(input.audience),
          plannedCount: input.plannedCount,
        },
      },
      tx,
    );
    return campaign;
  });
}

function readFill(raw: Prisma.JsonValue): CampaignFillSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const kind = (item as Record<string, unknown>).kind;
    const text = (item as Record<string, unknown>).text;
    if (!CAMPAIGN_FILL_KINDS.includes(kind as CampaignFillKind)) return [];
    return [
      {
        kind: kind as CampaignFillKind,
        ...(typeof text === "string" ? { text } : {}),
      },
    ];
  });
}

export interface CampaignBatchResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Sends one batch of a campaign. Every member is checked again here (STOP,
 * unsubscribed, missing values), so a stale page can't reach the wrong
 * people. Never throws for one person's failure.
 */
export async function sendCampaignBatch(
  campaignId: string,
  ids: string[],
  context: FillContext,
  options: {
    config?: GupshupConfig | null;
    fetchImpl?: typeof fetch;
    pauseMs?: number;
  } = {},
): Promise<CampaignBatchResult | { error: "NOT_FOUND" | "NOT_CONFIGURED" }> {
  const config =
    options.config === undefined ? readGupshupConfig() : options.config;
  if (!config) return { error: "NOT_CONFIGURED" };
  const campaign = await prisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return { error: "NOT_FOUND" };
  const fill = readFill(campaign.fill);

  const unique = [...new Set(ids)].slice(0, CAMPAIGN_BATCH_SIZE);
  const members = await prisma.waitlistEntry.findMany({
    where: { id: { in: unique }, unsubscribedAt: null },
    select: { id: true, fullName: true, phone: true, insiderCode: true },
  });
  const stopped = new Set(
    (
      await prisma.whatsAppOptOut.findMany({
        where: { phone: { in: members.map((m) => m.phone) } },
        select: { phone: true },
      })
    ).map((o) => o.phone),
  );

  const result: CampaignBatchResult = {
    sent: 0,
    failed: 0,
    skipped: unique.length - members.length,
  };
  for (const member of members) {
    const params = stopped.has(member.phone)
      ? null
      : campaignParams(fill, member, context);
    if (!params) {
      result.skipped++;
      continue;
    }
    try {
      const sent = await deliverTemplate(
        {
          purpose: "CAMPAIGN",
          phone: member.phone,
          templateId: campaign.gupshupTemplateId,
          templateName: campaign.templateName,
          params,
          imageUrl: campaign.headerImageUrl,
          waitlistEntryId: member.id,
          campaignId: campaign.id,
        },
        config,
        options.fetchImpl,
      );
      result[sent.status]++;
    } catch (error) {
      console.error("[whatsapp] campaign send error", campaign.id, error);
      result.failed++;
    }
    if (options.pauseMs) {
      await new Promise((resolve) => setTimeout(resolve, options.pauseMs));
    }
  }
  return result;
}

/** One test message with sample values, logged without a campaign. */
export async function sendCampaignTest(
  input: {
    template: Pick<GupshupTemplateSummary, "id" | "name">;
    fill: CampaignFillSlot[];
    headerImageUrl: string | null;
    phone: string;
  },
  options: { config?: GupshupConfig | null; fetchImpl?: typeof fetch } = {},
) {
  const config =
    options.config === undefined ? readGupshupConfig() : options.config;
  if (!config) return { status: "skipped" as const };
  return deliverTemplate(
    {
      purpose: "CAMPAIGN",
      phone: input.phone,
      templateId: input.template.id,
      templateName: input.template.name,
      params: sampleCampaignParams(input.fill),
      imageUrl: input.headerImageUrl,
    },
    config,
    options.fetchImpl,
  );
}

// ---------- Log ----------

export type CampaignCounts = Record<WhatsAppStatus, number> & {
  total: number;
};

function emptyCounts(): CampaignCounts {
  return { SENDING: 0, SENT: 0, DELIVERED: 0, READ: 0, FAILED: 0, total: 0 };
}

export interface CampaignListRow {
  id: string;
  templateName: string;
  category: string;
  audienceLabel: string;
  plannedCount: number;
  createdAt: Date;
  sentBy: string | null;
  counts: CampaignCounts;
}

export async function listCampaigns(input: {
  page: number;
  pageSize: number;
}): Promise<{ rows: CampaignListRow[]; hasNext: boolean }> {
  const rows = await prisma.whatsAppCampaign.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (Math.max(input.page, 1) - 1) * input.pageSize,
    take: input.pageSize + 1,
  });
  const page = rows.slice(0, input.pageSize);
  const ids = page.map((r) => r.id);
  const staffIds = [
    ...new Set(page.map((r) => r.createdById).filter(Boolean)),
  ] as string[];
  const [grouped, staff] = await Promise.all([
    ids.length
      ? prisma.whatsAppMessage.groupBy({
          by: ["campaignId", "status"],
          where: { campaignId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    staffIds.length
      ? prisma.staffUser.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const names = new Map(staff.map((s) => [s.id, s.name]));
  return {
    rows: page.map((row) => {
      const counts = emptyCounts();
      for (const g of grouped) {
        if (g.campaignId !== row.id) continue;
        counts[g.status] = g._count._all;
        counts.total += g._count._all;
      }
      return {
        id: row.id,
        templateName: row.templateName,
        category: row.category,
        audienceLabel: row.audienceLabel,
        plannedCount: row.plannedCount,
        createdAt: row.createdAt,
        sentBy: row.createdById ? (names.get(row.createdById) ?? null) : null,
        counts,
      };
    }),
    hasNext: rows.length > input.pageSize,
  };
}

export interface CampaignDetail extends CampaignListRow {
  bodyText: string;
  fill: CampaignFillSlot[];
  headerImageUrl: string | null;
}

export async function getCampaign(id: string): Promise<CampaignDetail | null> {
  const row = await prisma.whatsAppCampaign.findUnique({ where: { id } });
  if (!row) return null;
  const [grouped, staff] = await Promise.all([
    prisma.whatsAppMessage.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { _all: true },
    }),
    row.createdById
      ? prisma.staffUser.findUnique({
          where: { id: row.createdById },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);
  const counts = emptyCounts();
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.total += g._count._all;
  }
  return {
    id: row.id,
    templateName: row.templateName,
    category: row.category,
    audienceLabel: row.audienceLabel,
    plannedCount: row.plannedCount,
    createdAt: row.createdAt,
    sentBy: staff?.name ?? null,
    counts,
    bodyText: row.bodyText,
    fill: readFill(row.fill),
    headerImageUrl: row.headerImageUrl,
  };
}

/** WhatsApps that belong to Insiders: sends from admin plus the automatic ones. */
export const INSIDER_WHATSAPP_PURPOSES = [
  "CAMPAIGN",
  "WAITLIST_JOINED",
  "INSIDER_CODE",
] as const;
export type InsiderWhatsAppPurpose = (typeof INSIDER_WHATSAPP_PURPOSES)[number];

export interface InsiderWhatsAppStats {
  all: CampaignCounts;
  byPurpose: Record<InsiderWhatsAppPurpose, CampaignCounts>;
  topFailures: { reason: string; count: number }[];
}

/**
 * Totals for Insider WhatsApps sent since `since`, or in the last `days` days.
 * All time when neither is given.
 */
export async function getInsiderWhatsAppStats(
  input: { since?: Date; days?: number } = {},
): Promise<InsiderWhatsAppStats> {
  const since =
    input.since ??
    (input.days ? new Date(Date.now() - input.days * 86_400_000) : undefined);
  const where: Prisma.WhatsAppMessageWhereInput = {
    purpose: { in: [...INSIDER_WHATSAPP_PURPOSES] },
    ...(since ? { createdAt: { gte: since } } : {}),
  };
  const [grouped, failures] = await Promise.all([
    prisma.whatsAppMessage.groupBy({
      by: ["purpose", "status"],
      where,
      _count: { _all: true },
    }),
    prisma.whatsAppMessage.groupBy({
      by: ["failureReason"],
      where: { ...where, status: "FAILED" },
      _count: { _all: true },
      orderBy: { _count: { failureReason: "desc" } },
      take: 5,
    }),
  ]);
  const all = emptyCounts();
  const byPurpose = {
    CAMPAIGN: emptyCounts(),
    WAITLIST_JOINED: emptyCounts(),
    INSIDER_CODE: emptyCounts(),
  };
  for (const g of grouped) {
    const n = g._count._all;
    all[g.status] += n;
    all.total += n;
    const bucket = byPurpose[g.purpose as InsiderWhatsAppPurpose];
    bucket[g.status] += n;
    bucket.total += n;
  }
  const merged = new Map<string, number>();
  for (const f of failures) {
    const reason = f.failureReason?.trim() || "No reason given";
    merged.set(reason, (merged.get(reason) ?? 0) + f._count._all);
  }
  return {
    all,
    byPurpose,
    topFailures: [...merged]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
  };
}
