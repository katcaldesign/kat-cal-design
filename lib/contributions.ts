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
  One square of the grid.

  `level` is GitHub's own intensity step, 0 (nothing that day) to 4 (busiest).
  PADDING is the exception: the calendar year does not begin on a Sunday and
  today is rarely a Saturday, so a few cells in the first and last columns are
  not days at all. They are drawn as nothing, which is what gives a real
  contribution graph its ragged top-left and bottom-right corners.
*/
export const PADDING = -1;

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
  const cells: Cell[] = [];

  /* The levels string is week-major: seven characters per column, columns left
     to right. Reading it in that order builds the grid in the same order a CSS
     grid with `grid-auto-flow: column` fills itself, so the component can map
     straight over this array with no index arithmetic. */
  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < DAYS; day++) {
      const index = week * DAYS + day;
      const mark = data.levels[index];

      cells.push({
        week,
        day,
        level: mark === "." ? PADDING : Number(mark),
        count: data.counts[index] ?? 0,
        isWord: word.has(`${week},${day}`),
      });
    }
  }

  return { cells, total: data.total, months: monthLabels() };
}
