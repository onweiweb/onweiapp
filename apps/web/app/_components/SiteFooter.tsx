import Image from "@/_components/ScaledImage";
import Link from "next/link";
import { getSiteSetting } from "@onwei/core";
import { NewsletterForm } from "./NewsletterForm";

const FOOTER_COLUMNS = [
  {
    heading: "Shop",
    links: [
      { label: "Pickleball", href: "/collection/pickleball" },
      { label: "Pilates", href: "/collection/pilates" },
      { label: "Bestsellers", href: "/collection/all" },
      // Desktop frame only (758:2584), the mobile Shop column has three.
      { label: "Find Your Wei", href: "#", desktopOnly: true },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Blogs", href: "#" },
      { label: "Contact Us", href: "#" },
    ],
  },
  {
    heading: "Policies",
    links: [
      // Mobile frame (761:5259) calls this "Shipping & Returns".
      {
        label: "Return Policy",
        href: "#",
        mobileLabel: "Shipping & Returns",
        mobileWidth: "max-desk:w-[5.625rem]",
      },
      {
        label: "Privacy Policy",
        href: "/privacy",
        mobileWidth: "max-desk:w-[4.375rem]",
      },
      {
        label: "Terms & Conditions",
        href: "/terms",
        mobileLabel: "Terms\n& Conditions",
      },
    ],
  },
] as const;

