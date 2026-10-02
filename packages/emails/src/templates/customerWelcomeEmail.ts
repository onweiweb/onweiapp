import {
  DEFAULT_SITE_URL,
  escapeHtml,
  firstNameOf,
  renderWelcomeLayout,
} from "./layout";
import type { RenderedEmail } from "./otpEmail";

export interface CustomerWelcomeInput {
  name?: string | null;
  siteUrl?: string;
}

export function renderCustomerWelcomeEmail(
  input: CustomerWelcomeInput = {},
): RenderedEmail {
  const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;
  const first = firstNameOf(input.name);
  const greeting = first ? `Hey ${first},` : "Hey,";
  const shopUrl = `${siteUrl}/collection/all`;

  const lines = [
    "Your Onwei account is ready.",
    "Sports and fitness accessories built for everyday movers, from pickleball to pilates. Have a look around and find your next favourite.",
  ];

  const subject = "Welcome to Onwei";
  const subline = "Your account is ready. Time to move.";

  const html = renderWelcomeLayout({
    siteUrl,
    preheader: subline,
    headline: "Welcome to Onwei",
    subline,
    paragraphsHtml: [greeting, ...lines].map(escapeHtml),
    cta: { label: "Start shopping", url: shopUrl },
    footerNote: "You got this email because you created an Onwei account.",
  });

  const text = [
    greeting,
    "",
    ...lines.flatMap((line) => [line, ""]),
    `Start shopping: ${shopUrl}`,
    "",
    "You got this email because you created an Onwei account.",
  ].join("\n");

  return { subject, html, text };
}
