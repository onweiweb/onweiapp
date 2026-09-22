import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { updateDsrStatus } from "./updateDsrStatus";

describe.skipIf(!process.env.DATABASE_URL)(
  "updateDsrStatus (integration)",
  { timeout: 20000 },
  () => {
    const createdRequestIds: string[] = [];
    const createdCustomerIds: string[] = [];
    const createdAuditLogIds: string[] = [];
    let actor: { staffUserId: string };

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-staff-${randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      actor = { staffUserId: staffUser.id };
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: actor.staffUserId } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
      });
      await prisma.dataSubjectRequest.deleteMany({
        where: { id: { in: createdRequestIds } },
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
      createdRequestIds.length = 0;
      createdCustomerIds.length = 0;
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    async function createFixtureRequest() {
      const customer = await prisma.customer.create({
        data: { email: `test-customer-${randomUUID()}@example.com` },
      });
      createdCustomerIds.push(customer.id);
      const request = await prisma.dataSubjectRequest.create({
        data: { customerId: customer.id, type: "ERASURE" },
      });
      createdRequestIds.push(request.id);
      return request;
    }

    it("moves through RECEIVED -> IN_PROGRESS -> FULFILLED, setting fulfilledAt", async () => {
      const request = await createFixtureRequest();

      await updateDsrStatus(request.id, "IN_PROGRESS", actor);
      const fulfilled = await updateDsrStatus(request.id, "FULFILLED", actor);

      expect(fulfilled.status).toBe("FULFILLED");
      expect(fulfilled.fulfilledAt).not.toBeNull();

      const auditLogs = await trackAuditLogsFor(request.id);
      expect(auditLogs.some((log) => log.action === "dsr.updateStatus")).toBe(
        true,
      );
    });

    it("rejects moving out of a terminal state", async () => {
      const request = await createFixtureRequest();
      await updateDsrStatus(request.id, "REJECTED", actor);

      await expect(
        updateDsrStatus(request.id, "IN_PROGRESS", actor),
      ).rejects.toThrow(/invalid-transition/);
    });
  },
);
