/*
  contributions: the grid the ContributionMosaic draws.

  All the shape lives here; the component next door only animates and renders.
  That split is the same one as archive.ts / ArchiveGrid.tsx: a file of plain
  data and pure functions, and a file of JSX. It means you can reason about
  "is the word centred, are the month labels right" without reading any React.

  WHERE THE NUMBERS COME FROM
  ---------------------------
  lib/contributions-data.json, written by scripts/fetch-contributions.mjs on
  every build. If a GH_CONTRIBUTIONS_TOKEN is present that file holds your real
  calendar straight from GitHub's GraphQL API; if not, it holds the last one
  fetched, or a plausible stand-in on a fresh clone. Either way this file just
  reads it, so nothing here needs to know which it got. `SOURCE` says which, if
  you ever want to show it.
*/

import data from "./contributions-data.json";

export const WEEKS = 53; // columns. GitHub shows a rolling year
export const DAYS = 7; //   rows. Sunday at the top, like GitHub

/* "github" or "generated". The fetch script decides. */
export const SOURCE = data.source;

/*
  THE INTENSITY STEPS
  -------------------
  Six, not GitHub's four, and the thresholds are worked out from the year in
  hand rather than fixed.

  This matters more than it sounds. GitHub buckets a contribution calendar by
  quartile, and a real year is heavily skewed: many days of one or two commits,
  a handful of twenty-plus. Under quartiles almost everything lands on the
  palest step. On the first live fetch, 43 of 52 active days came out identical
  and the graph read as one flat tone.

  So the steps are quantiles of the ACTIVE days only. Each of the six gets
  roughly a sixth of the days that had any activity, whatever the shape of the
  year. The same 52 days that GitHub splits 43/4/3/2 come out 12/13/8/6/5/8.

  The trade is that the colours no longer match github.com exactly. A day shown
  two steps up here might be one step up there. The graph is still true to the
  counts, it is just scaled to this year rather than to GitHub's quartiles.
*/
export const MAX_LEVEL = 6;

/*
  One square of the grid.

  `level` is 0 (nothing that day) to MAX_LEVEL (busiest). PADDING is the
  exception: the calendar year does not begin on a Sunday and today is rarely a
  Saturday, so a few cells in the first and last columns are not days at all.
  They are drawn as nothing, which is what gives a real contribution graph its
  ragged top-left and bottom-right corners.
*/
export const PADDING = -1;

/*
  Where one step ends and the next begins, read off the sorted active days.

  Take the count a sixth of the way through the list, then two sixths, and so
  on. Five boundaries, six steps.

  The nudge at the end is the part worth understanding. Ties can land two
  boundaries on the same count: a quiet year where half the active days are a
  single commit produces marks of [1, 1, 1, 2, 10], and the steps between the
  repeated 1s can never contain anything, because no count is both greater than
  1 and not greater than 1. Two of the six colours would then never appear.

  So when a boundary repeats, it moves up to the next count that actually
  occurs. [1, 1, 1, 2, 10] becomes [1, 2, 3, 4, 10]. Buckets come out less even,
  which is the honest result, but every step is reachable. If the year genuinely
  has fewer distinct counts than steps, the top boundaries stay equal and the
  darkest colours go unused, which is also the honest result.
*/
function thresholds(counts: (number | null)[]) {
  const active = counts.filter((c): c is number => c !== null && c > 0).sort((a, b) => a - b);
  if (active.length === 0) return [];

  const distinct = [...new Set(active)];
  const marks: number[] = [];

  for (let step = 1; step < MAX_LEVEL; step++) {
    const index = Math.min(active.length - 1, Math.floor((active.length * step) / MAX_LEVEL));
    let mark = active[index];

    const previous = marks[marks.length - 1];
    if (previous !== undefined && mark <= previous) {
      mark = distinct.find((c) => c > previous) ?? previous;
    }

    marks.push(mark);
  }

  return marks;
}

function levelFor(count: number, marks: number[]) {
  if (count <= 0) return 0;
  let level = 1;
  for (const mark of marks) if (count > mark) level++;
  return Math.min(level, MAX_LEVEL);
}

export type Cell = {
  week: number;
  day: number;
  level: number;
  count: number;
  isWord: boolean;
};

/*
  THE WORD
  --------
  A 5x7 pixel font, one string per row, `#` = lit. Seven rows is not a
  coincidence: a contribution graph is exactly seven rows tall (Sun to Sat), so
  a classic 5x7 bitmap letter fills the full height of the grid with nothing to
  spare. That is the whole reason this trick works.

  Seven letters at 5 wide + 1 space = 41 columns, which fits inside 53 with a
  six-column margin each side.

  To change the word, change WORD below, and add a 5x7 entry here for any letter
  it uses that is not already drawn. Anything with no glyph is treated as a
  blank, so a space works and a typo degrades to a gap rather than a crash.
  Bear in mind the width: 53 columns is eight letters at most.
*/
const GLYPHS: Record<string, string[]> = {
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
};

const WORD = "WELCOME";

/* A Set of "week,day" keys rather than an array, because the only question we
   ever ask it is "is this cell part of the word", and a Set answers that in one
   step instead of scanning 112 entries per cell. */
function buildWordCells(): Set<string> {
  const width = WORD.length * 6 - 1; // 5 wide + 1 gap, minus the trailing gap
  const startWeek = Math.floor((WEEKS - width) / 2);
  const cells = new Set<string>();

  WORD.split("").forEach((letter, index) => {
    const glyph = GLYPHS[letter];
    if (!glyph) return; // nothing drawn for this character, leave a gap
    const offset = startWeek + index * 6;

    glyph.forEach((rowString, day) => {
      rowString.split("").forEach((pixel, column) => {
        if (pixel === "#") cells.add(`${offset + column},${day}`);
      });
    });
  });

  return cells;
}

/*
  Month labels, positioned by column.

  The rule is GitHub's: label the column that holds the FIRST week of a month,
  meaning the one whose Sunday falls on the 1st to the 7th. The obvious
  alternative ("label whenever the month name changes") looks right until you
  build it: the leftmost column is a partial week, so it gets a label of its
  own, and the next month lands two columns later and prints on top of it. Ask
  for the first whole week instead and the labels come out naturally spaced four
  or five columns apart, with no partial month at either end.

  en-US, not en-GB, only because it abbreviates September as "Sep" rather than
  "Sept", which keeps every label the same width.
*/
function monthLabels() {
  const format = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const labels: { week: number; label: string }[] = [];

  data.columnDates.forEach((iso, week) => {
    if (!iso || week === WEEKS - 1) return;
    const date = new Date(`${iso}T00:00:00Z`);
    if (date.getUTCDate() <= 7) labels.push({ week, label: format.format(date) });
  });

  return labels;
}

export function buildMosaic() {
  const word = buildWordCells();
  const marks = thresholds(data.counts);
  const cells: Cell[] = [];

  /* The counts array is week-major: seven entries per column, columns left to
     right. Reading it in that order builds the grid in the same order a CSS
     grid with `grid-auto-flow: column` fills itself, so the component can map
     straight over this array with no index arithmetic. */
  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < DAYS; day++) {
      const count = data.counts[week * DAYS + day];

      cells.push({
        week,
        day,
        level: count === null ? PADDING : levelFor(count, marks),
        count: count ?? 0,
        isWord: word.has(`${week},${day}`),
      });
    }
  }

  return { cells, total: data.total, months: monthLabels(), marks };
}
