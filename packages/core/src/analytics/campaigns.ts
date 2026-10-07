import { prisma } from "@onwei/database";

/**
 * Campaign names already used on real signups, most recent first, so the link
 * builder can suggest "launch-week" instead of letting "launch week 2" and
 * "launchweek" split one push into several report rows.
 */
export async function listKnownCampaigns(limit = 20): Promise<string[]> {
  const rows = await prisma.waitlistEntry.groupBy({
    by: ["utmCampaign"],
    where: { utmCampaign: { not: null } },
    _max: { submittedAt: true },
    orderBy: { _max: { submittedAt: "desc" } },
    take: limit,
  });
  return rows.flatMap((r) => (r.utmCampaign ? [r.utmCampaign] : []));
}
