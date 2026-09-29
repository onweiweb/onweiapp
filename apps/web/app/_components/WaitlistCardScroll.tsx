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

// Shared timing a card hands down to its own beats (see useSweepIn /
// useScaleBounce below) — `start`/`introEnd`/`outroStart`/`end` are
// absolute points on the master 0-1 scroll progress; `span` is just
// introEnd-start, precomputed since every beat below expresses its own
// timing as a fraction of it.
interface CardTiming {
  progress: MotionValue<number>;
  start: number;
  span: number;
  outroStart: number;
  end: number;
}

// A piece that slides in from off the card (left/right/top/bottom per
// `distance`'s sign and axis) and overshoots slightly past its resting
// spot before settling — used for text sweeping in and for illustrations
// that arrive by sliding rather than popping. `beat` is [begin, overshoot,
// settle] as fractions of the card's own intro span, so different pieces
// on the same card can be staggered just by giving them different beat
// windows. Exit is a plain fade (matches the rest of this file) — only
// the entrance gets the overshoot treatment.
function useSweepIn(
  { progress, start, span, outroStart, end }: CardTiming,
  beat: [number, number, number],
  axis: "x" | "y",
  distance: number,
  overshoot: number,
  startOpacity: number,
) {
  const p0 = start;
  const p1 = start + span * beat[0];
  const p2 = start + span * beat[1];
  const p3 = start + span * beat[2];
  const opacity = useTransform(
    progress,
    [p0, p1, p3, outroStart, end],
    [startOpacity, startOpacity, 1, 1, 0],
  );
  const offset = useTransform(
    progress,
    [p0, p1, p2, p3],
    [distance, distance, overshoot, 0],
  );
  return axis === "x" ? { opacity, x: offset } : { opacity, y: offset };
}

// A piece that pops in — grows past its resting size then settles back,
// instead of sliding in from a direction. Same staggered-beat idea as
// useSweepIn above, just scale instead of position.
function useScaleBounce(
  { progress, start, span, outroStart, end }: CardTiming,
  beat: [number, number, number],
  fromScale: number,
  overshootScale: number,
  startOpacity: number,
) {
  const p0 = start;
  const p1 = start + span * beat[0];
  const p2 = start + span * beat[1];
  const p3 = start + span * beat[2];
  const opacity = useTransform(
    progress,
    [p0, p1, p3, outroStart, end],
    [startOpacity, startOpacity, 1, 1, 0],
  );
  const scale = useTransform(
    progress,
    [p0, p1, p2, p3],
    [fromScale, fromScale, overshootScale, 1],
  );
  return { opacity, scale };
}

// A quick colour-and-size "blink" for the one line per card that needs the
// most emphasis — fires once the main entrance (sweep or pop) has already
// settled, so it reads as a separate accent beat, not part of the arrival.
// `beat` is [flashStart, flashPeak, settle] as fractions of the card's own
// intro span, same convention as the two hooks above.
function useEmphasisFlash(
  { progress, start, span }: CardTiming,
  beat: [number, number, number],
  normalColor: string,
  flashColor: string = "#ffffff",
) {
  const p0 = start + span * beat[0];
  const p1 = start + span * beat[1];
  const p2 = start + span * beat[2];
  const color = useTransform(
    progress,
    [p0, p1, p2],
    [normalColor, flashColor, normalColor],
  );
  const scale = useTransform(progress, [p0, p1, p2], [1, 1.08, 1]);
  return { color, scale };
}

