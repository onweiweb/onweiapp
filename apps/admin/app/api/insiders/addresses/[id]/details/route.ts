import { updateCardAddressByStaff } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";

const MESSAGE = "Fill in the name, phone, address, city, state and PIN code.";

const bodySchema = z.object({
  fullName: z.string({ error: MESSAGE }).max(100),
  phone: z.string({ error: MESSAGE }).max(20),
  line1: z.string({ error: MESSAGE }).max(200),
  line2: z.string().max(200).optional(),
  city: z.string({ error: MESSAGE }).max(80),
  state: z.string({ error: MESSAGE }).max(80),
  postalCode: z.string({ error: MESSAGE }).max(10),
  /** Also send the card to iThink with the new address. */
  send: z.boolean().optional(),
});

const FIELD_NAMES: Record<string, string> = {
  fullName: "name",
  phone: "phone (a 10 digit Indian mobile)",
  line1: "address line 1",
  city: "city",
  state: "state",
  postalCode: "PIN code (6 digits)",
};

const OUTCOME: Record<string, string> = {
  SAVED: "Address saved.",
  SENT: "Address saved and the card sent to iThink.",
  SEND_FAILED: "Address saved, but iThink didn't take the card.",
  NOT_SENT_CANCEL_REFUSED:
    "Address saved, but iThink wouldn't cancel the old booking (it may already be picked up), so nothing new was sent.",
  NOT_SET_UP:
    "Address saved. iThink isn't connected on this site, so nothing was sent.",
};

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "waitlist:manage",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body, params }) => {
    const { send, ...address } = body;
    const result = await updateCardAddressByStaff(
      params.id,
      address,
      send ?? false,
      { staffUserId: staff.staffUserId },
    );
    if (!result.ok) {
      const error =
        result.reason === "INVALID_FIELDS"
          ? `Check the ${result.fields.map((f) => FIELD_NAMES[f] ?? f).join(", ")}.`
          : result.reason === "CHECK_FIRST"
            ? "iThink hasn't replied about the last send yet. Press \"Check again\" first, so the card isn't booked twice."
            : result.reason === "WITH_COURIER"
              ? "The courier already has this card, so its address can't be changed now."
              : "This address is no longer here. Refresh the page.";
      return NextResponse.json(
        {
          ok: false,
          error,
          ...(result.reason === "INVALID_FIELDS"
            ? { fields: result.fields }
            : {}),
        },
        { status: result.reason === "NOT_FOUND" ? 404 : 400 },
      );
    }
    const base = OUTCOME[result.outcome] ?? "Address saved.";
    return NextResponse.json({
      ok: true,
      sent: result.outcome === "SENT",
      warning: result.outcome !== "SAVED" && result.outcome !== "SENT",
      message: result.message ? `${base} iThink said: ${result.message}` : base,
    });
  },
);
