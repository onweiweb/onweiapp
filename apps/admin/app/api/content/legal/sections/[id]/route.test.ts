// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateLegalSection = vi.fn();
const deleteLegalSection = vi.fn();
vi.mock("@onwei/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onwei/core")>()),
  updateLegalSection: (...args: unknown[]) => updateLegalSection(...args),
  deleteLegalSection: (...args: unknown[]) => deleteLegalSection(...args),
}));
vi.mock("../../../../_lib/requireStaffSession", () => ({
  requireStaffSession: async () => ({
    ok: true,
    context: { staffUserId: "staff-1", permissions: ["content:manage"] },
  }),
}));
vi.mock("../../../../_lib/triggerCatalogRevalidate", () => ({
  triggerCatalogRevalidate: async () => undefined,
}));

import { DELETE, PATCH } from "./route";

const context = { params: Promise.resolve({ id: "sec-1" }) };

function patch(body: unknown) {
  return PATCH(
    new Request("http://localhost/api/content/legal/sections/sec-1", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    context,
  );
}

describe("legal section route", () => {
  beforeEach(() => {
    updateLegalSection.mockReset();
    deleteLegalSection.mockReset();
    updateLegalSection.mockResolvedValue({ id: "sec-1" });
    deleteLegalSection.mockResolvedValue(undefined);
  });

  it("saves an edited point as the signed-in staff member", async () => {
    const response = await patch({ heading: "New heading", isActive: false });
    expect(response.status).toBe(200);
    expect(updateLegalSection).toHaveBeenCalledWith(
      "sec-1",
      { heading: "New heading", isActive: false },
      { staffUserId: "staff-1" },
    );
  });

  it("rejects a blank heading with a plain message", async () => {
    const response = await patch({ heading: "   " });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Give the point a heading.",
    });
    expect(updateLegalSection).not.toHaveBeenCalled();
  });

  it("explains when the point no longer exists", async () => {
    updateLegalSection.mockRejectedValue(new Error("gone"));
    const response = await patch({ body: "Text" });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/Refresh and try again/);
  });

  it("deletes a point", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/content/legal/sections/sec-1", {
        method: "DELETE",
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(deleteLegalSection).toHaveBeenCalledWith("sec-1", {
      staffUserId: "staff-1",
    });
  });
});
