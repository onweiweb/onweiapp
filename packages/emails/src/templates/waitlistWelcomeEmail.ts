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
    "You've unlocked INSIDER STATUS: First to know what we're building. Access that others don't get. An actual say in what we make. Fun surprises! And a direct line to the founders.",
    "We're on the Wei. Glad you're on it with us.",
  ];

  const subject = "Warm-up complete! You're in.";
  const subline = "Life's busy! Yet you showed up. Respect.";

  const html = renderWelcomeLayout({
    siteUrl,
    preheader: subline,
    headline: "Life's busy! Yet you showed up. Respect.",
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
    "Life's busy! Yet you showed up. Respect.",
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
