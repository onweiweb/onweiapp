import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeVideoId } from "./youtube";

describe("youtubeVideoId", () => {
  it("reads every common link shape", () => {
    expect(
      youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3"),
    ).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(youtubeVideoId("youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(youtubeVideoId("https://m.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("refuses other sites and broken links", () => {
    expect(youtubeVideoId("https://vimeo.com/123")).toBeNull();
    expect(
      youtubeVideoId("https://evil.example/watch?v=dQw4w9WgXcQ"),
    ).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(youtubeVideoId("")).toBeNull();
    expect(youtubeVideoId(null)).toBeNull();
  });

  it("builds a no-cookie embed link", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/,
    );
  });
});
