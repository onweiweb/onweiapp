import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  uploadPublicFile,
} from "../../_lib/storage";

// WhatsApp allows JPEG or PNG images up to 5MB in a template header. Our own
// limit (MAX_UPLOAD_BYTES) is lower, so it always fits.
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/** Uploads a WhatsApp header image and returns its public link. */
export async function uploadWhatsAppImage(request: Request): Promise<Response> {
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `That image is too large, the limit is ${MAX_UPLOAD_LABEL}.`,
      },
      { status: 400 },
    );
  }
  const ext = file.type === "image/png" ? "png" : "jpg";
  const blob = await uploadPublicFile(
    `whatsapp/${crypto.randomUUID()}.${ext}`,
    file,
  );
  return NextResponse.json({ ok: true, url: blob.url }, { status: 201 });
}
