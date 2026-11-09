import type { Metadata } from "next";
import { getSiteSetting } from "@onwei/core";
import Image from "@/_components/ScaledImage";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { FaqSection } from "@/_components/FaqSection";
import { InstagramGrid } from "@/_components/InstagramGrid";
import { InstagramIcon, LinkedInIcon } from "@/_components/SocialIcons";
import {
  cachedListFaqs as listFaqs,
  cachedListInstagramPhotos as listInstagramPhotos,
} from "../../lib/cachedCatalog";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about an order, sizing or anything else? Write to Onwei and we'll get back to you.",
};

export const revalidate = 60;

/** "https://instagram.com/onwei/?igsh=..." -> "@onwei", for the visible label. */
function handleFrom(url: string, prefix: string): string {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // not a full URL: use it as it is
  }
  const last = path.split("/").filter(Boolean).pop() ?? path;
  return `${prefix}${last}`;
}

// Figma Contact Us: desktop 1189:6006, mobile 1189:6203 (file
// TgMpkXMC2QpghHlH6N63oV). Header, FAQ band, Instagram row and footer are
// the shared storefront sections; only the form card and the "For more
// support" band are new. Contact details come from admin Settings.
export default async function ContactPage() {
  const [settings, faqs, instagramPhotos] = await Promise.all([
    getSiteSetting(),
    listFaqs(),
    listInstagramPhotos(),
  ]);
  const {
    contactAddress,
    contactPhone,
    contactEmail,
    instagramUrl,
    linkedinUrl,
  } = settings;
  const hasDetails = Boolean(
    contactAddress ||
    contactPhone ||
    contactEmail ||
    instagramUrl ||
    linkedinUrl,
  );

  return (
    <main className="bg-onwei-green text-onwei-blue">
      <SiteHeader nav="about" />

      {/* 1189:6037: photo left, form card right, on white. */}
      <section className="flex justify-center bg-onwei-white px-3 py-6 desk:px-11 desk:py-14">
        <div className="flex w-full max-w-[85.25rem] flex-col gap-4 desk:flex-row desk:items-stretch desk:justify-between">
          <div className="relative h-[18.75rem] w-full overflow-hidden rounded-[1.875rem] bg-onwei-green desk:h-[39.6875rem] desk:w-[41.5625rem]">
            <Image
              src="/images/hero/pilates-bg.png"
              alt="A rolled-up Onwei mat"
              fill
              sizes="(min-width: 768px) 665px, 100vw"
              priority
              className="object-cover"
            />
          </div>
          <div className="flex w-full flex-col justify-between gap-8 rounded-[1.875rem] bg-onwei-beige px-5 py-8 desk:w-[41.5625rem] desk:px-14 desk:py-12">
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] desk:text-[3rem]">
                contact us
              </h1>
              <p className="font-grotesk text-[length:max(0.875rem,12px)] leading-[1.3]">
                Let us know if you have any questions or need any assistance.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* 1189:6063: "For more support" band. Each line hides when unset. */}
      {hasDetails ? (
        <section className="flex justify-center px-5 py-14 desk:px-24">
          <div className="flex w-full max-w-[78rem] flex-col items-center gap-8 text-center desk:flex-row desk:items-center desk:justify-between desk:text-left">
            <h2 className="font-display text-[2.5rem] font-bold uppercase leading-[0.9] desk:w-[24.0625rem] desk:text-display-md">
              for more
              <br />
              support
            </h2>
            <div className="flex flex-col items-center gap-8 desk:w-[44.8125rem] desk:flex-row desk:items-start desk:gap-[6.9375rem]">
              {contactAddress ? (
                <address className="whitespace-pre-line font-grotesk text-[length:max(1rem,13px)] not-italic leading-[1.3] desk:w-[20.6875rem]">
                  {contactAddress}
                </address>
              ) : null}
              <ul className="flex flex-col items-center gap-4 font-grotesk text-[length:max(1rem,13px)] desk:items-start">
                {contactPhone ? (
                  <li>
                    <a
                      href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-3"
                    >
                      <span className="flex w-7 justify-center">
                        <Image
                          src="/images/contact/icon-phone.svg"
                          alt=""
                          width={18}
                          height={17}
                          aria-hidden
                        />
                      </span>
                      {contactPhone}
                    </a>
                  </li>
                ) : null}
                {contactEmail ? (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-center gap-3"
                    >
                      <span className="flex w-7 justify-center">
                        <Image
                          src="/images/contact/icon-mail.svg"
                          alt=""
                          width={18}
                          height={13}
                          aria-hidden
                        />
                      </span>
                      {contactEmail}
                    </a>
                  </li>
                ) : null}
                {instagramUrl ? (
                  <li>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                    >
                      <span className="flex w-7 justify-center">
                        <InstagramIcon />
                      </span>
                      {handleFrom(instagramUrl, "@")}
                    </a>
                  </li>
                ) : null}
                {linkedinUrl ? (
                  <li>
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                    >
                      <span className="flex w-7 justify-center">
                        <LinkedInIcon />
                      </span>
                      {handleFrom(linkedinUrl, "in/")}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <FaqSection faqs={faqs} expandAfter={4} />

      {/* 1189:6109: "@onwei", the script note left of it, no arrow. */}
      <InstagramGrid
        photos={instagramPhotos}
        heading="@onwei"
        noteClassName="desk:left-[calc(50%-24.0313rem)] desk:top-[1.9425rem]"
        arrowClassName="desk:hidden!"
      />

      <SiteFooter />
    </main>
  );
}
