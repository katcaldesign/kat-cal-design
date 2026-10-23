"use client";

/*
  WorkCases — the interactive part of the WORK page.

  Kept separate from app/work/page.tsx so the page itself can stay a server
  component; only this piece (which holds "which case is open?" state) runs in
  the browser.

  The index is a grid of flat cards: image, with title + skill tags beneath. Clicking a
  card opens its full detail in the shared SidePanel (right drawer on desktop,
  bottom sheet on mobile). Every case is ONE object in CASES, all sharing the
  same schema, so adding a case later = adding an object.

  Card art (`image`) and the artifacts inside the panel (live sign-in component,
  strategy diagram) are placeholders for now — Katie drops real images in, and
  we build the live artifacts next.
*/

import Image from "next/image";
import { useState } from "react";
import type { Case } from "../../lib/work";
import DesignSystemCase from "../work/_cases/design-system";
import SignInCase from "../work/_cases/sign-in";
import LoopVideo from "./LoopVideo";
import SidePanel from "./SidePanel";

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
    /*
      A real sign-in on a phone, from the tab switch to the portal: 18.5
      seconds, re-encoded to H.264 at 600px wide, about twice what the card
      shows it at, so it stays sharp on a 2x screen.
      The still above stays as the fallback if the clip is ever dropped.
    */
    coverVideo: {
      src: "/work/sign-in-cover.mp4",
      width: 600,
      height: 1304,
      poster: "/work/sign-in-cover-poster.jpg",
    },
    tags: ["Design → build", "Interaction design", "Edge cases"],
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
    id: "design-system",
    kicker: "Systems",
    title: "Ffern design system for agents",
    /*
      The copy below is a first pass by Claude, written from the "before" state
      Katie supplied. Replace it once the after is written.
    */
    tags: ["Design systems", "AI agents", "Figma → code"],
    thesis:
      "Took ownership of Ffern's design system and rebuilt it so Figma, Storybook and AI agents work from one source.",
    role: "Senior Product Designer",
    org: "Ffern",
    year: "2026",
    artifactLabel: "Design system: Figma and Storybook, before and after",
    moves: [
      "Matched 291 Storybook components against the Figma library",
      "Redrew the icon set on a single 24×24 grid",
      "Moved documentation to where engineers and agents read it",
    ],
    Detail: DesignSystemCase,
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

// ── One card in the index. Whole card opens the panel. ─────────────────────
function CaseCard({ c, onOpen }: { c: Case; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group @container block w-full text-left">
      {/*
        A flat frame: no radius, no stroke, no shadow. The artwork is the edge
        of the card, so there is nothing drawn around it to compete.

        Still covers are 4:3. A phone cover is portrait (4:5) so the whole
        handset fits, and next to its 4:3 neighbours that height difference is
        what breaks the grid: rows stop lining up along their feet.

        overflow-hidden stays on the frame (not the button) so the hover zoom
        is clipped to the picture and never spills over the caption below.
      */}
      <div
        className={`relative w-full overflow-hidden bg-ink/2 ${c.coverVideo ? "aspect-[4/5]" : "aspect-[4/3]"}`}
      >
        {c.coverVideo ? (
          <PhoneCover video={c.coverVideo} />
        ) : c.image ? (
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
      </div>

      {/*
        Title + tags sit under the frame in normal flow, rather than on glass
        over it. The whole picture shows, and the caption no longer depends on
        what happens to be behind it to stay readable.
      */}
      <div className="mt-2 flex flex-col gap-2">
        <h2 className="kat-body-md text-balance text-ink">{c.title}</h2>
        <div className="flex flex-wrap gap-1 @sm:gap-1.5">
          {c.tags.map((t) => (
            <span
              key={t}
              className="kat-mono-xs rounded-[4px] border border-border px-1.5 py-1 uppercase tracking-wider text-ink-mid"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ── A screen recording in a phone, on a blurred colour field. ──────────────
function PhoneCover({ video }: { video: NonNullable<Case["coverVideo"]> }) {
  return (
    <>
      {/*
        The colour field. Soft blobs, mostly from the sand family with only a
        breath of terracotta and blue, each blurred far past its own edges so they melt
        into one wash rather than reading as shapes. Kept close in value on
        purpose: it should read as warm light on paper, not as colour, so the
        phone stays the only thing on the card with contrast.

        Drawn in CSS rather than baked into the video: the colours and blur can
        be tuned here without re-recording, and the clip stays small.
      */}
      <div aria-hidden className="absolute inset-0 bg-sand-75">
        <div className="absolute -left-[15%] -top-[15%] h-[70%] w-[65%] rounded-full bg-[#d9a07e] opacity-20 blur-3xl" />
        <div className="absolute -right-[15%] top-[20%] h-[80%] w-[60%] rounded-full bg-sand-200 opacity-60 blur-3xl" />
        {/* A cool note against the warm: a dusty blue, kept faint so it reads
            as daylight in the corner rather than as a colour of its own. */}
        <div className="absolute -right-[10%] -top-[15%] h-[55%] w-[55%] rounded-full bg-[#b7c8da] opacity-45 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[20%] h-[60%] w-[60%] rounded-full bg-sand-50 opacity-90 blur-3xl" />
      </div>

      {/*
        The phone, whole and centred, drawn to iPhone 17 proportions.

        The recording is 1206 x 2622: an iPhone 17's 402 x 874pt screen at 3x.
        Everything else is measured against that screen and the published body
        (71.9mm wide), then written as a share of the phone's own width, so the
        shape holds at any size:

          bezel          3.7%   (71.9mm body less a 66.6mm screen, per side)
          screen corner  14.3%  (iOS's 62pt display radius over 402pt)
          body corner    18%    (screen corner plus the bezel, so the two
                                 curves run parallel, as they do on the phone)

        cqw here is the PHONE's width, not the card's: the phone is its own
        @container. The side buttons sit just outside the body: Action button
        and volume on the left, side button and Camera Control on the right.

        The hover zoom lives on the phone, matching the still covers.
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="@container relative w-[49%] transition-transform duration-500 group-hover:scale-[1.03]">
          <span aria-hidden className="absolute -left-[1.1cqw] top-[18%] h-[4%] w-[1.4cqw] rounded-l-full bg-grey-700" />
          <span aria-hidden className="absolute -left-[1.1cqw] top-[26%] h-[7%] w-[1.4cqw] rounded-l-full bg-grey-700" />
          <span aria-hidden className="absolute -left-[1.1cqw] top-[35%] h-[7%] w-[1.4cqw] rounded-l-full bg-grey-700" />
          <span aria-hidden className="absolute -right-[1.1cqw] top-[28%] h-[10%] w-[1.4cqw] rounded-r-full bg-grey-700" />
          <span aria-hidden className="absolute -right-[1.1cqw] top-[56%] h-[7%] w-[1.4cqw] rounded-r-full bg-grey-700" />

          <div className="relative rounded-[18cqw] bg-ink p-[3.7cqw]">
            <div className="overflow-hidden rounded-[14.3cqw]">
              <LoopVideo
                src={video.src}
                width={video.width}
                height={video.height}
                poster={video.poster}
                label=""
                decorative
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── The case detail rendered inside the panel. ──────────────────────────────
function CaseDetail({ c }: { c: Case }) {
  if (c.Detail) return <c.Detail c={c} />;

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
      <div className="mt-10 grid items-start gap-x-4 gap-y-8 sm:grid-cols-2">
        {shown.map((c) => (
          <CaseCard key={c.id} c={c} onOpen={() => setOpenId(c.id)} />
        ))}
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
