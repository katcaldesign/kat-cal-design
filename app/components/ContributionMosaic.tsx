"use client";

/*
  ContributionMosaic: a GitHub contribution graph that spells WELCOME first,
  then walks the word across the grid into the real year.

  ── The trick ───────────────────────────────────────────────────────────────
  A contribution graph is exactly SEVEN rows tall (Sunday to Saturday). A
  classic 5x7 bitmap letter is exactly seven rows tall too. So the word is not
  overlaid on the grid, it IS the grid: every lit pixel of "WELCOME" is a real
  cell, and the letters fill the full height with nothing left over.

  ── Nothing slides ──────────────────────────────────────────────────────────
  The single most important idea in this file: no square is ever between two
  cells. A square travels by switching off in one cell and on in the next, like
  a bulb in a departure board or a dot in a dot matrix display. It moves, but it
  moves in whole cells, one per frame.

  That is a deliberate choice over a CSS transform sliding the squares across.
  Sliding looks liquid and a bit precious. Switching looks like hardware, which
  is the right register for a contribution graph. It is also why there is not a
  single CSS transition on the cells: anything easing between two states would
  put the softness back.

  ── Where the squares go ────────────────────────────────────────────────────
  Every lit cell of the word is given a real day to travel to, and it walks
  there a cell at a time. Nothing appears out of nowhere: each square of the
  finished graph is a square that was part of the word a moment earlier.

  The word has 112 lit cells and a year has fewer active days than that, so
  targets are shared: roughly two squares converge on each day. The first to
  arrive deposits the day's colour and the rest simply go out on arrival, which
  reads as the word pouring into the year and draining away.

  ── How the timeline works ──────────────────────────────────────────────────
  A single interval ticks every TICK milliseconds and rebuilds the whole
  display: an array of 371 small numbers, one per cell, each saying what that
  cell shows this frame. Render is then dumb, just a lookup from number to
  colour class.
*/

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buildMosaic, DAYS, MAX_LEVEL, PADDING, WEEKS } from "../../lib/contributions";

const MOSAIC = buildMosaic();

/*
  TIMING, all of it, in one place, in milliseconds.

  Animation code goes bad when durations are scattered through the markup, so
  these are the only numbers that control the feel.

  TICK is the one worth playing with first. It is the frame rate of the whole
  thing, and it is deliberately slow: about 18 frames a second. It is also the
  travel speed, because a square advances one cell per tick. Smooth it out to
  16ms and the flicker turns into a shimmer and the walk turns into a glide.
  The chunkiness IS the effect.
*/
const TICK = 55; //            ms per frame, and one cell of travel
const WORD_SWEEP = 20; //      added delay per column as the word lights up
const WORD_STUTTER = 200; //   how long a cell flickers before it holds on
const HOLD = 1200; //          how long the finished word sits there, readable
const DEPART_STAGGER = 16; //  added delay per column, so the word peels apart
const MAX_STEPS = 22; //       cap on travel time, in ticks
const MIN_STEPS = 5; //        floor, so a short hop is still readable
const BLINK = 0.012; //        chance per cell per frame of a blink while held

/*
  CELL COLOURS, written out in full, never built by string concatenation.

  Tailwind scans source files for complete class names, so `bg-chartreuse-400`
  is found and generated, while `bg-chartreuse-${step}` is invisible to it and
  silently produces no CSS. A lookup array is the standard way round that.

  SIX steps rather than GitHub's four. GitHub buckets by quartile, and on a
  skewed year that put 43 of 52 active days on the same pale colour. The
  thresholds in lib/contributions.ts are worked out from the year in hand
  instead, which spreads the same days 12/13/8/6/5/8, so the ramp is actually
  used. More steps are only worth having if the data reaches them.

  These are CHARTREUSE, not green, which is a deliberate departure from the
  GitHub original: globals.css reserves the green ramp for positive STATE and
  says never to use it as decoration. Chartreuse is the one hero accent, so a
  decorative graph belongs there instead.
*/
const CELL_CLASS = [
  "bg-grey-100", //       0: nothing that day
  "bg-chartreuse-200", // 1
  "bg-chartreuse-300", // 2
  "bg-chartreuse-400", // 3
  "bg-chartreuse-600", // 4
  "bg-chartreuse-700", // 5
  "bg-chartreuse-900", // 6: busiest
  "bg-accent", //         7: a square of the word, lit or in transit
];

const OFF = 0;
const WORD = MAX_LEVEL + 1; // the last entry above
const BLANK = -1; //          not a real day, draw nothing at all

/* Grid position and flat array index are two views of the same thing. The
   cells array is week-major, so the index is just the arithmetic. */
const at = (week: number, day: number) => week * DAYS + day;

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

/* Ease in and out, so a square leans into its journey and settles at the end
   rather than crossing at a flat rate. Applied to the PATH, not to time: it
   changes which cells the square visits, which is what bunches its steps up at
   both ends. */
const smooth = (t: number) => t * t * (3 - 2 * t);

type Mover = {
  from: number; // index of its cell in the word
  path: number[]; // the cells it passes through, ending on its target
  lightAt: number;
  departAt: number;
  arriveAt: number;
};

type Deposit = { index: number; level: number; at: number };