// Figma nodes 945:4517/4520/4567/4583 — four cards laid out side by side on
// the canvas, meant (per the brief) to be revealed one at a time as the
// user scrolls. Each card plays out as a short sequence rather than one
// blended crossfade: background lands, then text/illustrations arrive —
// but per client feedback, each card now gets a genuinely DIFFERENT
// entrance style (not the same "sweep from the left" for every card), so
// the sequence itself keeps reading as one continuous motion rather than
// four repeats of the same beat: card 1 pops from the centre, card 2 drops
// from the top, card 3 slides in from the right, card 4 zigzags — see each
// component below for its own beat windows/directions. Each card's one
// most-important line also gets a quick colour+size "blink" once it lands
// (useEmphasisFlash above) for a bit of extra typographic punch.
function AllAccessCard({ timing }: { timing: CardTiming }) {
  // No separate illustration layer here — the blob IS the background, so
  // it just fades in with the card frame rather than needing its own
  // motion value. Text POPS from the centre (the one card with no
  // directional sweep) rather than sliding in from a side.
  const text = useScaleBounce(timing, [0.3, 0.55, 0.7], 0.5, 1.15, 0);
  const emphasis = useEmphasisFlash(timing, [0.72, 0.86, 1], "#eded86");
  // The pop-in bounce and the later emphasis blink both animate `scale`,
  // but never at the same time (the blink's window only starts once the
  // pop-in has already settled back to 1) — one flat useTransform call
  // over both sets of keyframes in order, same pattern as every other
  // beat in this file, rather than combining two separate MotionValues
  // (which tripped a "monotonically non-decreasing" WAAPI error — Motion
  // couldn't hardware-accelerate a scroll-linked animation built from two
  // already-scroll-linked source values).
  const { start, span } = timing;
  const scale = useTransform(
    timing.progress,
    [
      start,
      start + span * 0.3,
      start + span * 0.55,
      start + span * 0.7,
      start + span * 0.72,
      start + span * 0.86,
      start + span,
    ],
    [0.5, 0.5, 1.15, 1, 1, 1.08, 1],
  );
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
        style={{ opacity: text.opacity, color: emphasis.color, scale }}
        className="relative px-8 text-center font-display text-[32px] font-bold uppercase leading-[0.9] sm:text-[48px]"
      >
        All Access: Onwei Insiders Card
      </motion.p>
    </div>
  );
}

function ShapeWhatsNextCard({ timing }: { timing: CardTiming }) {
  // Drops in from the top (card 1 pops from the centre, card 3 slides in
  // from the right, card 4 zigzags) — every card reads differently now.
  const text = useSweepIn(timing, [0.3, 0.55, 0.7], "y", -140, 16, 0);
  const emphasis = useEmphasisFlash(timing, [0.72, 0.85, 1], "#eded86");
  // Tennis: a scale-bounce "pop", first of the three illustrations.
  const tennis = useScaleBounce(timing, [0.45, 0.62, 0.78], 0.4, 1.18, 0);
  // Plank and tag: slide in from the right, one slightly after the other
  // — staggered against each other, not just against the text.
  const plank = useSweepIn(timing, [0.55, 0.75, 0.9], "x", 140, -16, 0);
  const tag = useSweepIn(timing, [0.65, 0.85, 1], "x", 140, -16, 0);
  return (
    <div className="relative size-full overflow-hidden rounded-[30px] bg-onwei-purple">
      {/* absolute inset-0 on each wrapper (not just a bare div) — motion
          applying a transform (scale/x here) makes a div a new CSS
          containing block the instant it mounts, which would otherwise
          make each image's percentage-based left/top resolve against its
          own tiny wrapper instead of the card. Matching the card's own
          box exactly keeps that positioning identical to before these
          wrappers existed. */}
      <motion.div style={tennis} className="absolute inset-0">
        <Image
          src="/images/waitlist/cards/card2-illustration-tennis.svg"
          alt=""
          width={82}
          height={134}
          aria-hidden
          className="absolute left-[17%] top-[12%] h-auto w-[10%] min-w-16"
        />
      </motion.div>
      <motion.div style={plank} className="absolute inset-0">
        <Image
          src="/images/waitlist/cards/card2-illustration-plank.svg"
          alt=""
          width={168}
          height={60}
          aria-hidden
          className="absolute left-[54%] top-[52%] h-auto w-[20%] min-w-24 rotate-[6.34deg]"
        />
      </motion.div>
      <motion.div style={tag} className="absolute inset-0">
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
        style={{ ...text, color: emphasis.color, scale: emphasis.scale }}
        className="absolute left-[15%] top-[35%] w-[65%] font-display text-[28px] font-bold uppercase leading-[0.9] sm:text-[48px]"
      >
        Shape What&apos;s Next for Onwei
      </motion.p>
    </div>
  );
}

