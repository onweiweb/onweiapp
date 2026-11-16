import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { uploadPublicFile } from "../../../_lib/storage";

// WhatsApp allows JPEG or PNG images up to 5MB in a template header.
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

// Uploads a WhatsApp header image and returns its public link. The template
// form saves the link with the template.
export const POST = defineAdminRoute(
  { permission: "settings:manage" },
  async ({ request }) => {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Choose an image to upload." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp only takes JPEG or PNG images." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "That image is too large, the limit is 5MB." },
        { status: 400 },
      );
    }
    const ext = file.type === "image/png" ? "png" : "jpg";
    const blob = await uploadPublicFile(
      `whatsapp/${crypto.randomUUID()}.${ext}`,
      file,
    );
    return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
  },
);
