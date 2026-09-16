"use client";

/*
  ExperienceJourney — the BACKGROUND card on the INFO page.

  One row per role/study, newest first: logo tile · name + role · dates.

  ── Card on desktop, bare list on mobile ────────────────────────────────────
  From `sm` up this is a bordered card with its own padding. Below `sm` the
  chrome is dropped entirely: the border was a second container inside the
  page's own gutter, so it inset the rows by another 20px and broke their
  alignment with the h1 and intro copy above. The "BACKGROUND" label already
  does the grouping work, so on a phone the border only cost width.

  ── Row layout ──────────────────────────────────────────────────────────────
  A 2-column grid whose placement changes at `sm`:

    mobile          sm and up
    ┌─────┬─────┐   ┌─────────┬─────┐
    │ org │date │   │ org     │     │
    ├─────┴─────┤   ├─────────┤date │
    │ role      │   │ role    │     │
    └───────────┘   └─────────┴─────┘

  On a phone the dates ride up beside the org so the role gets the full row
  width and stops wrapping to two lines. The dates node is placed, not
  duplicated, so there's only ever one in the DOM.

  ── On the hover state ──────────────────────────────────────────────────────
  A row-wide background tint is a CLICK PROMISE: people read it as "this opens
  something". So the affordance is data-driven rather than blanket — a row only
  becomes a button (hover tint + chevron + expandable detail) when its entry
  has `detail`. Entries without `detail` render as plain, inert rows with no
  hover at all. Add a `detail` array later and that row starts behaving like a
  disclosure with no change to this component.

  Nothing has `detail` yet, so every row is currently inert — no hover, no
  chevron, nothing to click. To switch a row on, add the field:

    detail: ["One or two lines about the role."],
*/

import Image from "next/image";
import { useState } from "react";

type Entry = {
  id: string;
  org: string;
  role: string;
  dates: string;
  logo: string;
  /* Tile background behind a logo that has transparent padding. Logos that are
     already full-bleed coloured squares (Ffern, Brompton, Zinc…) cover the tile
     and never show this. */
  logoBg?: string;
  /* Present = this row expands on click. Absent = inert row, no hover. */
  detail?: string[];
};

const ENTRIES: Entry[] = [
  {
    id: "ffern",
    org: "Ffern",
    role: "Senior Product Designer",
    dates: "2025 – current",
    logo: "/logos/ffern.png",
  },
  {
    id: "brompton",
    org: "Brompton",
    role: "UX Designer",
    dates: "2022 – 2024",
    logo: "/logos/brompton.png",
  },
  {
    id: "assembly",
    org: "Assembly",
    role: "UX Designer",
    dates: "2022 – 2023",
    logo: "/logos/assembly.png",
  },
  {
    id: "zinc",
    org: "Zinc VC",
    role: "Innovation placement",
    dates: "2022",
    logo: "/logos/zinc.png",
  },
  {
    id: "loughborough",
    org: "Loughborough University",
    role: "Researcher in Behavioural Design",
    dates: "2021 – 2022",
    logo: "/logos/lboro.png",
  },
  {
    id: "gsa",
    org: "Glasgow School of Art",
    role: "MSc Product Design Engineering",
    dates: "2018 – 2019",
    logo: "/logos/gsa.png",
  },
  {
    id: "manchester",
    org: "Manchester University",
    role: "BSc Physics with Philosophy",
    dates: "2014 – 2017",
    logo: "/logos/manchester.png",
    logoBg: "bg-ash-50",
  },
];

/* The visible content of a row. Shared by both the inert and the button
   variants so the two can never drift apart. */
