import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { uploadPublicFile } from "../../../_lib/storage";

// Category page banner: a photo or an animated GIF, shown full width at the
// top of /collection/<category>. GIFs are kept as they are (not resized), so
// the size limit is a little higher than for photos.
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const POST = defineAdminRoute(
  { permission: "category:update" },
  async ({ request }) => {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Choose an image or GIF to upload." },
        { status: 400 },
      );
    }
    const ext = TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Use a JPEG, PNG, WebP or GIF." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "That file is too large, the limit is 8MB." },
        { status: 400 },
      );
    }
    const blob = await uploadPublicFile(
      `category-banners/${crypto.randomUUID()}.${ext}`,
      file,
    );
    return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
  },
);
