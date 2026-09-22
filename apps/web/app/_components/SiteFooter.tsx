import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

const FOOTER_COLUMNS = [
  {
    heading: "Shop",
    links: [
      { label: "Pickleball", href: "/collection/pickleball" },
      { label: "Pilates", href: "/collection/pilates" },
      { label: "Bestsellers", href: "/collection/all" },
      { label: "Find Your Wei", href: "#" },
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
      { label: "Return Policy", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms & Conditions", href: "#" },
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
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3.5 9.5h3V20.5h-3V9.5Zm6.25 0h2.88v1.5h.04c.4-.76 1.38-1.56 2.85-1.56 3.05 0 3.61 2.01 3.61 4.62v6.44h-3v-5.71c0-1.36-.02-3.1-1.89-3.1-1.9 0-2.19 1.48-2.19 3.01v5.8h-3V9.5Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="flex flex-col items-center overflow-hidden bg-onwei-purple px-3 py-12 sm:px-6 lg:px-14">
        <div className="relative flex w-full max-w-[1440px] flex-col items-end gap-[87px] lg:flex-row lg:items-end">
          <Image
            src="/images/footer/illustration-runner.svg"
            alt=""
            width={210}
            height={342}
            aria-hidden
            className="pointer-events-none absolute top-4 right-16 hidden lg:block"
          />
          <div className="flex flex-1 flex-col gap-16 lg:flex-row lg:gap-[136px]">
            <div className="flex w-full max-w-[401px] flex-col gap-8">
              <div className="flex w-full max-w-[371px] flex-col items-start gap-5">
                <Image
                  src="/images/footer/logo-circle.svg"
                  alt=""
                  width={113}
                  height={113}
                  aria-hidden
                />
                <p className="font-display text-[64px] font-bold uppercase leading-[0.9] text-onwei-beige">
                  on&middot;wei
                </p>
                <p className="font-display text-[16px] font-semibold uppercase text-onwei-beige">
                  \ on-way \
                </p>
              </div>
              <div className="flex flex-col gap-4 text-onwei-beige">
                <div className="relative inline-block w-fit">
                  <span
                    aria-hidden
                    className="absolute -left-4 -right-4 -top-5 -bottom-5"
                  >
                    <Image
                      src="/images/footer/brand-asset-1.png"
                      alt=""
                      fill
                      sizes="420px"
                      className="object-contain"
                    />
                  </span>
                  <p className="relative z-10 font-display text-[16px] font-semibold uppercase text-onwei-blue">
                    rhymes with &quot;on the way.&quot; because you already are.
                  </p>
                </div>
                <p className="font-grotesk text-[14px] leading-[1.3]">
                  ONWEI (n.)
                  <br />
                  <br />
                  1. The weight of your own effort. The only thing that&apos;s
                  always yours.
                  <br />
                  <br />
                  2. From On — present, engaged, showing up — and Wei (为) —
                  intentional action. Not hustle. Not noise. Just the choice to
                  participate.
                  <br />
                  <br />
                  <span className="font-semibold">
                    3. The feeling when you stop waiting to feel ready and just
                    show up.
                    <br />
                    Because progress belongs to those who — Show up. Stay on.
                  </span>
                </p>
              </div>
            </div>

            <div className="relative flex flex-1 flex-col gap-[87px]">
              <Image
                src="/images/footer/brand-asset-2.png"
                alt=""
                width={96}
                height={124}
                aria-hidden
                className="pointer-events-none absolute right-8 top-0 hidden rotate-12 md:block"
              />
              <div className="flex flex-col items-start gap-6">
                <div className="flex w-full max-w-[380px] flex-col gap-4 text-onwei-beige">
                  <p className="font-display text-[70px] font-bold uppercase leading-[0.9]">
                    Move with
                    <br />
                    Onwei
                  </p>
                  <p className="font-grotesk text-[14px]">
                    New releases, movement stories, and what&apos;s moving at
                    Onwei — no unnecessary pings!
                  </p>
                </div>
                <NewsletterForm />
              </div>

              <div className="flex flex-wrap gap-8">
                {FOOTER_COLUMNS.map((column) => (
                  <div
                    key={column.heading}
                    className="flex w-[180px] flex-col gap-6 text-onwei-beige"
                  >
                    <p className="font-display text-[16px] font-semibold uppercase tracking-[-0.16px]">
                      {column.heading}
                    </p>
                    <ul className="flex flex-col gap-4 font-grotesk font-medium text-[16px]">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <Link href={link.href}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="flex flex-1 flex-col gap-6 text-onwei-beige">
                  <p className="font-display text-[16px] font-semibold uppercase tracking-[-0.16px]">
                    Connect
                  </p>
                  <div className="flex items-center gap-4">
                    <a href="#" aria-label="Onwei on Instagram">
                      <InstagramIcon />
                    </a>
                    <a href="#" aria-label="Onwei on LinkedIn">
                      <LinkedInIcon />
                    </a>
                    <a href="#" aria-label="Onwei on Substack">
                      <Image
                        src="/images/footer/icon-substack.svg"
                        alt=""
                        width={15}
                        height={17}
                        aria-hidden
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-center bg-onwei-blue px-3 py-2 sm:px-6 lg:px-14">
        <p className="font-grotesk text-label uppercase text-onwei-white">
          &copy;2026 ONWEI
        </p>
      </div>
    </footer>
  );
}
