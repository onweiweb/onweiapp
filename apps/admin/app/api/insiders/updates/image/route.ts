import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  uploadPublicFile,
} from "../../../../_lib/storage";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Photo for an Insiders page update. The form saves the link it returns.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage" },
  async ({ request }) => {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Choose a photo to upload." },
        { status: 400 },
      );
    }
    const ext = TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Use a JPEG, PNG or WebP photo." },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `That photo is too large, the limit is ${MAX_UPLOAD_LABEL}.`,
        },
        { status: 400 },
      );
    }
    const blob = await uploadPublicFile(
      `insider-updates/${crypto.randomUUID()}.${ext}`,
      file,
    );
    return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
  },
);
