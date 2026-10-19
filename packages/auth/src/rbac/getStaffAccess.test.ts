import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();
vi.mock("@onwei/database", () => ({
  prisma: {
    staffUser: { findUnique: (...a: unknown[]) => findUnique(...a) },
    permission: { findMany: (...a: unknown[]) => findMany(...a) },
  },
}));

import { getStaffAccess } from "./getStaffAccess";

const user = (over: object = {}) => ({
  name: "Sam",
  email: "sam@example.com",
  isActive: true,
  roles: [
    { role: { permissions: [{ permission: { key: "orders:view" } }] } },
    {
      role: {
        permissions: [
          { permission: { key: "orders:view" } },
          { permission: { key: "content:manage" } },
        ],
      },
    },
  ],
  ...over,
});

describe("getStaffAccess", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    findMany.mockResolvedValue([{ key: "orders:view" }, { key: "x:all" }]);
    delete process.env.SUPERADMIN_EMAIL;
  });

  it("returns null for an unknown user", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getStaffAccess("nope")).toBeNull();
  });

  it("merges role permissions without duplicates", async () => {
    findUnique.mockResolvedValue(user());
    const access = await getStaffAccess("1");
    expect(access?.name).toBe("Sam");
    expect([...(access?.permissions ?? [])].sort()).toEqual([
      "content:manage",
      "orders:view",
    ]);
  });

  it("gives the super-admin every permission", async () => {
    process.env.SUPERADMIN_EMAIL = "sam@example.com";
    findUnique.mockResolvedValue(user({ roles: [] }));
    const access = await getStaffAccess("1");
    expect(access?.permissions).toEqual(["orders:view", "x:all"]);
  });

  it("gives an inactive user no permissions", async () => {
    findUnique.mockResolvedValue(user({ isActive: false }));
    const access = await getStaffAccess("1");
    expect(access).toMatchObject({ isActive: false, permissions: [] });
  });
});
