import { describe, expect, it } from "vitest";
import {
  renderNewsletterEmail,
  sanitizeNewsletterHtml,
} from "./newsletterEmail";

describe("sanitizeNewsletterHtml", () => {
  it("keeps simple formatting, links and https images", () => {
    const html =
      '<h2>Drop 2</h2><p>New <strong>colours</strong>, <a href="https://www.onwei.in/shop">shop now</a>.</p><img src="https://cdn.example/a.webp" alt="Mat">';
    expect(sanitizeNewsletterHtml(html)).toBe(
      html.replace('alt="Mat">', 'alt="Mat" />'),
    );
  });

  it("removes scripts, handlers, styles, iframes and unsafe links", () => {
    const out = sanitizeNewsletterHtml(
      '<p onclick="x()" style="color:red">Hi<script>alert(1)</script></p><iframe src="https://x"></iframe><a href="javascript:alert(1)">bad</a><img src="http://insecure/a.png">',
    );
    expect(out).toBe("<p>Hi</p><a>bad</a>");
  });
});

describe("renderNewsletterEmail", () => {
  const email = renderNewsletterEmail({
    subject: "Drop 2 is here",
    preheader: "New colours",
    bodyHtml: '<p>Hello <a href="https://www.onwei.in">there</a></p>',
    unsubscribeUrl: "https://www.onwei.in/newsletter/unsubscribe?t=abc",
    oneClickUnsubscribeUrl:
      "https://www.onwei.in/api/newsletter/unsubscribe?t=abc",
  });

  it("styles the body and carries an unsubscribe link and headers", () => {
    expect(email.subject).toBe("Drop 2 is here");
    expect(email.html).toContain('<p style="margin:0 0 16px;');
    expect(email.html).toContain("/newsletter/unsubscribe?t=abc");
    expect(email.headers).toEqual({
      "List-Unsubscribe":
        "<https://www.onwei.in/api/newsletter/unsubscribe?t=abc>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("has a plain text version with the links written out", () => {
    expect(email.text).toContain("Hello there (https://www.onwei.in)");
    expect(email.text).toContain(
      "Unsubscribe: https://www.onwei.in/newsletter/unsubscribe?t=abc",
    );
  });
});
