import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_PRESETS,
  TOO_LARGE_MESSAGE,
  UPLOAD_FAILED_MESSAGE,
  fitWithin,
  readUploadResponse,
  uploadImage,
} from "./imageUpload";

describe("fitWithin", () => {
  it("shrinks a landscape photo to the long edge", () => {
    expect(fitWithin(6000, 4000, 2400)).toEqual({ width: 2400, height: 1600 });
  });

  it("shrinks a portrait photo to the long edge", () => {
    expect(fitWithin(3000, 4500, 2400)).toEqual({ width: 1600, height: 2400 });
  });

  it("leaves a photo that already fits alone", () => {
    expect(fitWithin(1200, 800, 2400)).toEqual({ width: 1200, height: 800 });
  });

  it("leaves a photo exactly at the limit alone", () => {
    expect(fitWithin(2400, 2400, 2400)).toEqual({ width: 2400, height: 2400 });
  });

  it("never returns a zero side for a very thin image", () => {
    expect(fitWithin(10000, 1, 2400)).toEqual({ width: 2400, height: 1 });
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("readUploadResponse", () => {
  it("returns the route's data on success", async () => {
    const result = await readUploadResponse(
      json({ ok: true, url: "https://x/a.webp" }, 201),
    );
    expect(result).toEqual({
      ok: true,
      data: { ok: true, url: "https://x/a.webp" },
    });
  });

  it("passes the route's own error through", async () => {
    const result = await readUploadResponse(
      json({ ok: false, error: "Use a JPEG, PNG or WebP photo." }, 400),
    );
    expect(result).toEqual({
      ok: false,
      error: "Use a JPEG, PNG or WebP photo.",
    });
  });

  it("explains Vercel's plain-text 413 refusal", async () => {
    const result = await readUploadResponse(
      new Response("Request Entity Too Large", { status: 413 }),
    );
    expect(result).toEqual({ ok: false, error: TOO_LARGE_MESSAGE });
  });

  it("handles a reply that isn't JSON", async () => {
    const result = await readUploadResponse(
      new Response("<html>oops</html>", { status: 502 }),
    );
    expect(result).toEqual({ ok: false, error: UPLOAD_FAILED_MESSAGE });
  });

  it("handles a failed request", async () => {
    expect(await readUploadResponse(null)).toEqual({
      ok: false,
      error: UPLOAD_FAILED_MESSAGE,
    });
  });
});

describe("uploadImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the file as form field 'file' and returns the reply", async () => {
    const fetchMock = vi.fn(async () => json({ ok: true, url: "u" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    // jsdom can't decode images, so the original file is sent unchanged.
    const file = new File(["abc"], "shirt.jpg", { type: "image/jpeg" });

    const result = await uploadImage(
      "/api/products/p1/images",
      file,
      IMAGE_PRESETS.catalog,
    );

    expect(result).toEqual({ ok: true, data: { ok: true, url: "u" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/products/p1/images");
    expect(init.method).toBe("POST");
    const sent = (init.body as FormData).get("file") as File;
    expect(sent.name).toBe("shirt.jpg");
  });

  it("returns a plain message when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const file = new File(["abc"], "a.png", { type: "image/png" });
    const result = await uploadImage("/x", file, IMAGE_PRESETS.whatsapp);
    expect(result).toEqual({ ok: false, error: UPLOAD_FAILED_MESSAGE });
  });
});
