"use client";

/*
  WorkCases — the interactive part of the WORK page.

  Kept separate from app/work/page.tsx so the page itself can stay a server
  component; only this piece (which holds "which case is open?" state) runs in
  the browser.

  The index is a grid of BENTO CARDS — image + title + skill tags. Clicking a
  card opens its full detail in the shared SidePanel (right drawer on desktop,
  bottom sheet on mobile). Every case is ONE object in CASES, all sharing the
  same schema, so adding a case later = adding an object.

  Card art (`image`) and the artifacts inside the panel (live sign-in component,
  strategy diagram) are placeholders for now — Katie drops real images in, and
  we build the live artifacts next.
*/

import Image from "next/image";
import { useState } from "react";
import SidePanel from "./SidePanel";
import SignInCase from "./SignInCase";

type Case = {
  id: string;
  kicker: string; // "Strategy" / "Craft" — small overlay label on the card
  title: string;
  tags: string[]; // skill tags on the card (Katie will tune these)
  image?: string; // card art — placeholder until supplied
  // ── panel detail ──
  thesis: string; // one line
  role: string;
  org: string;
  year: string;
  artifactLabel: string; // placeholder until the real artifact is built
  moves: string[]; // 2–3 tight highlights
  /*
    A case that has been properly built out supplies its own body, rendered in
    the panel in place of the generic thesis/artifact/moves layout below. Cases
    still being written leave it off and get the fallback, so the index never
    waits on every case being finished.

    `wide` opens that case in the roomier drawer: a built-out case carries a
    grid and a row of clips, which the default 720px cannot lay out.
  */
  Detail?: () => React.ReactNode;
  wide?: boolean;
  /*
    Kept out of the index while the case is still being written.

    A flag rather than deleting or commenting out the case: the copy below is
    the thinking so far, and it should survive being hidden. Drop the line to
    put a case back on the page.
  */
  draft?: boolean;
};

const CASES: Case[] = [
  {
    id: "member-portal",
    draft: true,
    kicker: "Strategy",
    title: "Better member UX, without risking revenue",
    tags: ["Member UX", "Growth / A-B testing", "Systems design"],
    thesis:
      "Restructured Ffern's membership model so the portal could flex — for the member, and for growth — in a revenue-critical area.",
    role: "Senior Product Designer",
    org: "Ffern",
    year: "2025",
    artifactLabel: "Membership model — before → after diagram",
    moves: [
      "Separated membership-level concerns from order-level decisions",
      "Shaped the membership structure for flexibility, UX and growth metrics",
      "Gave members a clear view of their delivery schedule",
    ],
  },
  {
    id: "sign-in",
    kicker: "Craft",
    title: "Ffern sign-in component",
    /*
      Master in assets/work/, resized into /public/_img at build time. It is
      cut to 4:3, the same shape as the card slot, so object-cover has nothing
      to trim and the framing on the page is the framing it was cropped to.
    */
    image: "/work/sign-in-cover.png",
    tags: ["Component design", "Design → build", "React"],
    thesis:
      "Designed and built the member sign-in as a real, working component — not a screenshot.",
    role: "Senior Product Designer",
    org: "Ffern",
    year: "2025",
    artifactLabel: "Live sign-in component — mobile → one-time passcode → success",
    moves: [
      "Mobile-number entry with one-time-passcode verification",
      "Full state set: loading, error, success",
      "Rebuilt in React from the Figma design, auth stubbed",
    ],
    Detail: SignInCase,
    wide: true,
  },
  {
    id: "assembly",
    draft: true,
    kicker: "0 → 1",
    title: "Behavioural design for a 0→1 parenting app",
    tags: ["Behavioural design", "UX research", "0→1 product"],
    thesis:
      "Helped define Assembly from a blank slate — behavioural design for a parenting app, from concept to prototype.",
    role: "UX Designer",
    org: "Assembly",
    year: "2022–2023",
    artifactLabel: "Assembly — behavioural flows & app screens",
    moves: [
      "Defined an early-stage product from zero (0→1)",
      "Behavioural design: check-ins, skill-building, habit loops",
      "UX research and prototyping to pressure-test the concept",
    ],
  },
];

