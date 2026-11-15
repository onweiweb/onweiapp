import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { saveCardAddress, setCardPosted } from "./cardAddress";
import { fillInsiderCodePool, takeFreePrintedCode } from "./codePool";
import { assignInsiderCode } from "./insiderCode";
import {
  claimInsiderEmailBatch,
  claimInsiderEmailFor,
  markInsiderEmailSent,
  releaseInsiderEmailClaim,
  unsubscribeWaitlistEntry,
} from "./insiderEmails";
import {
  createInsiderTier,
  deleteInsiderTier,
  updateInsiderTier,
} from "./insiderTiers";

// Test rows only: fake names, example.test emails, cleaned up afterwards.
function fakePhone(): string {
  return `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

describe.skipIf(!process.env.DATABASE_URL)(
  "insiders (integration)",
  { timeout: 30000 },
  () => {
    const tag = `insider-test-${Date.now()}`;
    const entryIds: string[] = [];
    const tierIds: string[] = [];
    let staffUserId: string;
    const startedAt = new Date();

    async function makeEntry(): Promise<string> {
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: "Test Insider",
          email: `${tag}-${crypto.randomUUID()}@example.test`,
          phone: fakePhone(),
          consentVersion: "test",
          // Far past, so these rows never fall inside a real tier.
          submittedAt: new Date("2001-01-01T00:00:00Z"),
        },
      });
      entryIds.push(row.id);
      return row.id;
    }

    beforeAll(async () => {
      staffUserId = (await prisma.staffUser.findFirstOrThrow()).id;
    });

    // Test cards use negative numbers: they sort before real cards (so the
    // tests take them first) and never move the "highest card" a fill
    // numbers from.
    const testCardIds: string[] = [];
    // Real dev cards a test entry took, handed back afterwards.
    const touchedCardIds = new Set<string>();

    // Each batch is numbered below the last, so the newest test cards are
    // always the lowest free cards.
    let nextTestCard = -1_000_000;
    async function makeTestCards(count: number): Promise<void> {
      nextTestCard -= 100;
      for (let i = 0; i < count; i++) {
        const row = await prisma.insiderCode.create({
          data: {
            code: `${tag}-card-${testCardIds.length}`,
            cardNumber: nextTestCard + i,
          },
        });
        testCardIds.push(row.id);
      }
    }

    async function rememberCardsOf(ids: string[]): Promise<void> {
      const cards = await prisma.insiderCode.findMany({
        where: { waitlistEntryId: { in: ids } },
        select: { id: true },
      });
      for (const card of cards) touchedCardIds.add(card.id);
    }

    afterAll(async () => {
      await rememberCardsOf(entryIds);
      await prisma.insiderCode.deleteMany({
        where: { id: { in: testCardIds } },
      });
      const realTouched = [...touchedCardIds].filter(
        (id) => !testCardIds.includes(id),
      );
      // Cards made during the tests (a fill adding test entries) are
      // removed; real cards a test entry took go back to free.
      await prisma.insiderCode.deleteMany({
        where: { id: { in: realTouched }, createdAt: { gte: startedAt } },
      });
      await prisma.insiderCode.updateMany({
        where: { id: { in: realTouched } },
        data: { waitlistEntryId: null, assignedAt: null },
      });
      await prisma.waitlistEntry.deleteMany({
        where: { id: { in: entryIds } },
      });
      await prisma.insiderTier.deleteMany({ where: { id: { in: tierIds } } });
    });

    it("gives each entry one code and keeps it", async () => {
      const id = await makeEntry();
      const first = await assignInsiderCode(id);
      const second = await assignInsiderCode(id);
      expect(first).toMatch(/^WEI\d{4}$/);
      expect(second).toBe(first);
    });

    it("never hands out a code that is taken", async () => {
      const a = await makeEntry();
      const b = await makeEntry();
      const codeA = await assignInsiderCode(a);
      const digits = Number(codeA.slice(3));
      // First draw collides with A's code, second draw is free.
      let calls = 0;
      const codeB = await assignInsiderCode(b, () =>
        calls++ === 0 ? digits : digits === 9999 ? 1000 : digits + 1,
      );
      expect(codeB).not.toBe(codeA);
    });

    it("gives a new member a free printed card", async () => {
      // Another test file may take this card first; any free card will do.
      await makeTestCards(1);
      const id = await makeEntry();
      const code = await assignInsiderCode(id);
      const card = await prisma.insiderCode.findUniqueOrThrow({
        where: { waitlistEntryId: id },
      });
      touchedCardIds.add(card.id);
      expect(card.code).toBe(code);
      expect(card.assignedAt).not.toBeNull();
      // Nothing lower than their card was still free when they took it.
      const lowerFree = await prisma.insiderCode.count({
        where: {
          cardNumber: { lt: card.cardNumber },
          waitlistEntryId: null,
          assignedAt: null,
          id: { notIn: testCardIds },
        },
      });
      expect(lowerFree).toBe(0);
      // A member with a code never takes a second card.
      expect(await takeFreePrintedCode(id)).toBeNull();
    });

    it("never gives two members the same card at once", async () => {
      await makeTestCards(10);
      const ids = await Promise.all(
        Array.from({ length: 10 }, () => makeEntry()),
      );
      const codes = await Promise.all(ids.map((id) => assignInsiderCode(id)));
      expect(new Set(codes).size).toBe(10);
      const cards = await prisma.insiderCode.findMany({
        where: { waitlistEntryId: { in: ids } },
      });
      expect(cards).toHaveLength(10);
      for (const card of cards) touchedCardIds.add(card.id);
    });

    it("never hands out a deleted member's card again", async () => {
      await makeTestCards(1);
      const cardId = testCardIds[testCardIds.length - 1]!;
      const id = await makeEntry();
      await assignInsiderCode(id);
      await prisma.waitlistEntry.delete({ where: { id } });
      entryIds.splice(entryIds.indexOf(id), 1);
      const card = await prisma.insiderCode.findUniqueOrThrow({
        where: { id: cardId },
      });
      expect(card.waitlistEntryId).toBeNull();
      expect(card.assignedAt).not.toBeNull();

      const next = await makeEntry();
      await assignInsiderCode(next);
      const nextCard = await prisma.insiderCode.findUnique({
        where: { waitlistEntryId: next },
      });
      expect(nextCard?.id).not.toBe(cardId);
      if (nextCard) touchedCardIds.add(nextCard.id);
    });

    it("adds members without a card, and a second fill adds nothing", async () => {
      // An entry whose code came before printed cards existed.
      const id = await makeEntry();
      await prisma.waitlistEntry.update({
        where: { id },
        data: { insiderCode: `${tag}-old` },
      });
      const first = await fillInsiderCodePool({ staffUserId, target: 0 });
      expect(first.addedForMembers).toBeGreaterThanOrEqual(1);
      expect(first.addedFree).toBe(0);
      const card = await prisma.insiderCode.findUniqueOrThrow({
        where: { waitlistEntryId: id },
      });
      expect(card.code).toBe(`${tag}-old`);
      expect(card.cardNumber).toBeGreaterThan(0);
      touchedCardIds.add(card.id);

      const second = await fillInsiderCodePool({ staffUserId, target: 0 });
      expect(second.addedForMembers + second.addedFree).toBe(0);
    });

    it("claims a member once, even when two sends race", async () => {
      const id = await makeEntry();
      await assignInsiderCode(id);
      const [one, two] = await Promise.all([
        claimInsiderEmailBatch(500),
        claimInsiderEmailBatch(500),
      ]);
      const hits = [...one, ...two].filter((r) => r.id === id);
      expect(hits).toHaveLength(1);

      // A failed send is released and can be claimed again.
      await releaseInsiderEmailClaim(id);
      const again = await claimInsiderEmailBatch(500);
      expect(again.some((r) => r.id === id)).toBe(true);

      await markInsiderEmailSent(id);
      const afterSent = await claimInsiderEmailBatch(500);
      expect(afterSent.some((r) => r.id === id)).toBe(false);

      // Release everything this test claimed that isn't ours to send.
      for (const r of [...one, ...two, ...again, ...afterSent]) {
        if (!entryIds.includes(r.id)) await releaseInsiderEmailClaim(r.id);
      }
    });

    it("claims one new member for the email right after they join", async () => {
      const id = await makeEntry();
      expect(await claimInsiderEmailFor(id)).toBeNull(); // no code yet
      const code = await assignInsiderCode(id);
      const [one, two] = await Promise.all([
        claimInsiderEmailFor(id),
        claimInsiderEmailFor(id),
      ]);
      const claimed = [one, two].filter(Boolean);
      expect(claimed).toHaveLength(1);
      expect(claimed[0]?.insiderCode).toBe(code);

      await markInsiderEmailSent(id);
      expect(await claimInsiderEmailFor(id)).toBeNull();
    });

    it("skips unsubscribed members", async () => {
      const id = await makeEntry();
      await assignInsiderCode(id);
      expect(await unsubscribeWaitlistEntry(id)).toBe(true);
      const batch = await claimInsiderEmailBatch(500);
      expect(batch.some((r) => r.id === id)).toBe(false);
      for (const r of batch) {
        if (!entryIds.includes(r.id)) await releaseInsiderEmailClaim(r.id);
      }
    });

    it("validates and saves the card address", async () => {
      const id = await makeEntry();
      const bad = await saveCardAddress(id, {
        fullName: "T",
        phone: "123",
        line1: "",
        city: "",
        state: "Nowhere",
        postalCode: "012345",
      });
      expect(bad).toMatchObject({ ok: false, reason: "INVALID_FIELDS" });
      if (!bad.ok && bad.reason === "INVALID_FIELDS") {
        expect(bad.fields.sort()).toEqual(
          ["city", "fullName", "line1", "phone", "postalCode", "state"].sort(),
        );
      }

      const good = await saveCardAddress(id, {
        fullName: "Test Insider",
        phone: "9876543210",
        line1: "14 Test Road",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400050",
      });
      expect(good).toEqual({ ok: true });
      const row = await prisma.insiderCardAddress.findUniqueOrThrow({
        where: { waitlistEntryId: id },
      });
      expect(row.phone).toBe("+919876543210");

      await setCardPosted(row.id, true, { staffUserId });
      const posted = await prisma.insiderCardAddress.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(posted.postedAt).not.toBeNull();
    });

    it("refuses overlapping tiers", async () => {
      const first = await createInsiderTier(
        {
          label: "Test tier A",
          startDate: "1990-01-01",
          endDate: "1990-01-10",
          percent: 15,
        },
        { staffUserId },
      );
      expect(first.ok).toBe(true);
      if (first.ok) tierIds.push(first.tier.id);

      const clash = await createInsiderTier(
        {
          label: "Test tier B",
          startDate: "1990-01-10",
          endDate: "1990-01-20",
          percent: 10,
        },
        { staffUserId },
      );
      expect(clash).toMatchObject({ ok: false, reason: "OVERLAPS" });

      const next = await createInsiderTier(
        {
          label: "Test tier B",
          startDate: "1990-01-11",
          endDate: "1990-01-20",
          percent: 10,
        },
        { staffUserId },
      );
      expect(next.ok).toBe(true);
      if (next.ok) {
        tierIds.push(next.tier.id);
        // Editing a tier doesn't clash with itself.
        const edited = await updateInsiderTier(
          next.tier.id,
          {
            label: "Test tier B",
            startDate: "1990-01-11",
            endDate: "1990-01-25",
            percent: 12,
          },
          { staffUserId },
        );
        expect(edited.ok).toBe(true);
        expect(
          (await deleteInsiderTier(next.tier.id, { staffUserId })).ok,
        ).toBe(true);
      }
    });
  },
);
