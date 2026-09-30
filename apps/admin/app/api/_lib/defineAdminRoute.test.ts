import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const requireStaffSession = vi.fn();
vi.mock("./requireStaffSession", () => ({
  requireStaffSession: (...args: unknown[]) => requireStaffSession(...args),
}));

import { defineAdminRoute } from "./defineAdminRoute";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("defineAdminRoute", () => {
  beforeEach(() => {
    requireStaffSession.mockReset();
    requireStaffSession.mockResolvedValue({
      ok: true,
      context: { staffUserId: "staff-1", permissions: [] },
    });
  });

  const schema = z.object({
    name: z.string({ error: "Enter a name." }).trim().min(1, "Enter a name."),
  });

  it("returns the session failure without running the handler", async () => {
    const denied = new Response("no", { status: 403 });
    requireStaffSession.mockResolvedValue({ ok: false, response: denied });
    const handler = vi.fn();
    const route = defineAdminRoute(
      { permission: "x:y", body: schema },
      handler,
    );

    const response = await route(jsonRequest({ name: "a" }));

    expect(response).toBe(denied);
    expect(handler).not.toHaveBeenCalled();
    expect(requireStaffSession).toHaveBeenCalledWith(
      expect.any(Request),
      "x:y",
    );
  });

  it("rejects an unreadable body with the empty-body message", async () => {
    const route = defineAdminRoute(
      { body: schema, emptyBodyMessage: "Nothing to update." },
      vi.fn(),
    );
    const response = await route(jsonRequest("not json"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Nothing to update.",
    });
  });

  it("rejects a body that fails the schema with the first message", async () => {
    const route = defineAdminRoute({ body: schema }, vi.fn());
    const response = await route(jsonRequest({ name: "   " }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Enter a name.",
    });
  });

  it("passes parsed body, staff and params to the handler", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const route = defineAdminRoute<typeof schema, { id: string }>(
      { body: schema },
      handler,
    );

    await route(jsonRequest({ name: "  Ada " }), {
      params: Promise.resolve({ id: "7" }),
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: "Ada" },
        staff: { staffUserId: "staff-1", permissions: [] },
        params: { id: "7" },
      }),
    );
  });
});
