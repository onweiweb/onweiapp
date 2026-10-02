import { prisma } from "@onwei/database";

/**
 * Upserts a newsletter subscription. Basic email format validation happens
 * at the API route boundary, not here, this function trusts its caller.
 * `consent` is the proof captured from the public checkbox; staff adding a
 * subscriber by hand in admin passes none, so that row has no consent proof.
 */
export async function subscribeToNewsletter(
  email: string,
  source?: string,
  consent?: { version: string; ipAddress?: string },
): Promise<{ alreadySubscribed: boolean }> {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: {
      unsubscribedAt: null,
      ...(source ? { source } : {}),
      // Only a fresh opt-in (new or previously unsubscribed) records new
      // consent, an already-subscribed repeat keeps its original proof.
      ...(consent && !(existing && existing.unsubscribedAt === null)
        ? {
            consentVersion: consent.version,
            consentedAt: new Date(),
            ipAddress: consent.ipAddress ?? null,
          }
        : {}),
    },
    create: {
      email,
      source,
      ...(consent
        ? {
            consentVersion: consent.version,
            consentedAt: new Date(),
            ipAddress: consent.ipAddress ?? null,
          }
        : {}),
    },
  });

  return {
    alreadySubscribed: existing !== null && existing.unsubscribedAt === null,
  };
}
