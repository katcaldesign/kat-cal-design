"use client";

/*
  ExperienceJourney — the BACKGROUND card on the INFO page.

  A single card holding one row per role/study, newest first. Each row is
  logo tile · name + role · dates.

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
        className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg ${entry.logoBg ?? "bg-surface"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={entry.logo} alt="" className="h-full w-full object-cover" />
      </span>

      {/* min-w-0 lets this column actually shrink; the lines wrap rather than
          truncate, so a long course title is never cut off on mobile. */}
      <span className="min-w-0 grow">
        <span className="kat-body-md block text-ink">{entry.org}</span>
        <span className="kat-body-md block text-ink-mid">{entry.role}</span>
      </span>

      <span className="kat-body-md shrink-0 text-ink-mid tabular-nums">{entry.dates}</span>

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
      <li className="px-3 py-2">
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
        className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
          {/* pl-16 = logo tile (40px) + gap (12px) + row padding (12px), so the
              detail copy hangs off the same edge as the org name above it. */}
          <ul className="flex flex-col gap-2 pb-3 pl-16 pr-3 pt-1">
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
    <section className="max-w-[520px] rounded-card border border-border bg-bg p-5">
      <h2 className="kat-mono-sm uppercase tracking-wider text-ink">Background</h2>

      {/* -mx-3 pulls the rows' hover padding back out to the card edge, so the
          hover pill overhangs the text column rather than indenting it. */}
      <ul className="-mx-3 mt-5 flex flex-col gap-0.5">
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
