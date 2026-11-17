import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { uploadWhatsAppImage } from "../_image";

// Uploads a WhatsApp header image and returns its public link. The template
// form saves the link with the template.
export const POST = defineAdminRoute(
  { permission: "settings:manage" },
  async ({ request }) => uploadWhatsAppImage(request),
);
