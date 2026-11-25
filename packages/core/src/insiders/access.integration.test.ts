import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyToJoin,
  approveApplications,
  findInviter,
  getInsiderJoinMode,
  joinByInvite,
  rejectApplications,
  setInsiderJoinMode,
} from "./applications";
import { findInsiderPhone } from "./insiderSignIn";
import { getInviteProgress, grantInviteRewards } from "./inviteRewards";
import { subscribeToWaitlist } from "../waitlist/subscribeToWaitlist";

// Invite-only Insiders against the dev database: Path A (an Insider's number
// lets you in), Path B (apply, approve, reject), invite rewards and sign-in
// by Insider ID. Everything made here is removed afterwards.

const TAG = crypto.randomUUID().slice(0, 8);

function phone(): string {
  return `+919${Math.floor(100000000 + Math.random() * 900000000)}`;
}

describe.skipIf(!process.env.DATABASE_URL)(
  "Insider access (integration)",
  { timeout: 240000 },
  () => {
    let staffUserId: string;
    let previousMode: "OPEN" | "INVITE_OR_APPLY" = "OPEN";
    let inviterId: string;
    const inviterCode = `WEI${Math.floor(1000 + Math.random() * 9000)}`;
    const inviterPhone = phone();
    let ruleId: string;

    function input(overrides: Record<string, unknown> = {}) {
      const id = crypto.randomUUID().slice(0, 8);
      return {
        fullName: "Test Joiner",
        email: `test-access-${TAG}-${id}@example.com`,
        phone: phone(),
        activity: "Pilates",
        joinReasons: ["Events access"],
        sessionPick: "6am",
        gearWish: null,
        consentVersion: "test",
        ...overrides,
      };
    }

    beforeAll(async () => {
      staffUserId = (await prisma.staffUser.findFirstOrThrow()).id;
      previousMode = await getInsiderJoinMode();
      // The random inviter code must not clash with a real member.
      await prisma.waitlistEntry.deleteMany({
        where: {
          insiderCode: inviterCode,
          email: { startsWith: "test-access-" },
        },
      });
      const inviter = await prisma.waitlistEntry.create({
        data: {
          fullName: "Priya Tester",
          email: `test-access-${TAG}-inviter@example.com`,
          phone: inviterPhone,
          consentVersion: "test",
          insiderCode: inviterCode,
        },
      });
      inviterId = inviter.id;
      ruleId = (
        await prisma.insiderRewardRule.create({
          data: { invites: 2, rewardType: "AMOUNT_OFF", value: 500 },
        })
      ).id;
    }, 240000);

    afterAll(async () => {
      const entries = await prisma.waitlistEntry.findMany({
        where: { email: { startsWith: `test-access-${TAG}` } },
        select: { id: true, insiderCode: true },
      });
      const ids = entries.map((e) => e.id);
      const grants = await prisma.insiderRewardGrant.findMany({
        where: { ruleId },
        select: { couponId: true },
      });
      const couponIds = grants
        .map((g) => g.couponId)
        .filter((id): id is string => Boolean(id));
      await prisma.insiderRewardGrant.deleteMany({ where: { ruleId } });
      await prisma.discountRule.deleteMany({
        where: { couponId: { in: couponIds } },
      });
      await prisma.coupon.deleteMany({ where: { id: { in: couponIds } } });
      await prisma.insiderRewardRule.deleteMany({ where: { id: ruleId } });
      // Free printed cards taken by test members go back to the pile.
      await prisma.insiderCode.updateMany({
        where: { waitlistEntryId: { in: ids } },
        data: { waitlistEntryId: null, assignedAt: null },
      });
      await prisma.waitlistEntry.updateMany({
        where: { id: { in: ids } },
        data: { invitedByEntryId: null },
      });
      await prisma.waitlistEntry.deleteMany({ where: { id: { in: ids } } });
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: [...ids, ruleId] } },
      });
      await setInsiderJoinMode(previousMode, { staffUserId });
      await prisma.auditLog.deleteMany({
        where: {
          entityId: "singleton",
          action: "insider.joinMode.update",
          staffUserId,
        },
      });
    }, 240000);

    it("closes the open form when Insiders is invite-only", async () => {
      await setInsiderJoinMode("INVITE_OR_APPLY", { staffUserId });
      const result = await subscribeToWaitlist({
        ...input(),
        consentVersion: "test",
      });
      expect(result).toEqual({ ok: false, reason: "INVITE_ONLY" });
    });

    it("finds an inviter by number and turns away an unknown one", async () => {
      expect(await findInviter(inviterCode.toLowerCase())).toEqual({
        id: inviterId,
        firstName: "Priya",
      });
      expect(await findInviter("WEI0000")).toBeNull();
      expect(await joinByInvite({ ...input(), inviterCode: "nope" })).toEqual({
        ok: false,
        reason: "UNKNOWN_INVITER",
      });
    });

    it("lets people in with an Insider's number and rewards the inviter at 2", async () => {
      const first = await joinByInvite({ ...input(), inviterCode });
      expect(first).toMatchObject({ ok: true, inviterId, rewards: [] });
      if (!first.ok) return;
      expect(first.insiderCode).toMatch(/^WEI\d{4}$/);
      const row = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: first.entryId },
      });
      expect(row).toMatchObject({
        status: "APPROVED",
        invitedByEntryId: inviterId,
      });

      const second = await joinByInvite({ ...input(), inviterCode });
      expect(second.ok && second.rewards).toHaveLength(1);
      if (!second.ok) return;
      expect(second.rewards[0]).toMatchObject({
        entryId: inviterId,
        invites: 2,
      });
      const coupon = await prisma.coupon.findFirstOrThrow({
        where: { code: second.rewards[0]!.couponCode },
      });
      expect(coupon).toMatchObject({
        audience: "SPECIFIC",
        usageLimit: 1,
        allowedContacts: expect.arrayContaining([inviterPhone]) as unknown,
      });
      // Given once only.
      expect(await grantInviteRewards(inviterId)).toEqual([]);

      const progress = await getInviteProgress({
        email: null,
        phone: inviterPhone,
      });
      expect(progress).toMatchObject({ insiderCode: inviterCode, invites: 2 });
    });

    it("takes an application once per mobile, then approves or rejects it", async () => {
      const details = input();
      const applied = await applyToJoin(details);
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      expect(await applyToJoin({ ...input(), phone: details.phone })).toEqual({
        ok: false,
        reason: "ALREADY_APPLIED",
      });
      expect(await applyToJoin({ ...input(), joinReasons: [] })).toEqual({
        ok: false,
        reason: "INVALID_REASONS",
      });

      const pending = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: applied.entryId },
      });
      expect(pending).toMatchObject({ status: "APPLIED", insiderCode: null });

      const approved = await approveApplications([applied.entryId], {
        staffUserId,
      });
      expect(approved.approved).toHaveLength(1);
      const again = await approveApplications([applied.entryId], {
        staffUserId,
      });
      expect(again).toMatchObject({ approved: [], skipped: 1 });
      const member = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: applied.entryId },
      });
      expect(member.status).toBe("APPROVED");
      expect(member.insiderCode).toMatch(/^WEI\d{4}$/);

      const other = await applyToJoin(input());
      if (!other.ok) throw new Error(other.reason);
      const rejected = await rejectApplications([other.entryId], {
        staffUserId,
      });
      expect(rejected.rejected).toBe(1);
      const row = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: other.entryId },
      });
      expect(row).toMatchObject({ status: "REJECTED", insiderCode: null });
    });

    it("signs in by Insider ID only to a member's own number, showing its last digits", async () => {
      const found = await findInsiderPhone(` ${inviterCode.toLowerCase()} `);
      expect(found).toEqual({
        code: inviterCode,
        phone: inviterPhone,
        masked: `••••••${inviterPhone.slice(-4)}`,
      });
      expect(await findInsiderPhone("WEI0000")).toBeNull();
      expect(await findInsiderPhone("not an id")).toBeNull();
    });
  },
);
