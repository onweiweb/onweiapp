import { beforeEach, describe, expect, it, vi } from "vitest";

const { put } = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put }));

import { uploadPublicFile } from "./storage";

describe("uploadPublicFile", () => {
  beforeEach(() => put.mockReset());

  it("uploads publicly under the exact key and returns the url", async () => {
    put.mockResolvedValue({
      url: "https://x.public.blob.vercel-storage.com/a.png",
    });
    const file = new File(["x"], "a.png", { type: "image/png" });

    const result = await uploadPublicFile("products/1/a.png", file);

    expect(result).toEqual({
      url: "https://x.public.blob.vercel-storage.com/a.png",
    });
    expect(put).toHaveBeenCalledWith("products/1/a.png", file, {
      access: "public",
      addRandomSuffix: false,
    });
  });

  it("passes upload failures through", async () => {
    put.mockRejectedValueOnce(new Error("blob down"));
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(uploadPublicFile("k", file)).rejects.toThrow("blob down");
  });
});
