import {
  formatLegalBody,
  getSiteSetting,
  type LegalPageView as LegalPageData,
} from "@onwei/core";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { WaitlistHeader } from "@/_components/WaitlistHeader";
import { WaitlistFooter } from "@/_components/WaitlistFooter";

// No Figma frame exists for the legal pages, so this is a plain reading
// layout built from the site's existing type and color tokens (same as the
// journal article page), not a designed screen. Replace with a Figma-driven
// layout once one exists, per root CLAUDE.md ground rule 8.
//
// Chrome follows siteMode like /about does: the legal pages are reachable
// while siteMode is WAITLIST (see proxy.ts), so they need the waitlist
// header and footer then, not the full storefront's.
export async function LegalPageView({ page }: { page: LegalPageData }) {
  const { siteMode, instagramUrl, youtubeUrl, spotifyUrl } =
    await getSiteSetting();
  const isWaitlistMode = siteMode === "WAITLIST";

  return (
    <main>
      {isWaitlistMode ? (
        <WaitlistHeader navHref="/ontheway" navLabel="Join the Movement" />
      ) : (
        <SiteHeader />
      )}
      <article className="flex flex-col items-center bg-onwei-white px-6 py-14 desk:px-14">
        <div className="flex w-full max-w-[47.5rem] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-[2.25rem] font-bold uppercase leading-[0.95] text-onwei-blue desk:text-[3rem]">
              {page.title}
            </h1>
            <p className="font-grotesk text-[length:max(0.6875rem,11px)] text-onwei-blue/70">
              Last updated{" "}
              {new Date(page.updatedAt).toLocaleDateString("en-IN")}
            </p>
            {page.intro ? (
              <p className="font-grotesk text-[length:max(1rem,11px)] text-onwei-blue">
                {page.intro}
              </p>
            ) : null}
          </div>

          {page.sections.map((section) => (
            <section key={section.id} className="flex flex-col gap-3">
              <h2 className="font-display text-[1.5rem] font-bold uppercase leading-[1] text-onwei-blue">
                {section.heading}
              </h2>
              {formatLegalBody(section.body).map((block, index) =>
                block.type === "list" ? (
                  <ul
                    key={index}
                    className="flex list-disc flex-col gap-1 pl-5 font-grotesk text-[length:max(1rem,11px)] text-onwei-blue"
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    key={index}
                    className="font-grotesk text-[length:max(1rem,11px)] text-onwei-blue"
                  >
                    {block.text}
                  </p>
                ),
              )}
            </section>
          ))}
        </div>
      </article>
      {isWaitlistMode ? (
        <WaitlistFooter
          instagramUrl={instagramUrl}
          youtubeUrl={youtubeUrl}
          spotifyUrl={spotifyUrl}
        />
      ) : (
        <SiteFooter />
      )}
    </main>
  );
}