// ── One bento card in the index. Whole card opens the panel. ────────────────
function CaseCard({ c, onOpen }: { c: Case; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group @container relative block w-full overflow-hidden rounded-card border border-border text-left transition hover:border-border-dark hover:shadow-sm"
    >
      {/*
        The card IS the artwork: one 4:3 frame, with the caption laid over its
        foot rather than stacked underneath it.

        This is what makes the frost real, and it took a few tries to see why.
        With the caption in normal flow the card became taller than the artwork
        (4:3 image plus a 100px caption is nearly square), so covering it threw
        away a quarter of the picture off the sides AND left the caption sitting
        over the empty margin at the bottom of the crop. Nothing behind it, so
        nothing to blur.

        Overlaying instead fixes both at once: the card is exactly the artwork's
        own shape, so object-cover trims nothing, and the caption falls on the
        part of the picture that has something in it.

        The cover is cut to suit: the component is bottom-anchored in the frame
        so its passcode boxes and helper text sit in the bottom third, under the
        glass, instead of being centred with dead space there.
      */}
      <div className="relative aspect-[4/3] w-full bg-ink/2">
        {c.image ? (
          <Image
            src={c.image}
            alt=""
            fill
            /*
              The arithmetic the grid actually does, so the browser can pick a
              file. Each line is viewport, less the sidebar and page padding,
              less the gap, halved. Top line is where max-w-6xl stops it growing.
            */
            sizes={[
              "(min-width: 1392px) 528px", // capped: (1152 - 80 - 16) / 2
              "(min-width: 768px) calc(50vw - 168px)", // sidebar + px-10
              "(min-width: 640px) calc(50vw - 32px)", // 2 up, no sidebar yet
              "calc(100vw - 48px)", // single column on a phone
            ].join(", ")}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center kat-mono-xs uppercase tracking-wider text-ink-light">
            image
          </span>
        )}

        {/*
          Title + tags on glass.

          bg-bg is the hueless grey token, so the panel itself adds no colour and
          everything warm or cool in it is the artwork showing through.

          30% and an 8px blur: sheer enough that the passcode boxes stay legible
          shapes rather than a smear, which is the whole point of putting them
          under there. The title stays readable because what is behind it is
          light (white boxes on sand) and the text is near-black, so the scrim is
          softening contrast that was never close to the limit.

          The top stroke is the edge of the glass. Without it the panel's top
          just dissolves and the artwork appears to fade out for no reason
          rather than passing under something.

          Padding and gaps tighten on a narrow CARD, not a narrow window. The
          same card is 327px on a phone and 376px in the desktop two-up, and at
          both the tags were wrapping to a second row, which pushed the panel to
          half the artwork. The saving is mostly that second row disappearing.
        */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 border-t border-ink/4 bg-bg/30 p-4 backdrop-blur-[8px] @sm:gap-3 @sm:p-5">
          <h2 className="kat-body-lg font-medium text-balance text-ink">{c.title}</h2>
          <div className="flex flex-wrap gap-1 @sm:gap-1.5">
            {c.tags.map((t) => (
              <span
                key={t}
                className="kat-mono-xs rounded-full border border-border/70 bg-bg/40 px-1.5 py-1 uppercase tracking-wider text-ink-mid @sm:px-2"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── The case detail rendered inside the panel. ──────────────────────────────
function CaseDetail({ c }: { c: Case }) {
  if (c.Detail) return <c.Detail />;

  return (
    <article>
      <span className="kat-mono-sm uppercase tracking-wider text-ink-light">{c.kicker}</span>
      <h2 className="mt-4 text-3xl font-medium leading-tight text-balance text-ink">{c.title}</h2>
      <p className="kat-body-xl mt-6 text-ink-dark">{c.thesis}</p>

      {/* Artifact placeholder — the live component / diagram lands here next. */}
      <div className="mt-10 flex min-h-64 items-center justify-center rounded-card border border-dashed border-border-dark bg-surface px-6 text-center">
        <span className="kat-mono-sm uppercase tracking-wider text-ink-light">
          {c.artifactLabel}
        </span>
      </div>

      <ul className="mt-10 flex flex-col gap-4">
        {c.moves.map((m) => (
          <li key={m} className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="kat-body-lg text-ink-mid">{m}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function WorkCases() {
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = CASES.filter((c) => !c.draft);
  const active = shown.find((c) => c.id === openId) ?? null;

  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {shown.map((c) => (
          <CaseCard key={c.id} c={c} onOpen={() => setOpenId(c.id)} />
        ))}

        {/*
          The empty half of the row, while there is only one case published.

          It earns its place twice: it stops a lone card sitting next to a gap
          that reads as a layout bug, and it says the section is mid-build
          rather than finished and thin.

          A div, not a button, and no hover state: there is nothing behind it,
          and a card that looks clickable but isn't is worse than no card. Grid
          items stretch by default, so it takes the height of the real card
          beside it without being told what that height is.

          NOT aria-hidden. The dashed box is decoration, but the sentence inside
          it isn't: "more coming" is the same useful news to someone listening
          to the page as it is to someone looking at it.

          Delete this block once a second case is published.
        */}
        <div className="flex min-h-40 items-center justify-center rounded-card border border-dashed border-border-dark p-5 text-center">
          <span className="kat-mono-xs uppercase tracking-wider text-ink-light">
            More projects coming soon
          </span>
        </div>
      </div>

      <SidePanel
        open={!!active}
        onClose={() => setOpenId(null)}
        label={active?.title}
        wide={!!active?.wide}
      >
        {active && <CaseDetail c={active} />}
      </SidePanel>
    </>
  );
}
