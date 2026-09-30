import { isValidEmail, subscribeToNewsletter } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";

const EMAIL_MESSAGE = "Enter a valid email address.";

const bodySchema = z.object({
  email: z
    .string({ error: EMAIL_MESSAGE })
    .trim()
    .toLowerCase()
    .refine(isValidEmail, { error: EMAIL_MESSAGE }),
  source: z
    .string()
    .trim()
    .optional()
    .transform((source) => source || "admin_manual"),
});

export const POST = defineAdminRoute(
  {
    permission: "newsletter:manage",
    body: bodySchema,
    emptyBodyMessage: EMAIL_MESSAGE,
  },
  async ({ body }) => {
    const result = await subscribeToNewsletter(body.email, body.source);
    return NextResponse.json({
      ok: true,
      alreadySubscribed: result.alreadySubscribed,
    });
  },
);