// Figma's "Font Awesome 5 Brands" text nodes literally read "INSTAGRAM" /
// "LINKEDIN" as a placeholder for icon glyphs (that icon font isn't loaded
// in a browser). Font Awesome isn't in this project's dependencies and
// can't be added unilaterally per the task brief, so real inline icon
// glyphs are used instead of the literal placeholder words.
function InstagramIcon() {
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

function LinkedInIcon() {
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
function FacebookIcon() {
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

// Figma's desktop newsletter headline differs per page: Homepage says "Move
// with Onwei", Collection says "Stay in the loop" (the mobile frame always
// says "Stay in the loop").
export async function SiteFooter({
  desktopHeading = ["Stay in", "the loop"],
}: {
  desktopHeading?: readonly [string, string];
}) {
  const { instagramUrl, linkedinUrl, facebookUrl } = await getSiteSetting();

  return (
    <footer>
      <div className="flex flex-col items-center bg-onwei-purple px-3 py-14 desk:px-14 desk:py-12">
        <div className="relative flex w-full max-w-[90rem] flex-col items-stretch gap-[5.4375rem] desk:flex-row desk:items-end">
          <Image
            src="/images/footer/illustration-runner.svg"
            alt=""
            width={210}
            height={342}
            aria-hidden
            className="pointer-events-none absolute right-2 top-[-5.0625rem] z-10 hidden desk:block"
          />
          <div className="flex flex-1 flex-col gap-16 desk:flex-row desk:gap-[8.5rem]">
            {/* Figma's mobile footer (node 761:5205) has no brand column
                (wordmark, definition copy, runner), only the newsletter, the
                stamp and the link grid, so it is desktop-only here. */}
            <div className="relative hidden w-full max-w-[25.0625rem] flex-col gap-8 desk:flex desk:self-center">
              <div className="flex w-full max-w-[23.1875rem] flex-col items-start gap-5">
                <Image
                  src="/images/footer/logo-circle.svg"
                  alt=""
                  width={113}
                  height={113}
                  aria-hidden
                />
                <p className="font-display text-[4rem] font-bold uppercase leading-[0.9] text-onwei-beige">
                  on&middot;wei
                </p>
                <p className="font-display text-[length:max(1rem,11px)] font-semibold uppercase leading-[1.375] text-onwei-beige">
                  \ on-way \
                </p>
              </div>
              {/* Figma 758:2565 is one block of text: a navy line over the
                  green marker, ONWEI (n.), then three numbered meanings
                  separated by blank lines, the last one in bold. The marker
                  art (758:2538) is absolute to this column, 36px left of it
                  and 243px down. Em dashes from the Figma copy are written
                  as hyphens (house rule). */}
              <Image
                src="/images/footer/brand-asset-1.png"
                alt=""
                width={444}
                height={66}
                aria-hidden
                className="pointer-events-none absolute -left-9 top-[15.1994rem] max-w-none"
              />
              <p className="relative z-10 whitespace-pre-wrap leading-[0] text-onwei-beige">
                <span className="font-display text-[length:max(1rem,11px)] font-semibold uppercase leading-[1.375] text-onwei-blue">
                  rhymes with &quot;on the way.&quot; because you already are.
                </span>
                <span className="font-display text-[length:max(1rem,11px)] font-semibold leading-[1.375]">
                  {"\n\n\nONWEI (n.)"}
                </span>
                <span className="font-grotesk text-body leading-[1.3]">
                  {
                    "\n1. The weight of your own effort. The only thing that's always yours.\n\n2. From On - present, engaged, showing up - and Wei (\u4E3A) - intentional action. Not hustle. Not noise. Just the choice to participate.\n\n3. "
                  }
                </span>
                <span className="font-grotesk text-body font-bold leading-[1.3]">
                  {
                    "The feeling when you stop waiting to feel ready and just show up.\nBecause progress belongs to those who - Show up. Stay on."
                  }
                </span>
              </p>
            </div>

            <div className="relative flex flex-1 flex-col items-center gap-14 desk:items-stretch desk:gap-[5.4375rem]">
              {/* Figma 758:2603: a 74x112 crop of the brand sprite (pre-cropped file, the full 4096px sprite was slow to decode), tilted 12deg,
                  absolute to this column. */}
              <div className="pointer-events-none absolute left-[29.678rem] top-[4.816rem] hidden h-[7.78rem] w-[5.9727rem] items-center justify-center desk:flex">
                <div className="relative h-[6.9711rem] w-[4.6242rem] rotate-12 overflow-hidden">
                  <Image
                    src="/images/footer/brand-asset-2-crop.png"
                    alt=""
                    fill
                    sizes="75px"
                    aria-hidden
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="flex w-full flex-col items-center gap-6 desk:items-start">
                <div className="flex w-full max-w-[23.75rem] flex-col gap-4 text-center text-onwei-beige desk:text-left">
                  <p className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] desk:text-[4.375rem]">
                    {/* Figma: desktop 758:2570 "Move with Onwei", mobile
                        761:5209 "Stay in the loop". */}
                    <span className="desk:hidden">
                      Stay in
                      <br />
                      the loop
                    </span>
                    <span className="hidden desk:inline">
                      {desktopHeading[0]}
                      <br />
                      {desktopHeading[1]}
                    </span>
                  </p>
                  <p className="font-grotesk text-body">
                    New releases, movement stories,{" "}
                    <br className="desk:hidden" />
                    and what&apos;s moving at Onwei -{" "}
                    <br className="desk:hidden" />
                    no unnecessary pings!
                  </p>
                </div>
                <NewsletterForm />
              </div>

              {/* Mobile: stamp, then a 2x2 link grid (Shop/About, Policies/
                  Connect). `desk:contents` hands the children back to the
                  desktop flex column. */}
              <div className="flex flex-col items-center gap-6 desk:contents">
                <Image
                  src="/images/footer/stamp-mobile.svg"
                  alt=""
                  width={154}
                  height={154}
                  aria-hidden
                  className="h-[9.6rem] w-[9.6rem] desk:hidden"
                />
                <div className="grid grid-cols-[11.5rem_7.125rem] gap-x-6 gap-y-12 desk:flex desk:flex-wrap desk:gap-8">
                  {FOOTER_COLUMNS.map((column) => (
                    <div
                      key={column.heading}
                      className="flex w-auto flex-col gap-[1.125rem] text-onwei-beige desk:w-[11.25rem] desk:gap-6"
                    >
                      <p className="font-display text-[length:max(1rem,11px)] font-semibold uppercase tracking-[-0.01rem]">
                        {column.heading}
                      </p>
                      <ul className="flex flex-col gap-4 font-grotesk font-medium leading-[1.3] text-[length:max(1rem,11px)]">
                        {column.links.map((link) => (
                          <li
                            key={link.label}
                            className={
                              "desktopOnly" in link
                                ? "max-desk:hidden"
                                : undefined
                            }
                          >
                            <Link
                              href={link.href}
                              className={
                                "mobileWidth" in link
                                  ? `block ${link.mobileWidth}`
                                  : undefined
                              }
                            >
                              {"mobileLabel" in link ? (
                                <>
                                  <span className="whitespace-pre-line desk:hidden">
                                    {link.mobileLabel}
                                  </span>
                                  <span className="max-desk:hidden">
                                    {link.label}
                                  </span>
                                </>
                              ) : (
                                link.label
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="flex flex-1 flex-col gap-[1.125rem] text-onwei-beige desk:gap-6">
                    <p className="font-display text-[length:max(1rem,11px)] font-semibold uppercase tracking-[-0.01rem]">
                      Connect
                    </p>
                    <div className="flex items-center gap-4">
                      {instagramUrl ? (
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Onwei on Instagram"
                        >
                          <InstagramIcon />
                        </a>
                      ) : null}
                      {linkedinUrl ? (
                        <a
                          href={linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Onwei on LinkedIn"
                        >
                          <LinkedInIcon />
                        </a>
                      ) : null}
                      {facebookUrl ? (
                        <a
                          href={facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Onwei on Facebook"
                        >
                          <FacebookIcon />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-center bg-onwei-blue px-3 py-2 desk:px-14">
        <p className="font-grotesk text-label uppercase text-onwei-white">
          &copy;2026 ONWEI
        </p>
      </div>
    </footer>
  );
}
