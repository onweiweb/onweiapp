"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "motion/react";
import { WaitlistMarquee } from "./WaitlistMarquee";

const CARD_COUNT = 4;

// Per-card motion layers computed once in ScrollCard and handed down to
// each card component below, so every card stages its own text/
// illustrations against the SAME staggered timing without each one
// re-deriving it. The card frame itself (this file's outer ScrollCard
// wrapper) carries the "background" layer — its own opacity fading in is
// what "the background kicks in" means here, not a separate element, so
// only text/illustrations need their own layer props.
interface CardLayerProps {
  textStyle: MotionStyle;
  illustrationStyle: MotionStyle;
}

// Figma nodes 945:4517/4520/4567/4583 — four cards laid out side by side on
// the canvas, meant (per the brief) to be revealed one at a time as the user
// scrolls, background first, then text sliding in, then illustrations —
// see ScrollCard below for the staggered timing that drives textStyle/
// illustrationStyle.
function AllAccessCard({ textStyle }: CardLayerProps) {
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
      <motion.p
        style={textStyle}
        className="relative px-8 text-center font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]"
      >
        All Access: Onwei Insiders Card
      </motion.p>
    </div>
  );
}

function ShapeWhatsNextCard({ textStyle, illustrationStyle }: CardLayerProps) {
  return (
    <div className="relative size-full overflow-hidden rounded-[30px] bg-onwei-purple">
      {/* absolute inset-0 (not just a bare wrapper) — motion applying a
          transform to animate `y` makes this div a new CSS containing
          block the instant it mounts (even at y:0), which would otherwise
          make the children's percentage-based left/top resolve against
          THIS div instead of the card, breaking their positions. Matching
          the card's own box exactly keeps that positioning identical to
          before this wrapper existed. */}
      <motion.div style={illustrationStyle} className="absolute inset-0">
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
      </motion.div>
      <motion.p
        style={textStyle}
        className="absolute left-[15%] top-[35%] w-[65%] font-display text-[28px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]"
      >
        Shape What&apos;s Next for Onwei
      </motion.p>
    </div>
  );
}

function SurprisesFromFoundersCard({
  textStyle,
  illustrationStyle,
}: CardLayerProps) {
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 rounded-[30px] bg-onwei-green px-8 py-12 sm:flex-row sm:justify-between sm:px-14">
      <motion.div
        style={illustrationStyle}
        className="relative h-[180px] w-[110px] shrink-0 sm:h-[313px] sm:w-[192px]"
      >
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
      </motion.div>
      <motion.p
        style={textStyle}
        className="text-center font-display text-[28px] font-bold uppercase leading-[0.9] text-onwei-purple sm:text-[48px]"
      >
        Surprises
        <br />
        from
        <br />
        Founders
      </motion.p>
    </div>
  );
}

