import { isValidEmail, updateSiteSetting, youtubeVideoId } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../_lib/triggerCatalogRevalidate";

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

// Homepage video: must be a YouTube video link (watch, youtu.be or Shorts).
const youtubeField = z
  .string()
  .trim()
  .nullable()
  .refine((value) => !value || youtubeVideoId(value) !== null, {
    error:
      "Paste a YouTube video link, like https://youtu.be/... or a Shorts link.",
  })
  .transform((value) => value || null)
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
  showBlogOnWaitlist: z.boolean().optional(),
  instagramUrl: linkField,
  linkedinUrl: linkField,
  facebookUrl: linkField,
  youtubeUrl: linkField,
  spotifyUrl: linkField,
  contactAddress: z.string().trim().max(300).nullable().optional(),
  contactPhone: z.string().trim().max(30).nullable().optional(),
  contactEmail: z
    .string()
    .trim()
    .nullable()
    .refine((value) => !value || isValidEmail(value), {
      error: "That support email doesn't look right.",
    })
    .optional(),
  moversCount: z
    .number()
    .int({ error: "Use a whole number." })
    .min(1, { error: "Use a number above 0, or leave it empty." })
    .max(10_000_000)
    .nullable()
    .optional(),
  homeVideoDesktopUrl: youtubeField,
  homeVideoMobileUrl: youtubeField,
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
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json({ ok: true, setting });
  },
);
