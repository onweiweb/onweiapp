import {
  DEFAULT_SITE_URL,
  escapeHtml,
  firstNameOf,
  renderWelcomeLayout,
} from "./layout";
import type { RenderedEmail } from "./otpEmail";

export interface WaitlistWelcomeInput {
  fullName: string;
  siteUrl?: string;
  instagramUrl?: string | null;
}

export function renderWaitlistWelcomeEmail(
  input: WaitlistWelcomeInput,
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.fullName);
  const greeting = first ? `Hey ${first},` : "Hey,";

  const lines = [
    "One of the firsts: first to know, first dibs, first through the door when things open up.",
    "We're on the Wei.",
  ];

  const subject = "You're in. Welcome to the Onwei warm up";
  const subline = "You're officially part of the Movement.";

  const html = renderWelcomeLayout({
    siteUrl,
    preheader: subline,
    headline: "You're officially part of the Movement.",
    subline,
    paragraphsHtml: lines.map(escapeHtml),
    popup: {
      greetingHtml: escapeHtml(greeting),
      instagramUrl: input.instagramUrl ?? null,
    },
    footerNote:
      "You got this email because you joined the Onwei Insiders list at onwei.in.",
  });

  const text = [
    greeting,
    "",
    "You're officially part of the Movement.",
    "",
    ...lines.flatMap((line) => [line, ""]),
    input.instagramUrl ? `Let's be friends: ${input.instagramUrl}` : "",
    "",
    "You got this email because you joined the Onwei Insiders list at onwei.in.",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { subject, html, text };
}
