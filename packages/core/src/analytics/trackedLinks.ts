import { prisma } from "@onwei/database";

export interface TrackedLinkInput {
  url: string;
  channelId: string;
  pagePath: string;
  campaign: string;
  content: string | null;
  createdById: string | null;
}

/** Keeps a made link. Making the exact same link again reuses the saved row. */
export async function saveTrackedLink(input: TrackedLinkInput) {
  return prisma.trackedLink.upsert({
    where: { url: input.url },
    create: input,
    update: {},
  });
}

/** Newest first. Fetches `take` rows as given so the caller can look ahead one row. */
export async function listTrackedLinks(window: { skip: number; take: number }) {
  return prisma.trackedLink.findMany({
    orderBy: { createdAt: "desc" },
    skip: window.skip,
    take: window.take,
    include: { createdBy: { select: { name: true } } },
  });
}

/** True when a link was removed, false when it was already gone. */
export async function deleteTrackedLink(id: string): Promise<boolean> {
  const { count } = await prisma.trackedLink.deleteMany({ where: { id } });
  return count > 0;
}
