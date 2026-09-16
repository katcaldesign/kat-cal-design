"use client";

/*
  ContributionMosaic: a GitHub contribution graph that spells WELCOME first,
  then resolves into the real year.

  ── The trick ───────────────────────────────────────────────────────────────
  A contribution graph is exactly SEVEN rows tall (Sunday to Saturday). A
  classic 5x7 bitmap letter is exactly seven rows tall too. So the word is not
  overlaid on the grid, it IS the grid: every lit pixel of "WELCOME" is a real
  cell, and the letters fill the full height with nothing left over.

  ── Nothing moves ───────────────────────────────────────────────────────────
  The single most important idea in this file: no square ever changes position.
  Every cell is fixed in the grid and only ever switches STATE, like a bulb in a
  departure board or a dot in a dot matrix display. The illusion of movement
  comes entirely from cells turning on and off in the right order.

  That is a deliberate choice over the smoother alternative, where the lit
  squares of the word slide across to their real dates. Sliding looks liquid and
  a bit precious. Switching looks like hardware. A wave of noise crossing the
  board and settling into data reads as a machine resolving, which is the right
  register for a contribution graph.

  It is also why there is not a single CSS transition on the cells. Anything
  that eases between two colours would reintroduce the softness we are trying to
  avoid. Every change here is one frame to the next, hard.

  ── How the timeline works ──────────────────────────────────────────────────
  A single interval ticks every TICK milliseconds and rebuilds the whole
  display: an array of 371 small numbers, one per cell, each saying what that
  cell shows this frame. Render is then dumb, just a lookup from number to
  colour class.

  Two sweeps run left to right across the columns:
    1. the word lights up, each cell stuttering briefly before it holds
    2. a band of noise crosses the board, and behind it the real year is left

  Every cell scrambles on the second pass, not just the lit ones, so the whole
  grid comes alive rather than only the letters.
*/

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buildMosaic, DAYS, PADDING, WEEKS } from "../../lib/contributions";

const MOSAIC = buildMosaic();

/*
  TIMING, all of it, in one place, in milliseconds.

  Animation code goes bad when durations are scattered through the markup, so
  these are the only numbers that control the feel.

  TICK is the one worth playing with first. It is the frame rate of the whole
  thing, and it is deliberately slow: about 18 frames a second. Smooth it out to
  16ms and the flicker turns into a shimmer and stops reading as switching. The
  chunkiness IS the effect.
*/
const TICK = 55; //          ms per frame of the display
const WORD_SWEEP = 20; //     added delay per column as the word lights up
const WORD_STUTTER = 200; //  how long a cell flickers before it holds on
const HOLD = 1200; //         how long the finished word sits there, readable
const RESOLVE_SWEEP = 22; //  added delay per column as the year resolves
const SCRAMBLE = 320; //      how long a cell shows noise before its real level
const BLINK = 0.012; //       chance per cell per frame of a blink while holding

/*
  CELL COLOURS, written out in full, never built by string concatenation.

  Tailwind scans source files for complete class names, so `bg-chartreuse-400`
  is found and generated, while `bg-chartreuse-${step}` is invisible to it and
  silently produces no CSS. A lookup array is the standard way round that.

  Index 0 to 4 are GitHub's own intensity steps. Index 5 is the word, in the
  accent, so the letters read as one solid mark rather than as data.

  These are CHARTREUSE, not green, which is a deliberate departure from the
  GitHub original: globals.css reserves the green ramp for positive STATE and
  says never to use it as decoration. Chartreuse is the one hero accent, so a
  decorative graph belongs there instead.
*/
const CELL_CLASS = [
  "bg-grey-100", //       0: nothing that day
  "bg-chartreuse-200", // 1
  "bg-chartreuse-400", // 2
  "bg-chartreuse-600", // 3
  "bg-chartreuse-800", // 4: busiest
  "bg-accent", //         5: lit as part of the word
];

const OFF = 0;
const WORD = 5;
const BLANK = -1; // not a real day, draw nothing at all

