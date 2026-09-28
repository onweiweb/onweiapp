import { prisma } from "@onwei/database";
import type { SiteMode } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";

const SINGLETON_ID = "singleton";
// Read on effectively every request — apps/web/proxy.ts's site-mode gate,
// and every waitlist submission for the phone-validation flag — so a live
// query per request doesn't scale. An admin change on /settings takes up to
// this long to actually take effect for other readers; updateSiteSetting
// below clears it immediately for the process that made the change.
const CACHE_TTL_MS = 15_000;

export interface SiteSettingSummary {
  siteMode: SiteMode;
  launchAt: Date;
  allowInternationalPhone: boolean;
}

let cached: { value: SiteSettingSummary; expiresAt: number } | null = null;

function toSummary(row: {
  siteMode: SiteMode;
  launchAt: Date;
  allowInternationalPhone: boolean;
}): SiteSettingSummary {
  return {
    siteMode: row.siteMode,
    launchAt: row.launchAt,
    allowInternationalPhone: row.allowInternationalPhone,
  };
}

/**
 * The singleton row is created by packages/database/prisma/seed.ts, so this
 * trusts it exists rather than upserting a fallback on every read.
 */
export async function getSiteSetting(): Promise<SiteSettingSummary> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const row = await prisma.siteSetting.findUniqueOrThrow({
    where: { id: SINGLETON_ID },
  });

  const value = toSummary(row);
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export interface UpdateSiteSettingInput {
  siteMode?: SiteMode;
  launchAt?: Date;
  allowInternationalPhone?: boolean;
}

export async function updateSiteSetting(
  input: UpdateSiteSettingInput,
  actor: AuditActor,
): Promise<SiteSettingSummary> {
  const before = await prisma.siteSetting.findUniqueOrThrow({
    where: { id: SINGLETON_ID },
  });

  const row = await prisma.siteSetting.update({
    where: { id: SINGLETON_ID },
    data: {
      siteMode: input.siteMode,
      launchAt: input.launchAt,
      allowInternationalPhone: input.allowInternationalPhone,
      updatedByStaffId: actor.staffUserId,
    },
  });

  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "siteSetting.update",
    entityType: "SiteSetting",
    entityId: row.id,
    beforeState: before,
    afterState: row,
  });

  cached = null;

  return toSummary(row);
}
