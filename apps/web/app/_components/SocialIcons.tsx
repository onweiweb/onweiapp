// Social icons shared by SiteFooter and the Contact Us page. They take the
// surrounding text colour (currentColor).

// Figma's "Font Awesome 5 Brands" text nodes literally read "INSTAGRAM" /
// "LINKEDIN" as a placeholder for icon glyphs (that icon font isn't loaded
// in a browser). Font Awesome isn't in this project's dependencies and
// can't be added unilaterally per the task brief, so real inline icon
// glyphs are used instead of the literal placeholder words.
export function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3ZM7.5 6.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM6.3 10.2h2.4V18H6.3ZM10.2 10.2h2.3v1.1c.4-.7 1.2-1.3 2.4-1.3 2.4 0 2.9 1.5 2.9 3.5V18h-2.4v-3.9c0-1-.1-1.9-1.3-1.9s-1.5.9-1.5 1.9V18h-2.4Z"
      />
    </svg>
  );
}

// Figma's mobile footer (761:5267) draws Facebook as a solid circle with an
// "f" cut out; desktop's third glyph is a different brand mark, but
// Facebook is the one the site settings store, so it is used on both.
export function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM13.4 21.9V15h2.4l.4-3h-2.8v-1.7c0-.8.3-1.3 1.5-1.3h1.5V6.4s-1.2-.2-2.2-.2c-2.3 0-3.8 1.4-3.8 3.9V12H8v3h2.6v6.9Z"
      />
    </svg>
  );
}