/*
  Per-cell jitter, from a hash rather than Math.random().

  Two reasons. It has to be identical on the server and in the browser or React
  complains at hydration. And it has to be stable across replays, so the
  animation has a fixed character rather than being differently ragged each
  time. Same two coordinates in, same number out, forever.
*/
function jitter(week: number, day: number) {
  const h = Math.imul((week * 73856093) ^ (day * 19349663), 2654435761);
  return ((h >>> 0) % 1000) / 1000;
}

type Plan = {
  level: number; // the real data level for this cell, or BLANK
  isWord: boolean;
  lightAt: number; // when it joins the word
  settleAt: number; // when it locks to its real level
};

/*
  Work out, once, when every cell does what. Pure arithmetic over the grid, so
  the per-frame code below stays a set of comparisons and nothing has to be
  recalculated 18 times a second.
*/
function buildPlan() {
  const lit = MOSAIC.cells.filter((c) => c.isWord);
  const wordEnd =
    Math.max(...lit.map((c) => c.week * WORD_SWEEP + jitter(c.week, c.day) * 140)) +
    WORD_STUTTER;
  const resolveStart = wordEnd + HOLD;

  const plan: Plan[] = MOSAIC.cells.map((cell) => ({
    level: cell.level === PADDING ? BLANK : cell.level,
    isWord: cell.isWord,
    lightAt: cell.week * WORD_SWEEP + jitter(cell.week, cell.day) * 140,
    settleAt:
      resolveStart +
      SCRAMBLE +
      cell.week * RESOLVE_SWEEP +
      jitter(cell.day, cell.week) * 160,
  }));

  return { plan, end: Math.max(...plan.map((p) => p.settleAt)) + TICK };
}

/* Computed once when the module loads, not inside the component. It depends on
   nothing but the data, it is pure arithmetic with no randomness in it, and so
   it produces the same answer on the build machine as in the browser. */
const { plan: PLAN, end: END } = buildPlan();

/* The two states that need no animation to reach: everything dark, and the
   finished graph. Precomputed because they are also what we fall back to before
   the animation starts and when motion is switched off. */
const EMPTY = PLAN.map((cell) => (cell.level === BLANK ? BLANK : OFF));
const SETTLED = PLAN.map((cell) => cell.level);

/* What a cell shows at time `t`. The order of these checks is the animation. */
function valueAt(cell: Plan, t: number) {
  if (cell.level === BLANK) return BLANK; // never a day, never lights

  // Past its settle time: this is just the graph now.
  if (t >= cell.settleAt) return cell.level;

  // Inside the noise band that sweeps across ahead of the settle.
  if (t >= cell.settleAt - SCRAMBLE) {
    return Math.random() < 0.25 ? OFF : 1 + Math.floor(Math.random() * 4);
  }

  // Still in the word phase.
  if (!cell.isWord || t < cell.lightAt) return OFF;
  if (t < cell.lightAt + WORD_STUTTER) return Math.random() < 0.5 ? WORD : OFF;
  return Math.random() < BLINK ? OFF : WORD; // the odd bulb dropping out
}