function RowContent({ entry, open }: { entry: Entry; open: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg ${entry.logoBg ?? "bg-surface"}`}
      >
        {/* `sizes` is doing real work here, not decoration. Without it,
            next/image treats a fixed-size image as [width, width*2], both of
            which round to the same 96px file, and emits a ONE-entry srcset
            ("…-96.webp 1x") — so a 3x phone had nothing better than 96 to pick
            for a box needing 144 and upscaled it. Declaring `sizes="48px"`
            switches Next to w-descriptors across the whole ladder and lets the
            browser choose on its own DPR: 96 at 2x, 144 at 3x. */}
        <Image
          src={entry.logo}
          alt=""
          width={48}
          height={48}
          sizes="48px"
          className="h-full w-full object-cover"
        />
      </span>

      {/* min-w-0 lets this column actually shrink; the lines wrap rather than
          truncate, so a long course title is never cut off. Column 2 is `auto`,
          so it's only ever as wide as the date range needs. */}
      <span className="grid min-w-0 grow grid-cols-[1fr_auto] items-baseline gap-x-3 sm:items-center">
        <span className="kat-body-md col-start-1 row-start-1 text-ink">{entry.org}</span>

        {/* Full width on mobile (spans under the dates), own column from sm. */}
        <span className="kat-body-md col-span-2 col-start-1 row-start-2 text-ink-mid sm:col-span-1">
          {entry.role}
        </span>

        {/* Beside the org on mobile; a third column centred against both lines
            from sm, which is what keeps the dates in a clean right-hand column
            on desktop.

            Sans one step down from the role (12px vs 14px), so the dates
            recede without changing face. Size is doing the work that colour
            alone couldn't: at the same 14px the role and the date read as
            equal weight and compete. tabular-nums matters here in a way it
            didn't in mono — Geist is proportional, so without it a "1" is
            narrower than a "4" and the right-hand column on desktop goes
            visibly ragged down the card. */}
        <span className="kat-body-sm col-start-2 row-start-1 text-right text-ink-mid tabular-nums sm:row-span-2 sm:self-center">
          {entry.dates}
        </span>
      </span>

      {/* Chevron only on rows that actually open. Rotates to point up when open. */}
      {entry.detail && (
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 shrink-0 text-ink-light transition-transform duration-200 ${
            open ? "-rotate-180" : ""
          }`}
        >
          <path
            d="M4 6.5 8 10.5 12 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

function Row({
  entry,
  open,
  onToggle,
}: {
  entry: Entry;
  open: boolean;
  onToggle: () => void;
}) {
  // No detail = nothing to open, so no button and no hover affordance.
  if (!entry.detail) {
    return (
      <li className="py-2 sm:px-3">
        <RowContent entry={entry} open={false} />
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${entry.id}-detail`}
        className="w-full rounded-lg py-2 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3"
      >
        <RowContent entry={entry} open={open} />
      </button>

      {/*
        Height animation without a magic pixel number: the wrapper is a grid
        whose single row goes 0fr → 1fr. The inner div must own the overflow
        clip, because a grid item can't be sized below its content otherwise.
      */}
      <div
        id={`${entry.id}-detail`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {/* pl-15 = logo tile (48px) + gap (12px), so the detail copy hangs off
              the same edge as the org name above it. From sm the row also has
              12px of its own padding, hence pl-18. */}
          <ul className="flex flex-col gap-2 pb-3 pl-15 pt-1 sm:pl-18 sm:pr-3">
            {entry.detail.map((d) => (
              <li key={d} className="kat-body-md text-ink-mid">
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

export default function ExperienceJourney() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="border-t border-border pt-5 sm:max-w-[520px] sm:rounded-card sm:border sm:p-5">
      {/* The label is deliberately quiet. On mobile the hairline above it is
          what separates this section from the intro copy, so the label doesn't
          also have to shout to do that job — and keeping it quiet stops it
          reading as a second eyebrow competing with "INFO" up the page. Add a
          second section later and it gets the same rule + label, so the page
          stays a set of banded sections rather than a stack of boxes. */}
      <h2 className="kat-mono-sm uppercase tracking-wider text-ink-mid">Background</h2>

      {/* From sm, -mx-3 pulls the rows' hover padding back out to the card edge,
          so the hover pill overhangs the text column rather than indenting it.
          On mobile there's no card padding to cancel, so the rows sit flush with
          the page gutter and line up with the copy above. */}
      <ul className="mt-5 flex flex-col gap-0.5 sm:-mx-3">
        {ENTRIES.map((entry) => (
          <Row
            key={entry.id}
            entry={entry}
            open={openId === entry.id}
            onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
          />
        ))}
      </ul>
    </section>
  );
}
