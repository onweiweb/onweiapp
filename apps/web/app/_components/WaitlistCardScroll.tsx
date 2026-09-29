"use client";

import Image from "next/image";
import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { WaitlistMarquee } from "./WaitlistMarquee";

// Full loop duration (card 1 through card 4, then straight back to card 1).
// Split evenly, this is ~2.5s per card — per feedback, 18s (4.5s/card) read
// as too slow for an autoplaying loop.
const CYCLE_SECONDS = 10;

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
// windows. Exit is a plain fade by default — pass `exitScale` above 1 (used
// for text, not illustrations) to have the piece grow huge as it fades
// over the card's own outro window instead of just fading in place, for a
// more immersive "rushing past" exit.
function useSweepIn(
  { progress, start, span, outroStart, end }: CardTiming,
  beat: [number, number, number],
  axis: "x" | "y",
  distance: number,
  overshoot: number,
  startOpacity: number,
  exitScale: number = 1,
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
  const scale = useTransform(
    progress,
    [p3, outroStart, end],
    [1, 1, exitScale],
  );
  const offsetStyle = axis === "x" ? { x: offset } : { y: offset };
  return { opacity, scale, ...offsetStyle };
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
// intro span, same convention as the two hooks above. Its `scale` also
// carries the exit: rather than just fading out in place, the text grows
// huge as it fades over the card's own outro window (`outroStart` to
// `end`), like the words are rushing past the viewer — a lot more
// immersive than a flat fade. `p2` (the blink settling) always lands well
// before `outroStart` (the intro span this beat lives in is a small
// fraction of the card's full step, outroStart is near the very end of
// it), so these two beats never fight over the same stretch of progress.
function useEmphasisFlash(
  { progress, start, span, outroStart, end }: CardTiming,
  beat: [number, number, number],
  normalColor: string,
  flashColor: string = "#ffffff",
  exitScale: number = 4,
) {
  const p0 = start + span * beat[0];
  const p1 = start + span * beat[1];
  const p2 = start + span * beat[2];
  const color = useTransform(
    progress,
    [p0, p1, p2],
    [normalColor, flashColor, normalColor],
  );
  const scale = useTransform(
    progress,
    [p0, p1, p2, outroStart, end],
    [1, 1.08, 1, 1, exitScale],
  );
  return { color, scale };
}

// Figma nodes 945:4517/4520/4567/4583 — four cards laid out side by side on
// the canvas, meant (per the brief) to be revealed one at a time —
// originally scroll-driven, now an autoplaying loop (see
// WaitlistCardScroll's own comment below). Each card plays out as a short
// sequence rather than one
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
  // Also carries the exit-zoom (see useEmphasisFlash's comment) since this
  // card computes its own scale manually rather than through that hook.
  const { start, span, outroStart, end } = timing;
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
      outroStart,
      end,
    ],
    [0.2, 0.2, 1.3, 1, 1, 1.1, 1, 1, 4],
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
  const text = useSweepIn(timing, [0.3, 0.55, 0.7], "y", -260, 30, 0);
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
  const text = useSweepIn(timing, [0.3, 0.55, 0.7], "x", 280, -34, 0);
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
    <div className="relative flex size-full flex-col items-center justify-center gap-8 overflow-hidden rounded-[30px] bg-onwei-green px-8 py-12 sm:flex-row sm:justify-between sm:px-14">
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
  // line1's exit-zoom comes from `emphasis` below instead (it overrides
  // this scale); line2/line3 get theirs directly since they have no
  // emphasis hook of their own.
  const line1 = useSweepIn(timing, [0.15, 0.32, 0.45], "x", -160, 18, 0);
  const line2 = useSweepIn(timing, [0.28, 0.45, 0.58], "x", 160, -18, 0, 4);
  const line3 = useSweepIn(timing, [0.41, 0.58, 0.71], "y", 70, -12, 0, 4);
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

// Client-requested order (was All Access / Shape What's Next / Surprises /
// First Dibs): All Access, First Dibs, Surprises from Founders, Shape
// What's Next. Each card's own entrance/exit choreography is keyed off its
// slot's index, not which card it is, so reordering here is all that's
// needed — no changes to any card component itself.
const CARDS = [
  AllAccessCard,
  FirstDibsCard,
  SurprisesFromFoundersCard,
  ShapeWhatsNextCard,
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
  // Every card gets the same real entrance, including card 1 — this now
  // autoplays in a loop rather than sitting on screen pre-scroll, so card
  // 1's own sweep-in is something a viewer actually watches play out each
  // time round, not just the scroll-jacked version's "already there" state.
  const introFraction = 0.33;
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
 * Per client feedback, this no longer scrubs with scroll position — it
 * autoplays on load and loops forever, like a background video: card 1 → 2
 * → 3 → 4, then straight back to card 1, on a fixed timer
 * (CYCLE_SECONDS) rather than however fast/slow the user happens to
 * scroll. `progress` is a plain time-driven MotionValue (0 → 1 over
 * CYCLE_SECONDS, linear, repeating) fed into the exact same per-card beat
 * math (useSweepIn/useScaleBounce/useEmphasisFlash) that used to be driven
 * by scrollYProgress — those hooks only care that their input climbs 0→1,
 * not what drives it. The loop restart (progress 1 → 0) is a hard cut, not
 * a crossfade: card 4 is still held at full opacity when the timer hits 1
 * (see ScrollCard's bgOpacity), card 1 is already back at full opacity the
 * instant progress resets to 0, matching how a looping video cuts back to
 * its first frame rather than fading through black.
 */
export function WaitlistCardScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const progress = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      // Freeze on card 1's settled resting frame (past its own intro, well
      // before its outro starts) instead of looping — same "skip straight
      // to the final state" contract ScrollReveal/WaitlistHeader use for
      // this preference elsewhere on the page.
      progress.set(1 / CARD_COUNT / 2);
      return;
    }
    const controls = animate(progress, 1, {
      duration: CYCLE_SECONDS,
      ease: "linear",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [progress, reduceMotion]);

  return (
    <>
      <div className="flex w-full flex-col items-center justify-center gap-4 px-3 py-4 sm:gap-10 sm:px-11 sm:py-6">
        <div className="flex w-full max-w-[1440px] flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-8">
          {children}
          <div className="relative h-[300px] w-full sm:h-[635px] sm:flex-1">
            {CARDS.map((Content, index) => (
              <ScrollCard
                key={index}
                progress={progress}
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
      {/* Mobile counterpart to the desktop-only marquee above.
          pt-6 only (not py-6) — Figma's mobile mock (node 945:4433/945:4442)
          has this marquee flush against the hero area above it and a
          single 24px gap before the photo/form section below it, not 24px
          on both sides of the marquee. The next section already supplies
          that 24px via its own top padding (page.tsx's `py-6` on the
          `#join-onwei-insiders` section); adding a matching bottom pad here
          too doubled it to 48px. */}
      <div className="w-full px-3 pt-6 sm:hidden">
        <WaitlistMarquee />
      </div>
    </>
  );
}
