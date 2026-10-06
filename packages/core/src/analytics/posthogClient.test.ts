import { describe, expect, it, vi } from "vitest";
import { readPosthogConfig, runHogql } from "./posthogClient";

describe("readPosthogConfig", () => {
  it("is null until both the key and project id are set", () => {
    expect(readPosthogConfig({})).toBeNull();
    expect(readPosthogConfig({ POSTHOG_PROJECT_ID: "1" })).toBeNull();
    expect(readPosthogConfig({ POSTHOG_ALLACCESS_TOKEN: "k" })).toBeNull();
  });
  it("accepts either name for the access key and defaults the host", () => {
    expect(
      readPosthogConfig({
        POSTHOG_PROJECT_ID: "1",
        POSTHOG_ALLACCESS_TOKEN: "k",
      }),
    ).toEqual({
      host: "https://us.posthog.com",
      projectId: "1",
      personalApiKey: "k",
      environment: "production",
    });
    expect(
      readPosthogConfig({
        POSTHOG_PROJECT_ID: "1",
        POSTHOG_PERSONAL_API_KEY: "p",
        POSTHOG_HOST: "https://eu.posthog.com/",
      })?.host,
    ).toBe("https://eu.posthog.com");
  });
});

describe("runHogql", () => {
  it("sends the query on one line", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    await runHogql(
      "SELECT 1\n   FROM events\n  WHERE x = {x}",
      { x: 1 },
      {
        config: {
          host: "https://h",
          projectId: "1",
          personalApiKey: "k",
          environment: "production",
        },
        fetchImpl: fetchImpl as never,
      },
    );
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body.query.query).toBe("SELECT 1 FROM events WHERE x = {x}");
  });
});
