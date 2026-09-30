import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getClientIp } from "./getClientIp";
import { parseJsonBody } from "./parseJsonBody";

const schema = z.object({
  name: z.string({ error: "Enter a name." }).trim().min(1, "Enter a name."),
});

const post = (body: string) =>
  new Request("http://localhost/x", { method: "POST", body });

describe("parseJsonBody", () => {
  it("returns parsed data", async () => {
    const result = await parseJsonBody(post('{"name":" Ada "}'), schema);
    expect(result).toEqual({ ok: true, data: { name: "Ada" } });
  });

  it("treats an empty, invalid, array or non-object body as EMPTY", async () => {
    for (const body of ["", "not json", "[1]", "5", "null"]) {
      const result = await parseJsonBody(post(body), schema);
      expect(result).toMatchObject({ ok: false, kind: "EMPTY" });
    }
  });

  it("rejects a body over the size cap", async () => {
    const big = JSON.stringify({ name: "a".repeat(70 * 1024) });
    const result = await parseJsonBody(post(big), schema);
    expect(result).toMatchObject({ ok: false, kind: "EMPTY" });
  });

  it("reports the first schema message as INVALID", async () => {
    const result = await parseJsonBody(post('{"name":"  "}'), schema);
    expect(result).toEqual({
      ok: false,
      kind: "INVALID",
      message: "Enter a name.",
    });
  });
});

describe("getClientIp", () => {
  it("reads the first forwarded address", () => {
    const request = new Request("http://localhost/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("returns null without the header", () => {
    expect(getClientIp(new Request("http://localhost/x"))).toBeNull();
  });
});
