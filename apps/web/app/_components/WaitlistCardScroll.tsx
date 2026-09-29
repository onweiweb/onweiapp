"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { WaitlistMarquee } from "./WaitlistMarquee";

const CARD_COUNT = 4;

// Figma nodes 945:4517/4520/4567/4583 — four cards laid out side by side on
// the canvas, meant (per the brief) to be revealed one at a time as the user
// scrolls: each card's text scales out and the next card takes its place,
// an immersive sequence rather than a static row.
function AllAccessCard() {
  return (
    <div className="relative flex size-full items-center justify-center overflow-hidden rounded-[30px] bg-onwei-green">
      <Image
        src="/images/waitlist/hero/card-blob.svg"
        alt=""
        width={881}
        height={678}
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[110%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2"
      />
      <p className="relative px-8 text-center font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
        All Access: Onwei Insiders Card
      </p>
    </div>
  );
}

function ShapeWhatsNextCard() {
  return (
    <div className="relative size-full overflow-hidden rounded-[30px] bg-onwei-purple">
      <Image
        src="/images/waitlist/cards/card2-illustration-tennis.svg"
        alt=""
        width={82}
        height={134}
        aria-hidden
        className="absolute left-[17%] top-[12%] h-auto w-[10%] min-w-16"
      />
      <Image
        src="/images/waitlist/cards/card2-illustration-plank.svg"
        alt=""
        width={168}
        height={60}
        aria-hidden
        className="absolute left-[54%] top-[52%] h-auto w-[20%] min-w-24 rotate-[6.34deg]"
      />
      <Image
        src="/images/waitlist/cards/card2-illustration-tag.svg"
        alt=""
        width={183}
        height={62}
        aria-hidden
        className="absolute left-[39%] top-[40%] h-auto w-[22%] min-w-28 rotate-[6.34deg]"
      />
      <p className="absolute left-[15%] top-[35%] w-[65%] font-display text-[28px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
        Shape What&apos;s Next for Onwei
      </p>
    </div>
  );
}

function SurprisesFromFoundersCard() {
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 rounded-[30px] bg-onwei-green px-8 py-12 sm:flex-row sm:justify-between sm:px-14">
      <div className="relative h-[180px] w-[110px] shrink-0 sm:h-[313px] sm:w-[192px]">
        <Image
          src="/images/waitlist/cards/card3-illustration-founder.svg"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
        <div className="absolute -left-6 -top-10 h-16 w-24 sm:-left-8 sm:-top-16 sm:h-20 sm:w-32">
          <Image
            src="/images/waitlist/cards/card3-photo.png"
            alt=""
            fill
            sizes="100px"
            aria-hidden
            className="object-contain"
          />
        </div>
      </div>
      <p className="text-center font-display text-[28px] font-bold uppercase leading-[0.9] text-onwei-purple sm:text-[48px]">
        Surprises
        <br />
        from
        <br />
        Founders
      </p>
    </div>
  );
}

function FirstDibsCard() {
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 overflow-hidden rounded-[30px] bg-onwei-purple px-8 py-12 sm:gap-14">
      <p className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
        first dibs
      </p>
      <p className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
        Exclusive Offers
      </p>
      <p className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
        Event Invites
      </p>
      <div className="absolute right-[15%] top-[18%] h-[60px] w-[110px] rotate-[2deg] sm:h-[87px] sm:w-[189px]">
        <Image
          src="/images/waitlist/cards/card4-dumbbell-badge.png"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
      </div>
      <div className="absolute bottom-[24%] left-[8%] h-[70px] w-[70px] rotate-[-7.59deg] sm:h-[97px] sm:w-[96px]">
        <Image
          src="/images/waitlist/cards/card4-sticky-note.png"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
      </div>
      <div className="absolute bottom-[16%] right-[15%] h-[26px] w-[110px] sm:h-[38px] sm:w-[165px]">
        <Image
          src="/images/waitlist/cards/card4-squiggle.png"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
      </div>
    </div>
  );
}

const CARDS = [
  AllAccessCard,
  ShapeWhatsNextCard,
  SurprisesFromFoundersCard,
  FirstDibsCard,
];

function ScrollCard({
  progress,
  index,
  Content,
}: {
  progress: MotionValue<number>;
  index: number;
  Content: () => React.ReactNode;
}) {
  const step = 1 / CARD_COUNT;
  const start = index * step;
  const end = start + step;
  // A non-zero minimum keeps every input to useTransform strictly
  // increasing — a duplicated x-value (introEnd === start) at index 0's
  // progress===0 boundary caused a blank first paint before the first
  // scroll event.
  const introFraction = index === 0 ? 0.001 : 0.15;
  // Shorter than the original 0.25, and paired with a much smaller scale
  // range below — at 1.2x, a card fading out while blowing up 20% spent a
  // long stretch of scroll sitting at ~40-60% opacity AND oversized, which
  // read as a washed-out, blurry ghost rather than a clean exit. Less time
  // at partial opacity, and less scale to blur through, keeps the same
  // "lifts and fades" idea from the brief without the muddy middle.
  const outroFraction = 0.12;
  const introEnd = start + step * introFraction;
  const outroStart = end - step * outroFraction;

  const opacity = useTransform(
    progress,
    [start, introEnd, outroStart, end],
    [index === 0 ? 1 : 0, 1, 1, 0],
  );
  const scale = useTransform(progress, [outroStart, end], [1, 1.05]);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0"
      aria-hidden={index !== 0}
    >
      <Content />
    </motion.div>
  );
}

/**
 * A tall (400vh) wrapper pins the whole row — hero card plus card viewport,
 * passed in as `children` — via `sticky` while the user scrolls past it;
 * scroll progress through that wrapper drives which of the 4 cards is
 * visible. `children` has to be pinned in the same sticky box as the cards,
 * not a flex sibling outside this wrapper: a flex row's height stretches to
 * its tallest child, and this wrapper's own child is 400vh tall — as a
 * sibling, the hero card would get vertically centered inside a 400vh row
 * and pushed thousands of pixels down. Plain CSS sticky (not a
 * JS-computed fixed position) plus transform/opacity-only animation on the
 * cards keeps this on the compositor thread — see the "snappy and
 * scalable" note in project chat history.
 */
export function WaitlistCardScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={containerRef} className="relative h-[400vh]">
      {/* h-screen (not a fixed 747px) so the pinned box fills whatever the
          viewport actually is — a fixed height here left a growing slab of
          empty background below the cards on any viewport taller than
          ~840px, for the entire 400vh scroll-through. The marquee (moved
          here from its own section further down the page, at the client's
          request) fills that leftover space with something visibly moving
          instead of it just sitting empty; justify-center centers the
          [row + marquee] group as a whole inside the full-height box. */}
      <div className="sticky top-0 flex min-h-screen w-full flex-col items-center justify-center gap-10 px-3 py-6 sm:h-screen sm:px-11">
        <div className="flex w-full max-w-[1440px] flex-col items-center gap-8 sm:flex-row sm:justify-between">
          {children}
          <div className="relative h-[500px] w-full sm:h-[635px] sm:flex-1">
            {CARDS.map((Content, index) => (
              <ScrollCard
                key={index}
                progress={scrollYProgress}
                index={index}
                Content={Content}
              />
            ))}
          </div>
        </div>
        <div className="w-full max-w-[1440px]">
          <WaitlistMarquee />
        </div>
      </div>
    </div>
  );
}