function SurprisesFromFoundersCard({ timing }: { timing: CardTiming }) {
  // Slides in from the right, mirroring card 2's arrival from the top and
  // card 1's centre pop.
  const text = useSweepIn(timing, [0.3, 0.55, 0.7], "x", 160, -18, 0);
  const emphasis = useEmphasisFlash(timing, [0.72, 0.85, 1], "#8e94ca");
  const founder = useScaleBounce(timing, [0.45, 0.65, 0.82], 0.4, 1.18, 0);
  // Photo badge: a quick coloured-ring flash right as it lands, on top of
  // the same pop the founder illustration gets (it's nested inside that
  // illustration in the layout, see the JSX below).
  const badgeRingBeat: [number, number, number] = [0.55, 0.72, 0.88];
  const badgeRing = useTransform(
    timing.progress,
    [
      timing.start,
      timing.start + timing.span * badgeRingBeat[0],
      timing.start + timing.span * badgeRingBeat[1],
      timing.start + timing.span * badgeRingBeat[2],
    ],
    [
      "0 0 0 0px rgba(237,237,134,0)",
      "0 0 0 0px rgba(237,237,134,0)",
      "0 0 0 6px rgba(237,237,134,0.9)",
      "0 0 0 0px rgba(237,237,134,0)",
    ],
  );
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 rounded-[30px] bg-onwei-green px-8 py-12 sm:flex-row sm:justify-between sm:px-14">
      <motion.div
        style={founder}
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
        <motion.div
          style={{ boxShadow: badgeRing }}
          className="absolute -left-6 -top-10 h-16 w-24 rounded-[20px] sm:-left-8 sm:-top-16 sm:h-20 sm:w-32"
        >
          <Image
            src="/images/waitlist/cards/card3-photo.png"
            alt=""
            fill
            sizes="100px"
            aria-hidden
            className="object-contain"
          />
        </motion.div>
      </motion.div>
      <motion.p
        style={{ ...text, color: emphasis.color, scale: emphasis.scale }}
        className="text-center font-display text-[28px] font-bold uppercase leading-[0.9] sm:text-[48px]"
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

function FirstDibsCard({ timing }: { timing: CardTiming }) {
  // Three text lines pop in one after another instead of as one block —
  // and, unlike the other three cards (each one direction only), this one
  // zigzags: left, then right, then bottom, so the whole card reads as its
  // own distinct rhythm rather than a repeat of any other card's sweep.
  const line1 = useSweepIn(timing, [0.15, 0.32, 0.45], "x", -70, 8, 0);
  const line2 = useSweepIn(timing, [0.28, 0.45, 0.58], "x", 70, -8, 0);
  const line3 = useSweepIn(timing, [0.41, 0.58, 0.71], "y", 28, -6, 0);
  const emphasis = useEmphasisFlash(timing, [0.45, 0.55, 0.65], "#eded86");
  // Three illustrations, each from a direction matching where it sits and
  // each with its own small bounce: dumbbell (top right) drops in from
  // above, sticky note (bottom left) slides in from the left, squiggle
  // (bottom right) slides in from the right.
  const dumbbell = useSweepIn(timing, [0.55, 0.72, 0.85], "y", -60, 10, 0);
  const stickyNote = useSweepIn(timing, [0.62, 0.79, 0.92], "x", -80, 10, 0);
  const squiggle = useSweepIn(timing, [0.69, 0.86, 1], "x", 80, -10, 0);
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 overflow-hidden rounded-[30px] bg-onwei-purple px-8 py-12 sm:gap-14">
      <motion.p
        style={{ ...line1, color: emphasis.color, scale: emphasis.scale }}
        className="font-display text-[32px] font-bold uppercase leading-[0.9] sm:text-[48px]"
      >
        first dibs
      </motion.p>
      <motion.p
        style={line2}
        className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]"
      >
        Exclusive Offers
      </motion.p>
      <motion.p
        style={line3}
        className="font-display text-[32px] font-bold uppercase leading-[0.9] text-onwei-green sm:text-[48px]"
      >
        Event Invites
      </motion.p>
      <motion.div
        style={dumbbell}
        className="absolute right-[15%] top-[18%] h-[60px] w-[110px] rotate-[2deg] sm:h-[87px] sm:w-[189px]"
      >
        <Image
          src="/images/waitlist/cards/card4-dumbbell-badge.png"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
      </motion.div>
      <motion.div
        style={stickyNote}
        className="absolute bottom-[24%] left-[8%] h-[70px] w-[70px] rotate-[-7.59deg] sm:h-[97px] sm:w-[96px]"
      >
        <Image
          src="/images/waitlist/cards/card4-sticky-note.png"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
      </motion.div>
      <motion.div
        style={squiggle}
        className="absolute bottom-[16%] right-[15%] h-[26px] w-[110px] sm:h-[38px] sm:w-[165px]"
      >
        <Image
          src="/images/waitlist/cards/card4-squiggle.png"
          alt=""
          fill
          sizes="200px"
          aria-hidden
          className="object-contain"
        />
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
  Content: (props: { timing: CardTiming }) => React.ReactNode;
}) {
  const step = 1 / CARD_COUNT;
  const start = index * step;
  const end = start + step;
  // A non-zero minimum keeps every input to useTransform strictly
  // increasing — a duplicated x-value (introEnd === start) at index 0's
  // progress===0 boundary caused a blank first paint before the first
  // scroll event. Every beat below derives its own timing as start +
  // span*fraction, so this one tiny introFraction is all that's needed to
  // keep the whole card's sequence (background/text/illustrations) both
  // monotonic AND effectively instant for the card that's already on
  // screen at first paint — nothing separate needed per beat.
  //
  // Roughly double the old value (0.15 → 0.33) — per feedback, the whole
  // entrance felt like "the screen just changing" rather than a sequence
  // of distinct moments; this gives each of the three beats (background,
  // text, illustrations) real scroll distance to play out in instead of
  // blending together in a blink.
  const introFraction = index === 0 ? 0.001 : 0.33;
  const outroFraction = 0.12;
  const introEnd = start + step * introFraction;
  const outroStart = end - step * outroFraction;
  const span = introEnd - start;

  // Background = the card frame's own opacity (this wrapper). The card
  // stays at its actual, fixed size the whole time — no scale/zoom on the
  // frame itself; it just fades in, and the entrance drama instead comes
  // from the text/illustrations sweeping in from a side (see each card's
  // own useSweepIn/useScaleBounce calls below).
  //
  // The fade-in and fade-out windows are centred on the SAME boundary
  // (`start` for this card's entrance is the previous card's `end`) and
  // share the same width, so one card's fade-out and the next card's
  // fade-in are mirror images of each other over the identical stretch of
  // progress — a true crossfade. Sizing each card's own intro/outro
  // independently (old version: outro over the last 12% of THIS card's
  // step, intro over 30% of the NEXT card's much-shorter intro span) left
  // a gap where neither card was near full opacity, so the page's beige
  // background — or really, whichever card had most recently been fully
  // opaque, i.e. the previous ("first") one — stayed visible a beat too
  // long into every single transition instead of the incoming card's own
  // background taking over right away.
  // Clamped to [0, 1] — scrollYProgress never leaves that range, and an
  // out-of-range breakpoint (card 0's window starts below 0, the last
  // card's ends above 1) made Motion's hardware-accelerated scroll
  // animation throw "Offsets must be monotonically non-decreasing" when it
  // tried to build a native WAAPI animation from it.
  const crossfade = step * 0.06;
  const bgOpacity = useTransform(
    progress,
    [
      Math.max(0, start - crossfade / 2),
      start + crossfade / 2,
      end - crossfade / 2,
      Math.min(1, end + crossfade / 2),
    ],
    [index === 0 ? 1 : 0, 1, 1, index === CARD_COUNT - 1 ? 1 : 0],
  );

  const timing: CardTiming = { progress, start, span, outroStart, end };

  return (
    <motion.div
      style={{ opacity: bgOpacity }}
      className="absolute inset-0"
      aria-hidden={index !== 0}
    >
      <Content timing={timing} />
    </motion.div>
  );
}

