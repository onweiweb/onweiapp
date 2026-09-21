import { prisma } from "@onwei/database";

/**
 * Upserts a newsletter subscription. Basic email format validation happens
 * at the API route boundary, not here — this function trusts its caller.
 */
export async function subscribeToNewsletter(
  email: string,
  source?: string,
): Promise<{ alreadySubscribed: boolean }> {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: { unsubscribedAt: null, ...(source ? { source } : {}) },
    create: { email, source },
  });

  return {
    alreadySubscribed: existing !== null && existing.unsubscribedAt === null,
  };
}
