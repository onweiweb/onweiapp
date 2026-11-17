import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { uploadWhatsAppImage } from "../../../whatsapp/_image";

// Header image for a send from Insiders > WhatsApp.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage" },
  async ({ request }) => uploadWhatsAppImage(request),
);
