import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { uploadImageFromForm } from "../../_lib/uploadImageRoute";

// A photo inside a newsletter. Returns the public URL the editor inserts.
export const POST = defineAdminRoute(
  { permission: "newsletter:manage" },
  async ({ request }) => uploadImageFromForm(request, "newsletter"),
);
