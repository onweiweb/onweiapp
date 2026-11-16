import { describe, expect, it } from "vitest";
import { checkInsiderUpdate, isAllowedUpdateLink } from "./insiderUpdates";

const base = {
  title: "Saturday pickleball",
  body: "Bring a friend.",
  isActive: true,
};

describe("Insider page updates", () => {
  it("accepts a complete update", () => {
    expect(
      checkInsiderUpdate({
        ...base,
        eventDate: "2026-12-05",
        linkUrl: "/collection/all",
      }),
    ).toBeNull();
  });

  it("names what's wrong", () => {
    expect(checkInsiderUpdate({ ...base, title: " " })).toBe("TITLE_REQUIRED");
    expect(checkInsiderUpdate({ ...base, body: "" })).toBe("BODY_REQUIRED");
    expect(checkInsiderUpdate({ ...base, eventDate: "2026-02-31" })).toBe(
      "INVALID_DATE",
    );
    expect(
      checkInsiderUpdate({ ...base, linkUrl: "javascript:alert(1)" }),
    ).toBe("INVALID_LINK");
  });

  it("only allows https links or our own pages", () => {
    expect(isAllowedUpdateLink("https://lu.ma/onwei")).toBe(true);
    expect(isAllowedUpdateLink("/insiders")).toBe(true);
    expect(isAllowedUpdateLink("//evil.example")).toBe(false);
    expect(isAllowedUpdateLink("http://insecure.example")).toBe(false);
  });
});
