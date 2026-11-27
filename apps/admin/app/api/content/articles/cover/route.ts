import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { uploadImageFromForm } from "../../../_lib/uploadImageRoute";

// Multipart upload for an article's cover image. Returns the public URL;
// the editor saves it with the article.
export const POST = defineAdminRoute(
  { permission: "content:manage" },
  async ({ request }) => uploadImageFromForm(request, "articles"),
);
