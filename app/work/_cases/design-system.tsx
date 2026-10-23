"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { imageSize } from "../../../lib/image-size";
import type { Case } from "../../../lib/work";
import { CaseArticle, CaseHeader } from "./case-layout";

/*
  Ffern design system: the case detail, rendered inside the WORK drawer.

  The header is the shared one from case-layout.tsx, so it lines up with the
  other cases. The rest is this case's own.

  The "before" paragraphs are Katie's words, kept as written.

  The header paragraph is a first pass by Claude. Replace it.
*/

/*
  Each problem as [lead, rest]: the first sentence is set apart so it can be
  bold, and keeping it as its own string means nothing has to find the first
  full stop at render time (which "24×24" or "e.g." would one day get wrong).
*/
const BEFORE: [string, string][] = [
  ["Design and code had drifted apart.", "Storybook held 291 components. Only 56 of them (19%) had any counterpart in Figma, and only 41 (14%) shared a name."],
  ["Icons had no grid.", "There were 63 icon files across 22 different canvas sizes. Only 11 sat on a 24×24 grid. The rest were cropped tight to their artwork, down to sizes like 4×7 and 8×13, so no two icons lined up or scaled together. 36 had their colours hard-coded instead of inheriting the surrounding text colour. Without a shared vocabulary, the same idea had been drawn over and over: seven different ticks, four right chevrons and two PayPal marks."],
  ["Storybook had no clear structure.", "It had 34 categories. Some overlapped: “Checkout”, “Basket”, “Checkout & Basket” and “Checkout and Basket” all existed side by side. Nine categories held a single component. “UI” was the default for anything that didn’t fit elsewhere: its 31 components ranged from buttons to a moon-phase widget to entire thank-you screens."],
  ["Documentation lived in the wrong place.", "Designers spent hours on polished documentation pages in Figma that went stale as soon as the code moved on. Engineers didn’t read them. Nothing kept them true."],
  ["AI agents were working blind.", "Engineers were increasingly building UI with AI agents, but the system’s knowledge was trapped in Figma pages agents couldn’t read. When an agent tried to read the Foundations file, the file was too big to load in one go. So agents guessed, and every guess added another one-off component."],
];

/*
  The solution, one part at a time. `body` and `image` are optional so a part
  can be named before its copy or its visual exists; a missing body says so
  rather than leaving a gap that reads as a bug.
*/
const SOLUTION: { title: string; body?: string; image?: { src: string; alt: string } }[] = [
  { title: "Component reference documents" },
  {
    title: "Semantic and component level tokens",
    image: {
      src: "/work/design-system-tokens.png",
      alt: "The Ffern sign-in screen annotated with the tokens behind each part: background.light, text.default, text.light, text.dark, feedback.success light, mid and dark, input field border and background, and text.link.terracotta.",
    },
  },
];

/*
  Prose sits at a readable measure: full width in a narrow drawer, eight of
  the twelve columns in a wide one, where full width would run past 100
  characters a line. Images take all twelve, because an annotated screen is
  only legible at size.
*/
const PROSE = "col-span-12 @4xl:col-span-8";

const TABS = [
  ["before", "Before"],
  ["solution", "Solution"],
] as const;

type Tab = (typeof TABS)[number][0];

/*
  The tab row, built to the WAI-ARIA tabs pattern so it works from a keyboard
  and a screen reader, not only a mouse: one tab stop for the whole row (the
  active tab), arrow keys move between tabs, and each tab names the panel it
  controls.

  Selection follows focus. With two short panels there is nothing slow to
  load, so making someone press Enter after arrowing would be a step for
  nothing.
*/
function Tabs({
  active,
  onChange,
  ids,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  ids: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + TABS.length) % TABS.length;
    onChange(TABS[next][0]);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Before and solution"
      className="col-span-12 flex gap-2"
    >
      {TABS.map(([key, label], i) => {
        const selected = key === active;
        return (
          <button
            key={key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${ids}-${key}`}
            aria-selected={selected}
            aria-controls={`${ids}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`kat-mono-sm rounded-[4px] border px-3 py-1.5 uppercase tracking-wider transition-colors ${
              selected
                ? "border-ink bg-ink text-ink-inverse"
                : "border-border text-ink-mid hover:border-border-dark hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/*
  A solution image, at its own shape: width and height come from the build's
  image manifest, so the space is reserved before the file arrives and nothing
  below it jumps.

  `sizes` is the drawer's content width: 1000px wide drawer less 80px padding
  at xl, 720 less 80 at lg, 640 less 80 at md, and the phone sheet less 48.
*/
function SolutionImage({ src, alt }: { src: string; alt: string }) {
  const size = imageSize(src);
  if (!size) return null;
  return (
    <figure className="col-span-12 mt-2">
      <Image
        src={src}
        alt={alt}
        width={size.width}
        height={size.height}
        sizes={[
          "(min-width: 1280px) 920px",
          "(min-width: 1024px) 640px",
          "(min-width: 768px) 560px",
          "calc(100vw - 48px)",
        ].join(", ")}
        className="h-auto w-full"
      />
    </figure>
  );
}

export default function DesignSystemCase({ c }: { c: Case }) {
  const [tab, setTab] = useState<Tab>("before");
  const ids = useId();

  return (
    <CaseArticle>
      <CaseHeader c={c} tools="Figma, Storybook, Claude Code">
        Taking ownership of Ffern&rsquo;s design system and restructuring it so that Figma,
        Storybook and the AI agents engineers build with all work from the same source.
      </CaseHeader>

      {/*
        Before and Solution as tabs, across the top of the section.

        Tabs rather than two sections one after the other because the two are
        meant to be compared, and switching in place keeps the reader at the
        same point on the page instead of scrolling past five paragraphs of
        problem to reach the answer.

        The tabs get their own row rather than the header's four column title
        slot, because the solution carries images that need the full width
        under them, and a panel starting at column 6 couldn't give it.

        Styled as the archive's filter chips, so the site has one look for
        "pick one of these" rather than two.
      */}
      <section className="mt-16">
        <hr className="border-0 border-t border-border" />
        <div className="mt-12 grid grid-cols-12 gap-x-6">
          <Tabs active={tab} onChange={setTab} ids={ids} />

          <div
            role="tabpanel"
            id={`${ids}-panel`}
            aria-labelledby={`${ids}-${tab}`}
            className="col-span-12 mt-8 grid grid-cols-12 gap-x-6 gap-y-5"
          >
            {tab === "before"
              ? BEFORE.map(([lead, rest]) => (
                  <p key={lead} className={`kat-body-md text-ink-dark ${PROSE}`}>
                    <strong className="font-semibold text-ink">{lead}</strong> {rest}
                  </p>
                ))
              : SOLUTION.map((part, i) => (
                  <div
                    key={part.title}
                    className={`col-span-12 grid grid-cols-12 gap-x-6 gap-y-5 ${i > 0 ? "mt-9" : ""}`}
                  >
                    <h3 className={`kat-body-md font-semibold text-ink ${PROSE}`}>{part.title}</h3>
                    <p
                      className={`kat-body-md -mt-3 ${part.body ? "text-ink-dark" : "text-ink-light"} ${PROSE}`}
                    >
                      {part.body ?? "Copy to come."}
                    </p>
                    {part.image && <SolutionImage {...part.image} />}
                  </div>
                ))}
          </div>
        </div>
      </section>
    </CaseArticle>
  );
}