/*
  Does this visitor's operating system ask for reduced motion?

  The tempting version of this is `useState` plus a `useEffect` that calls
  matchMedia and sets the state. It works, but it is the wrong shape twice over:
  it renders once with a guessed answer and again with the real one, and it goes
  stale if someone changes the setting while the page is open.

  useSyncExternalStore is React's purpose-built hook for exactly this: reading a
  value that lives OUTSIDE React and changes on its own. You hand it three
  things: how to subscribe, how to read the current value, and what to assume on
  the server (where there is no `window`, so: no preference). React then keeps
  the component in step with it, and hydration cannot mismatch.
*/
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export default function ContributionMosaic() {
  const [frame, setFrame] = useState<number[] | null>(null);
  const [run, setRun] = useState(0); // bumping this restarts the animation
  const container = useRef<HTMLDivElement>(null);

  /* `still` = this visitor asked their OS for reduced motion. We do not just
     slow the animation down, we skip it: a grid of squares flashing on and off
     is close to the worst case for anyone who asked for less of that. The
     finished graph is the real content; the word is a flourish on top.

     Note it is DERIVED, not stored. Working it out during render means there is
     no second copy of the truth to keep in sync. */
  const still = usePrefersReducedMotion();
  const display = still ? SETTLED : (frame ?? EMPTY);

  const play = useCallback(() => setRun((n) => n + 1), []);

  /* Start when it is actually on screen, not when the page loads. If this sits
     below the fold, an animation that fires on mount is one the visitor scrolls
     down to find already finished. All cost, no payoff.

     IntersectionObserver is the browser's built-in way to ask "is this element
     visible yet" without listening to every scroll event. */
  useEffect(() => {
    if (still || run > 0) return;

    const node = container.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect(); // one-shot: play once, then stop watching
          play();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [play, run, still]);

  /* The projector. One interval, rebuilding the whole display each tick, until
     the last cell has settled. Re-running whenever `run` changes is what makes
     replay work: the effect tears the old interval down and starts a new one
     from t=0. */
  useEffect(() => {
    if (still || run === 0) return;

    const started = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now() - started;
      if (t >= END) {
        setFrame(SETTLED); // lock to the real thing, no lingering noise
        window.clearInterval(id);
        return;
      }
      setFrame(PLAN.map((cell) => valueAt(cell, t)));
    }, TICK);

    return () => window.clearInterval(id);
  }, [run, still]);

  const finished = frame === SETTLED;

  return (
    <section className="border-t border-border pt-5 sm:rounded-card sm:border sm:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="kat-mono-sm uppercase tracking-wider text-ink-mid">Commits</h2>

        {/* Only offered once there is something to replay, and never to someone
            who asked for reduced motion, because for them there was no
            animation to see a second time. */}
        {finished && !still && (
          <button
            type="button"
            onClick={play}
            className="kat-mono-xs uppercase tracking-wider text-ink-light transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Replay
          </button>
        )}
      </div>

      <p className="kat-body-sm mt-4 text-ink-mid">
        <span className="tabular-nums text-ink">{MOSAIC.total}</span> contributions in the
        last year
      </p>

      {/*
        THE GRID. `aspect-[53/7]` is what keeps the cells square: the container
        is 53 columns by 7 rows, so giving it the same ratio means one cell is
        one square at every width. No JavaScript involved in staying square.

        `grid-auto-flow: column` fills DOWN each column before moving right,
        which is the order a contribution graph reads in and the order the data
        is stored in, so the cells map straight over with no index arithmetic.
      */}
      <div
        ref={container}
        className="mt-3 grid aspect-[53/7] w-full"
        style={{
          gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
          gridTemplateRows: `repeat(${DAYS}, 1fr)`,
          gridAutoFlow: "column",
        }}
        aria-hidden
      >
        {display.map((value, index) => (
          /*
            One div per cell, no wrapper. The gap between squares is made by
            scaling each one down slightly inside its grid track, rather than by
            `gap`, because a gap has to be given a length: 2px looks right on a
            laptop and swallows a third of the grid on a phone. A scale is
            relative by nature, so the gaps shrink with the squares and the
            whole thing stays proportional at any width with no breakpoint.
          */
          <div
            key={index}
            className={`scale-[0.86] rounded-[2px] ${
              value === BLANK ? "" : CELL_CLASS[value]
            }`}
          />
        ))}
      </div>

      {/* Month labels, positioned as a percentage of the width so they stay
          locked to their column at any size. */}
      <div className="relative mt-2 h-3 w-full" aria-hidden>
        {MOSAIC.months.map((month) => (
          <span
            key={month.label + month.week}
            className="kat-mono-xs absolute top-0 text-ink-light"
            style={{ left: `${(month.week / WEEKS) * 100}%` }}
          >
            {month.label}
          </span>
        ))}
      </div>

      {/* The legend, straight from the original. */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="kat-mono-xs text-ink-light">Less</span>
        {CELL_CLASS.slice(0, 5).map((className, level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
        ))}
        <span className="kat-mono-xs text-ink-light">More</span>
      </div>
    </section>
  );
}