function FirstDibsCard({ textStyle, illustrationStyle }: CardLayerProps) {
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 overflow-hidden rounded-[30px] bg-onwei-purple px-8 py-12 sm:gap-14">
      <motion.div
        style={textStyle}
        className="flex flex-col items-center gap-8 sm:gap-14"
      >
        <p className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
          first dibs
        </p>
        <p className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
          Exclusive Offers
        </p>
        <p className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]">
          Event Invites
        </p>
      </motion.div>
      {/* absolute inset-0 — same containing-block reasoning as
          ShapeWhatsNextCard's illustration wrapper above: these three
          decorative pieces are positioned in percentages relative to the
          card, and this wrapper animating a transform would otherwise
          silently become their new reference box the moment it mounts. */}
      <motion.div style={illustrationStyle} className="absolute inset-0">
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
      </motion.div>
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
  Content: (props: CardLayerProps) => React.ReactNode;
}) {
  const step = 1 / CARD_COUNT;
  const start = index * step;
  const end = start + step;
  // A non-zero minimum keeps every input to useTransform strictly
  // increasing — a duplicated x-value (introEnd === start) at index 0's
  // progress===0 boundary caused a blank first paint before the first
  // scroll event. The four eps-spaced points below extend that same fix
  // to every staggered sub-point (background/text/illustration all need
  // their own distinct-but-effectively-instant entrance for the card
  // that's already on screen at first paint).
  const introFraction = index === 0 ? 0.001 : 0.15;
  const eps = step * 0.0001;
  // Shorter than the original 0.25, and paired with a much smaller scale
  // range below — at 1.2x, a card fading out while blowing up 20% spent a
  // long stretch of scroll sitting at ~40-60% opacity AND oversized, which
  // read as a washed-out, blurry ghost rather than a clean exit. Less time
  // at partial opacity keeps the same "lifts and fades" idea from the
  // brief without the muddy middle — the exit stays a plain fade (no more
  // scale) now that the frame is a fixed size throughout, see below.
  const outroFraction = 0.12;
  const introEnd = start + step * introFraction;
  const outroStart = end - step * outroFraction;

  // Background = the card frame's own opacity (this component's outer
  // motion.div below) — fades in first, over the full intro window. No
  // scale here anymore: per the brief, the card's size stays fixed
  // throughout, only opacity/child layers animate.
  const bgOpacity = useTransform(
    progress,
    [start, introEnd, outroStart, end],
    [index === 0 ? 1 : 0, 1, 1, 0],
  );

  // Text: fades in AND slides in from the left, starting shortly after the
  // background begins and finishing before the background's own intro
  // ends — the two overlap rather than running fully sequentially, which
  // reads as one fluid layered motion instead of a slow relay.
  const textStart =
    index === 0 ? start + eps : start + (introEnd - start) * 0.2;
  const textEnd =
    index === 0 ? start + eps * 2 : start + (introEnd - start) * 0.75;
  const textOpacity = useTransform(
    progress,
    [start, textStart, textEnd, outroStart, end],
    [index === 0 ? 1 : 0, index === 0 ? 1 : 0, 1, 1, 0],
  );
  const textX = useTransform(
    progress,
    [start, textStart, textEnd, outroStart, end],
    [index === 0 ? 0 : -40, index === 0 ? 0 : -40, 0, 0, 0],
  );

  // Illustrations: last to arrive, starting around the text's midpoint and
  // finishing as the intro window closes — a small upward drift alongside
  // the fade, distinct from text's horizontal slide.
  const illustrationStart =
    index === 0 ? start + eps * 3 : start + (introEnd - start) * 0.45;
  const illustrationEnd = index === 0 ? start + eps * 4 : introEnd;
  const illustrationOpacity = useTransform(
    progress,
    [start, illustrationStart, illustrationEnd, outroStart, end],
    [index === 0 ? 1 : 0, index === 0 ? 1 : 0, 1, 1, 0],
  );
  const illustrationY = useTransform(
    progress,
    [start, illustrationStart, illustrationEnd, outroStart, end],
    [index === 0 ? 0 : 16, index === 0 ? 0 : 16, 0, 0, 0],
  );

  return (
    <motion.div
      style={{ opacity: bgOpacity }}
      className="absolute inset-0"
      aria-hidden={index !== 0}
    >
      <Content
        textStyle={{ opacity: textOpacity, x: textX }}
        illustrationStyle={{ opacity: illustrationOpacity, y: illustrationY }}
      />
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
    <>
      <div ref={containerRef} className="relative h-[400vh]">
        {/* h-screen/h-dvh (not a fixed 747px, and not min-h-* on either
            breakpoint) so the pinned box is EXACTLY one viewport tall —
            required for the pin/progress math below, not just a visual
            choice. `scrollYProgress` is computed from this wrapper's full
            400vh height on the assumption that CSS `position: sticky`
            stays pinned for the whole (400vh - one viewport) scroll
            distance, which is only true when the sticky box's own content
            is exactly one viewport tall. `min-h-screen` (mobile's old
            value) let the box grow taller than the viewport whenever its
            content didn't fit, so the browser's native sticky unpinned
            early (measured: ~1310px of content against an ~900px viewport
            unpins ~1300px before progress reaches 1.0) — the box would
            visibly scroll away while the card animation was still playing
            out its last ~35%, reported as the view "getting stuck". h-dvh
            forces the same one-screen contract mobile already relies on
            here for the card viewport to even be reachable during the pin;
            the hero card and card viewport below are sized to actually fit
            within it (see their own comments). justify-center centers the
            [row + marquee] group as a whole inside the full-height box.
            Desktop-only marquee (`hidden sm:block`) — mobile gets its own
            instance below, outside the pin, same reasoning as before. */}
        <div className="sticky top-0 flex h-dvh w-full flex-col items-center justify-center gap-4 px-3 py-4 sm:h-screen sm:gap-10 sm:px-11 sm:py-6">
          <div className="flex w-full max-w-[1440px] flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-8">
            {children}
            <div className="relative h-[300px] w-full sm:h-[635px] sm:flex-1">
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
          <div className="hidden w-full max-w-[1440px] sm:block">
            <WaitlistMarquee />
          </div>
        </div>
      </div>
      {/* Mobile counterpart to the desktop-only marquee above — lives in
          normal flow after the pinned section ends, not inside the sticky
          box, so it stops eating into the vertical budget the card viewport
          needs on mobile. See the comment above for the measurement. */}
      <div className="w-full px-3 py-6 sm:hidden">
        <WaitlistMarquee />
      </div>
    </>
  );
}