function buildPlan() {
  const cells = MOSAIC.cells;
  const word = cells.filter((c) => c.isWord);
  const days = cells.filter((c) => c.level > 0);

  const firstWordWeek = Math.min(...word.map((c) => c.week));
  const wordEnd =
    Math.max(...word.map((c) => c.week * WORD_SWEEP + jitter(c.week, c.day) * 140)) +
    WORD_STUTTER;
  const migrateStart = wordEnd + HOLD;

  const movers: Mover[] = word.map((cell, i) => {
    /* Spread the squares evenly over the days rather than pairing one to one:
       there are always more squares than days. Both lists are in column order,
       so square i maps to roughly the day at the same position along the grid
       and the paths mostly run short and parallel instead of crossing.

       A year with no activity at all has nothing to send them to, so a square
       targets its own cell: the word appears, then goes out, leaving an empty
       grid. Unlikely, but a fetch that comes back empty should not be a blank
       page with an error in it. */
    const target = days.length > 0 ? days[Math.floor((i * days.length) / word.length)] : cell;

    const span = Math.max(
      Math.abs(target.week - cell.week),
      Math.abs(target.day - cell.day),
    );
    const steps = Math.max(MIN_STEPS, Math.min(MAX_STEPS, span));

    const path: number[] = [];
    for (let step = 1; step <= steps; step++) {
      const e = smooth(step / steps);
      path.push(
        at(
          Math.round(cell.week + (target.week - cell.week) * e),
          Math.round(cell.day + (target.day - cell.day) * e),
        ),
      );
    }

    const departAt = migrateStart + (cell.week - firstWordWeek) * DEPART_STAGGER;

    return {
      from: at(cell.week, cell.day),
      path,
      lightAt: cell.week * WORD_SWEEP + jitter(cell.week, cell.day) * 140,
      departAt,
      arriveAt: departAt + steps * TICK, // one cell of the path per tick
    };
  });

  /* A day lights up the moment the FIRST square reaches it. Later arrivals at
     the same day add nothing and just go out. */
  const earliest = new Map<number, number>();
  movers.forEach((mover) => {
    const index = mover.path[mover.path.length - 1];
    const best = earliest.get(index);
    if (best === undefined || mover.arriveAt < best) earliest.set(index, mover.arriveAt);
  });

  const finish = Math.max(...movers.map((m) => m.arriveAt));

  const deposits: Deposit[] = days.map((cell) => {
    const index = at(cell.week, cell.day);
    return {
      index,
      level: cell.level,
      /* A day nothing was sent to can only appear on its own, so it waits until
         the migration is over rather than popping up mid-flight. With a real
         year this never happens, since the word has more squares than the year
         has days, but a shorter word would make it possible. */
      at: earliest.get(index) ?? finish,
    };
  });

  return { movers, deposits, migrateStart, end: finish + TICK };
}

/* Computed once when the module loads, not inside the component. It depends on
   nothing but the data, it is pure arithmetic with no randomness in it, and so
   it produces the same answer on the build machine as in the browser. */
const { movers: MOVERS, deposits: DEPOSITS, migrateStart: MIGRATE, end: END } = buildPlan();

/* The two states that need no animation to reach: everything dark, and the
   finished graph. Precomputed because they are also what we fall back to before
   the animation starts and when motion is switched off. */
/* Typed explicitly: TypeScript would otherwise infer the narrow `(-1 | 0)[]`
   from the two literals here, and frameAt writes every level into a copy. */
const EMPTY: number[] = MOSAIC.cells.map((c) => (c.level === PADDING ? BLANK : OFF));
const SETTLED: number[] = MOSAIC.cells.map((c) => (c.level === PADDING ? BLANK : c.level));

/* What the whole grid shows at time `t`. Rebuilt from scratch each frame, which
   is simpler to reason about than working out what changed, and cheap at 371
   cells. */
function frameAt(t: number) {
  const out = EMPTY.slice();

  // The word assembling, before anything moves.
  if (t < MIGRATE) {
    for (const mover of MOVERS) {
      if (t < mover.lightAt) continue;
      const settling = t < mover.lightAt + WORD_STUTTER;
      const on = settling ? Math.random() < 0.5 : Math.random() > BLINK;
      if (on) out[mover.from] = WORD;
    }
    return out;
  }

  // Days that have already been reached.
  for (const deposit of DEPOSITS) {
    if (t >= deposit.at) out[deposit.index] = deposit.level;
  }

  /* Squares in transit are drawn last, so one passing over a day that has
     already landed reads as crossing in front of it rather than disappearing
     behind it. */
  for (const mover of MOVERS) {
    if (t >= mover.arriveAt) continue; // arrived, its day is lit instead
    if (t < mover.departAt) {
      out[mover.from] = WORD; // still waiting its turn to leave
      continue;
    }
    const step = Math.min(mover.path.length - 1, Math.floor((t - mover.departAt) / TICK));
    out[mover.path[step]] = WORD;
  }

  return out;
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
     the last square has arrived. Re-running whenever `run` changes is what makes
     replay work: the effect tears the old interval down and starts a new one
     from t=0. */
  useEffect(() => {
    if (still || run === 0) return;

    const started = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now() - started;
      if (t >= END) {
        setFrame(SETTLED); // lock to the real thing, no lingering flicker
        window.clearInterval(id);
        return;
      }
      setFrame(frameAt(t));
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

      {/* The legend. Seven swatches now: empty plus the six steps. */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="kat-mono-xs text-ink-light">Less</span>
        {CELL_CLASS.slice(0, MAX_LEVEL + 1).map((className, level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
        ))}
        <span className="kat-mono-xs text-ink-light">More</span>
      </div>
    </section>
  );
}
