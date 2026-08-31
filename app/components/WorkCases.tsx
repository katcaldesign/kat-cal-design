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
};

const CASES: Case[] = [
  {
    id: "member-portal",
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
    title: "Ffern sign-in — Ledger account",
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
  },
  {
    id: "assembly",
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
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-bg text-left transition hover:border-border-dark hover:shadow-sm"
    >
      {/* Image area — Katie's project art drops in here. Placeholder for now. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {c.image ? (
          <Image
            src={c.image}
            alt=""
            fill
            sizes="(min-width: 640px) 380px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center kat-mono-xs uppercase tracking-wider text-ink-light">
            image
          </span>
        )}
      </div>

      {/* Title + tags. */}
      <div className="flex grow flex-col gap-4 p-5">
        <h2 className="kat-body-lg font-medium text-balance text-ink">{c.title}</h2>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {c.tags.map((t) => (
            <span
              key={t}
              className="kat-mono-xs rounded-full border border-border px-2 py-1 uppercase tracking-wider text-ink-mid"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ── The case detail rendered inside the panel. ──────────────────────────────
function CaseDetail({ c }: { c: Case }) {
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
  const active = CASES.find((c) => c.id === openId) ?? null;

  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CASES.map((c) => (
          <CaseCard key={c.id} c={c} onOpen={() => setOpenId(c.id)} />
        ))}
      </div>

      <SidePanel open={!!active} onClose={() => setOpenId(null)} label={active?.title}>
        {active && <CaseDetail c={active} />}
      </SidePanel>
    </>
  );
}
