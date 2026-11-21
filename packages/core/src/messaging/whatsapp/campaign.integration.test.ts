import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createCampaign,
  getInsiderWhatsAppStats,
  planCampaign,
  sendCampaignBatch,
  undeliverablePhones,
} from "./campaign";
import { deliverTemplate } from "./send";
import { applyGupshupStatus } from "./webhook";

const config = {
  apiKey: "test-key",
  appName: "TestApp",
  sourceNumber: "919000000000",
};
const context = {
  siteUrl: "https://www.onwei.in",
  secret: "test-insider-link-secret-at-least-32-chars",
};

describe.skipIf(!process.env.DATABASE_URL)(
  "Insiders WhatsApp campaigns (dev DB)",
  { timeout: 30000 },
  () => {
    const tag = crypto.randomUUID().slice(0, 8);
    const templateName = `test_campaign_${tag}`;
    const ids: string[] = [];
    const phones: string[] = [];
    let staffId: string;

    async function member(name: string, code: string | null) {
      const phone = `+9196${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
      phones.push(phone);
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: name,
          email: `campaign-${crypto.randomUUID()}@example.test`,
          phone,
          consentVersion: "test",
          insiderCode: code,
        },
      });
      ids.push(row.id);
      return row;
    }

    beforeAll(async () => {
      const staff = await prisma.staffUser.create({
        data: {
          email: `campaign-staff-${tag}@example.com`,
          passwordHash: "x",
          name: "Campaign Staff",
        },
      });
      staffId = staff.id;
      await member("Ready One", `TC${tag.slice(0, 4)}1`);
      await member("No Code", null);
      const stopped = await member("Said Stop", `TC${tag.slice(0, 4)}2`);
      await prisma.whatsAppOptOut.create({
        data: { phone: stopped.phone, source: "reply_stop" },
      });
    });

    afterAll(async () => {
      await prisma.whatsAppMessage.deleteMany({
        where: { phone: { in: phones } },
      });
      await prisma.whatsAppCampaign.deleteMany({ where: { templateName } });
      await prisma.whatsAppOptOut.deleteMany({
        where: { phone: { in: phones } },
      });
      await prisma.waitlistEntry.deleteMany({ where: { id: { in: ids } } });
      await prisma.auditLog.deleteMany({ where: { staffUserId: staffId } });
      await prisma.staffUser.delete({ where: { id: staffId } });
    });

    it("plans, sends, skips STOP and missing codes, and finds repeats", async () => {
      const audience = { group: "picked" as const, ids };
      const plan = await planCampaign({
        audience,
        templateName,
        needsCode: true,
        allowRepeat: false,
      });
      expect(plan).toMatchObject({ matched: 3, optedOut: 1, missingCode: 1 });
      expect(plan.ids).toEqual([ids[0]]);

      const campaign = await createCampaign(
        {
          template: {
            id: "tpl-1",
            name: templateName,
            category: "UTILITY",
            language: "en",
            bodyText: "Hi {{1}}, code {{2}}",
          },
          fill: [{ kind: "firstName" }, { kind: "insiderCode" }],
          headerImageUrl: null,
          audience,
          plannedCount: plan.ids.length,
        },
        { staffUserId: staffId },
      );

      const sentParams: string[] = [];
      // Sends to all three: the batch checks STOP and missing codes again.
      const result = await sendCampaignBatch(campaign.id, ids, context, {
        config,
        fetchImpl: async (_url, init) => {
          const body = new URLSearchParams(String(init?.body));
          sentParams.push(body.get("template")!);
          return new Response(
            JSON.stringify({
              status: "submitted",
              messageId: `m-${crypto.randomUUID()}`,
            }),
            { status: 202 },
          );
        },
      });
      expect(result).toEqual({ sent: 1, failed: 0, skipped: 2 });
      expect(JSON.parse(sentParams[0]!)).toEqual({
        id: "tpl-1",
        params: ["Ready", `TC${tag.slice(0, 4)}1`],
      });
      const logged = await prisma.whatsAppMessage.findFirstOrThrow({
        where: { campaignId: campaign.id },
      });
      expect(logged).toMatchObject({
        purpose: "CAMPAIGN",
        status: "SENT",
        templateName,
        waitlistEntryId: ids[0],
      });

      const again = await planCampaign({
        audience,
        templateName,
        needsCode: true,
        allowRepeat: false,
      });
      expect(again).toMatchObject({ alreadyGot: 1, ids: [] });
      const repeat = await planCampaign({
        audience,
        templateName,
        needsCode: true,
        allowRepeat: true,
      });
      expect(repeat).toMatchObject({ repeats: 1, ids: [ids[0]] });
    });
    it("counts Insider WhatsApps by status and lists failure reasons", async () => {
      const since = new Date(Date.now() - 1000);
      const before = await getInsiderWhatsAppStats({ since });
      await prisma.whatsAppMessage.createMany({
        data: [
          { purpose: "CAMPAIGN", phone: phones[0]!, status: "READ" },
          {
            purpose: "WAITLIST_JOINED",
            phone: phones[0]!,
            status: "DELIVERED",
          },
          {
            purpose: "INSIDER_CODE",
            phone: phones[0]!,
            status: "FAILED",
            failureReason: `Test failure ${tag}`,
          },
        ],
      });
      const after = await getInsiderWhatsAppStats({ since });
      expect(after.all.total - before.all.total).toBe(3);
      expect(after.all.READ - before.all.READ).toBe(1);
      expect(after.all.FAILED - before.all.FAILED).toBe(1);
      expect(
        after.byPurpose.WAITLIST_JOINED.DELIVERED -
          before.byPurpose.WAITLIST_JOINED.DELIVERED,
      ).toBe(1);
      expect(after.topFailures.map((f) => f.message)).toContain(
        `Test failure ${tag}`,
      );
    });

    it("retries when Gupshup says too many at once", async () => {
      let calls = 0;
      const fetchImpl = (async () => {
        calls++;
        return calls === 1
          ? new Response(JSON.stringify({ message: "Rate limit hit" }), {
              status: 429,
            })
          : Response.json({ status: "submitted", messageId: `ok-${tag}` });
      }) as typeof fetch;
      const result = await deliverTemplate(
        {
          purpose: "CAMPAIGN",
          phone: phones[0]!,
          templateId: "tpl-1",
          templateName,
          params: ["Ready"],
        },
        config,
        fetchImpl,
        [0, 0],
      );
      expect(result).toEqual({ status: "sent", messageId: `ok-${tag}` });
      expect(calls).toBe(2);
    });

    it("counts Meta's holds apart from failures and keeps the code", async () => {
      const since = new Date(Date.now() - 1000);
      const before = await getInsiderWhatsAppStats({ since });
      const held = await prisma.whatsAppMessage.create({
        data: {
          purpose: "CAMPAIGN",
          phone: phones[0]!,
          status: "SENT",
          providerMessageId: `held-${tag}`,
        },
      });
      await applyGupshupStatus({
        kind: "status",
        ids: [`held-${tag}`],
        status: "FAILED",
        failureReason:
          "131049: This message was not delivered to maintain healthy ecosystem engagement., (#131049)",
        at: new Date(),
      });
      const row = await prisma.whatsAppMessage.findUniqueOrThrow({
        where: { id: held.id },
      });
      expect(row.failureCode).toBe("131049");
      const after = await getInsiderWhatsAppStats({ since });
      expect(after.all.held - before.all.held).toBe(1);
      expect(after.all.FAILED - before.all.FAILED).toBe(0);
      expect(after.topFailures.map((f) => f.code)).not.toContain("131049");
    });

    it("leaves out numbers that aren't on WhatsApp until one gets through", async () => {
      const phone = phones[1]!;
      await prisma.whatsAppMessage.create({
        data: {
          purpose: "CAMPAIGN",
          phone,
          status: "FAILED",
          failureCode: "131026",
          failureReason: "131026: Message undeliverable",
        },
      });
      expect(await undeliverablePhones([phone])).toEqual(new Set([phone]));
      const plan = await planCampaign({
        audience: { group: "picked", ids: [ids[1]!] },
        templateName,
        needsCode: false,
        allowRepeat: true,
      });
      expect(plan).toMatchObject({ undeliverable: 1, ids: [] });
      await prisma.whatsAppMessage.create({
        data: { purpose: "CAMPAIGN", phone, status: "DELIVERED" },
      });
      expect(await undeliverablePhones([phone])).toEqual(new Set());
    });
  },
);