/**
 * A tall (500vh) wrapper pins the whole row — hero card plus card viewport,
 * passed in as `children` — via `sticky` while the user scrolls past it;
 * scroll progress through that wrapper drives which of the 4 cards is
 * visible. `children` has to be pinned in the same sticky box as the cards,
 * not a flex sibling outside this wrapper: a flex row's height stretches to
 * its tallest child, and this wrapper's own child is 500vh tall — as a
 * sibling, the hero card would get vertically centered inside a 500vh row
 * and pushed thousands of pixels down. Plain CSS sticky (not a
 * JS-computed fixed position) plus transform/opacity-only animation on the
 * cards keeps this on the compositor thread — see the "snappy and
 * scalable" note in project chat history. 500vh (was 400vh) gives every
 * card's beats (background/text/illustrations) more scroll distance to
 * play out in, since the whole sequence felt slightly rushed at 400vh.
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
      <div ref={containerRef} className="relative h-[500vh]">
        {/* h-screen/h-dvh (not a fixed 747px, and not min-h-* on either
            breakpoint) so the pinned box is EXACTLY one viewport tall —
            required for the pin/progress math below, not just a visual
            choice. `scrollYProgress` is computed from this wrapper's full
            500vh height on the assumption that CSS `position: sticky`
            stays pinned for the whole (500vh - one viewport) scroll
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
