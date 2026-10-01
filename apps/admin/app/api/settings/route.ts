import { updateSiteSetting } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";

// These links are rendered as <a href> in the storefront footer, so only
// plain web addresses are accepted. A value like "javascript:..." would run
// when a visitor clicks it. An empty string or null clears the link.
const URL_MESSAGE = "Enter a full web address starting with https://";

const linkField = z
  .string()
  .nullable()
  .refine(
    (value) => {
      if (value === null || value === "") return true;
      try {
        const { protocol } = new URL(value);
        return protocol === "https:" || protocol === "http:";
      } catch {
        return false;
      }
    },
    { error: URL_MESSAGE },
  )
  .optional();

const bodySchema = z.object({
  siteMode: z.enum(["WAITLIST", "PREORDERS", "LIVE"]).optional(),
  launchAt: z
    .unknown()
    .optional()
    .transform((value) =>
      typeof value === "string" && !Number.isNaN(Date.parse(value))
        ? new Date(value)
        : undefined,
    ),
  showCountdown: z.boolean().optional(),
  allowInternationalPhone: z.boolean().optional(),
  instagramUrl: linkField,
  linkedinUrl: linkField,
  facebookUrl: linkField,
  youtubeUrl: linkField,
  spotifyUrl: linkField,
});

export const PATCH = defineAdminRoute(
  {
    permission: "settings:manage",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body }) => {
    const setting = await updateSiteSetting(body, {
      staffUserId: staff.staffUserId,
    });
    return NextResponse.json({ ok: true, setting });
  },
);
