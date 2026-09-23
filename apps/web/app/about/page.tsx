import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";

// Built from Figma (file kGG2vJdbqU6b1d1xmIhRwG, frame 760:4492 "About Us").
// Desktop only — no mobile variant exists for this page in Figma, matching
// this project's "flag it, don't invent" convention for missing breakpoints.
// Decorative accents (squiggles/arrows/ribbon banners, nodes 760:4566,
// 760:4600, 760:4639, 760:4642, 760:4654, 760:4658, 760:4660) are exported
// SVGs/PNGs from those exact nodes, positioned relative to their anchor
// text/photo rather than at Figma's raw canvas coordinates — those
// coordinates assume a fixed 1440px frame and don't survive this page's
// responsive layout. Hidden below `lg` where the anchor they decorate
// (a two-column grid, or a wide margin) no longer exists at that spot.
export default function AboutPage() {
  return (
    <main className="bg-onwei-green">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-6 pb-6 pt-8 text-center sm:px-14">
        <h1 className="relative font-display text-[40px] font-bold uppercase leading-[1.1] text-onwei-blue sm:text-[64px]">
          About us
        </h1>
        <div className="relative inline-block">
          <p className="font-display text-[16px] font-medium uppercase text-onwei-blue">
            ( on&middot;wei, \ &#712;&auml;n-w&#257; / &ldquo;on-way&rdquo; )
          </p>
          <Image
            src="/images/about-us/underline-about-pronunciation.png"
            alt=""
            width={94}
            height={22}
            aria-hidden
            className="pointer-events-none absolute left-full top-1 ml-3 hidden sm:block"
          />
        </div>
        <div className="flex max-w-[773px] flex-col gap-4 font-grotesk text-[14px] leading-relaxed text-onwei-blue">
          <p>
            Not a gear company. Not a wellness brand. Not another startup that
            discovered sport after reading a trend report.
          </p>
          <p>
            Onwei exists because two people — one who spent 15 years at the
            sharp end of competitive sport, and one who built careers around why
            people want the things they want —{" "}
            <span className="rounded-[4px] bg-onwei-purple px-1 text-onwei-white [box-decoration-break:clone]">
              looked at India&apos;s fitness shelves and felt the same thing:
              this isn&apos;t it.
            </span>
          </p>
          <p>
            The equipment was either cheap and forgettable, or excellent and
            completely unaffordable. The design was an afterthought. The brands
            behind it were either intimidating or embarrassing. And the person
            this all hurt most was the one showing up every single day — not
            training for a podium, not a complete beginner — just someone who
            takes their movement seriously and deserves gear that does the same.
          </p>
          <p className="w-fit self-center rounded-[4px] bg-onwei-purple px-1 text-onwei-white [box-decoration-break:clone]">
            That&apos;s who Onwei is for.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-6 pb-6 sm:px-11 lg:grid-cols-2">
        <div className="flex flex-col justify-end gap-6 rounded-[30px] bg-onwei-purple px-6 py-8 sm:px-14 sm:py-12">
          <p className="relative inline-block w-fit font-display text-[40px] font-bold uppercase leading-[1.1] text-onwei-white sm:text-[64px]">
            <Image
              src="/images/about-us/squiggle-sabhya-name.svg"
              alt=""
              width={220}
              height={70}
              aria-hidden
              className="pointer-events-none absolute -left-4 -top-3 hidden sm:block"
            />
            <span className="relative">Sabhya</span>
          </p>
          <div className="font-grotesk text-[14px] leading-[1.3] text-onwei-white">
            <p>
              He grew up playing table tennis professionally — the kind of
              professional where weekends were tournaments, not plans. He
              represented India internationally and was ranked among the top 4
              in the country. Sport wasn&apos;t something he did on the side. It
              was just how he was wired.
            </p>
            <br />
            <p>
              Playing at that level meant access — to training, to facilities,
              to gear that actually matched how hard he was working. He
              didn&apos;t think much of it then. That&apos;s just how it worked
              when you were in those circles.
            </p>
            <br />
            <p>
              He eventually stepped back from professional table tennis. Picked
              up tennis, running, pickleball, padel — got deep into all of them.
              And somewhere in that shift from professional athlete to regular
              person at a sports store, the gap became impossible to ignore: the
              gear he&apos;d taken for granted as a pro simply wasn&apos;t
              available to everyone else. Not at a fair price. Not with any real
              thought behind how it looked. Not from an Indian brand worth being
              proud of.
            </p>
            <br />
            <p>
              That gap stopped being an observation and started being an itch he
              couldn&apos;t ignore.
            </p>
          </div>
          <span className="w-fit rounded-[30px] bg-onwei-beige px-6 py-3 font-grotesk text-[14px] uppercase text-onwei-blue">
            Read Sabhya&apos;s substack
          </span>
        </div>
        <div className="relative min-h-[400px] overflow-hidden rounded-[30px] lg:min-h-full">
          <Image
            src="/images/about-us/sabhya.png"
            alt="Sabhya, Onwei co-founder, holding a tennis racket"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <Image
            src="/images/footer/logo-circle.svg"
            alt=""
            width={90}
            height={90}
            aria-hidden
            className="pointer-events-none absolute right-6 top-6 hidden opacity-90 sm:block"
          />
        </div>
      </section>

      <section className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-6 pb-6 sm:px-11 lg:grid-cols-2">
        <div className="relative min-h-[400px] overflow-hidden rounded-[30px] lg:min-h-full">
          <Image
            src="/images/about-us/sakshi.png"
            alt="Sakshi, Onwei co-founder, in a Pilates pose"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <Image
            src="/images/footer/logo-circle.svg"
            alt=""
            width={90}
            height={90}
            aria-hidden
            className="pointer-events-none absolute right-6 top-6 hidden opacity-90 sm:block"
          />
        </div>
        <Image
          src="/images/about-us/illustration-plank.svg"
          alt=""
          width={243}
          height={87}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 lg:block"
        />
        <div className="flex flex-col justify-end gap-6 rounded-[30px] bg-onwei-purple px-6 py-8 sm:px-14 sm:py-12">
          <p className="font-display text-[40px] font-bold uppercase leading-[1.1] text-onwei-white sm:text-[64px]">
            Sakshi
          </p>
          <div className="font-grotesk text-[14px] leading-[1.3] text-onwei-white">
            <p>
              Even at 22, she couldn&apos;t buy something ugly. Life was too
              short. She spent years at LVMH understanding why people pay a
              premium for things that make them feel something — and years at
              Marico and Diageo understanding how to make that feeling
              accessible to more people. She got very good at the gap between
              the two. She found Pilates. Then functional movement. Then a
              deeply unhealthy amount of time following global fitness creators
              whose lives looked like a beautiful, sweaty Pinterest board. She
              was in. Completely.
            </p>
            <br />
            <p>
              Her mat looked clinical. Her resistance band came in a zip-lock
              bag, like a snack. Her gym bag had given up on life. Meanwhile
              everything she was watching online — the studios, the creators,
              the aesthetic — looked aspirational and effortless.
            </p>
            <br />
            <p>
              The gear available to her in India? Distinctly not. She
              didn&apos;t want to pay Lululemon prices. She didn&apos;t want
              Decathlon aesthetics. She wanted the thing in the middle. It
              didn&apos;t exist. She made a note.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-6 pb-6 pt-12 text-center sm:px-14">
        <Image
          src="/images/about-us/squiggle-arrow-married.svg"
          alt=""
          width={113}
          height={58}
          aria-hidden
          className="pointer-events-none absolute right-[8%] top-6 hidden lg:block"
        />
        <h2 className="font-display text-[32px] font-bold uppercase leading-[1.1] text-onwei-blue sm:text-[64px]">
          Then they got married.
        </h2>
        <div className="relative inline-block">
          <p className="font-display text-[16px] font-medium uppercase text-onwei-blue">
            (The mental notes became a brand.)
          </p>
          <Image
            src="/images/about-us/underline-married.svg"
            alt=""
            width={119}
            height={16}
            aria-hidden
            className="pointer-events-none absolute -bottom-2 left-1/2 hidden -translate-x-1/2 sm:block"
          />
        </div>
        <div className="flex max-w-[773px] flex-col gap-1 font-grotesk text-[14px] leading-relaxed text-onwei-blue">
          <p>
            Two SRCC and ISB alumni who couldn&apos;t stop talking about fitness
            and gear.
          </p>
          <p>Somehow this felt more useful than investment banking.</p>
          <p>
            Sabhya obsesses over whether it actually performs. Sakshi obsesses
            over{" "}
            <span className="rounded-[4px] bg-onwei-purple px-1 text-onwei-white [box-decoration-break:clone]">
              whether you&apos;d actually want it. Together they&apos;ve set a
              bar that&apos;s probably unreasonable — and are having a great
              time trying to clear it.
            </span>
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-6 pb-14 sm:px-11">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[30px] sm:aspect-[16/9]">
          <Image
            src="/images/about-us/married.png"
            alt="Sabhya and Sakshi celebrating on a tennis court"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="relative flex w-full flex-col items-center bg-onwei-white px-6 py-12 text-center sm:px-14">
        <Image
          src="/images/about-us/ribbon-show-up-consistency.png"
          alt=""
          width={227}
          height={121}
          aria-hidden
          className="pointer-events-none absolute left-[6%] top-1/2 hidden -translate-y-1/2 xl:block"
        />
        <div className="flex w-full max-w-[1440px] flex-col items-center gap-6">
          <h2 className="font-display text-[40px] font-bold uppercase leading-[1.1] text-onwei-blue sm:text-[64px]">
            Why{" "}
            <span className="relative inline-block">
              <Image
                src="/images/about-us/squiggle-onwei-circle.svg"
                alt=""
                width={217}
                height={121}
                aria-hidden
                className="pointer-events-none absolute -left-4 -top-7 hidden sm:block"
              />
              <span className="relative">Onwei</span>
            </span>
          </h2>
          <div className="flex max-w-[773px] flex-col gap-4 font-grotesk text-[14px] leading-relaxed text-onwei-blue">
            <p>
              Because the person who shows up at 7am when no one&apos;s watching
              deserves better than gear that gave up before they did.
            </p>
            <p>
              Not stripped down because you&apos;re not a pro. Not marked up
              because you have taste and aspiration. Not generic because
              affordable was all that was on offer.
            </p>
            <p>
              On — present, engaged, in it. Wei (&#20026;) — the choice to act.
              Not forcing it. Not performing it. Just doing it, on your terms,
              at your pace, consistently.
            </p>
            <p>That&apos;s the only kind of progress that actually sticks.</p>
          </div>
          <p className="font-display text-[16px] font-bold uppercase text-onwei-blue">
            Show up. Stay on. That&apos;s Onwei.
          </p>
          <div className="relative">
            <Image
              src="/images/about-us/arrow-explore.svg"
              alt=""
              width={86}
              height={76}
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-2 hidden lg:block"
            />
            <Link
              href="/collection/pickleball"
              className="rounded-[30px] bg-onwei-blue px-6 py-3 font-grotesk text-[14px] uppercase text-onwei-beige"
            >
              Explore the collection
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
