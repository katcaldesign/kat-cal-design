"use client";

/*
  ArchiveGrid — the interactive archive: category filter + tile grid + detail.

  The page (a server component) loads projects from markdown at build time and
  hands them here as props. This component owns only UI state: the active filter
  and which project is open in the shared SidePanel (right drawer / bottom
  sheet — the same one WORK uses).
*/

import { useMemo, useState } from "react";
import SidePanel from "./SidePanel";
import { ARCHIVE_CATEGORIES, areaColorForSkill, type ArchiveCategory, type ArchiveProject } from "../../lib/archive";

const FILTERS = ["All", ...ARCHIVE_CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

// ── One tile. Cover image (or placeholder); the title washes in on hover. ───
function Tile({ p, onOpen }: { p: ArchiveProject; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square w-full overflow-hidden rounded-card border border-border bg-surface text-left"
    >
      {p.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover} alt={p.title} className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center px-3 text-center kat-mono-xs uppercase tracking-wider text-ink-light">
          {p.title}
        </span>
      )}

      {/* Hover caption: a gradient washing over the whole tile — dark at the
          bottom, fading up — with the title at the bottom. Title only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="block kat-mono-sm uppercase tracking-wider text-white">{p.title}</span>
      </div>
    </button>
  );
}

// ── Coloured skill pills — colour comes from each skill's area. ─────────────
function SkillPills({ skills }: { skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <span
          key={s}
          className={`kat-body-sm rounded-full px-3 py-1 font-medium text-white ${areaColorForSkill(s)}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ── Project detail inside the panel. ────────────────────────────────────────
function ArchiveDetail({ p }: { p: ArchiveProject }) {
  const meta = [p.context, p.year].filter(Boolean).join(" · ");
  return (
    <article>
      {p.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover} alt={p.title} className="mb-8 w-full rounded-card border border-border" />
      )}
      {/* Title = main heading; one-liner (headline) = subtitle beneath it. */}
      <h2 className="text-3xl font-medium leading-tight text-balance text-ink">{p.title}</h2>
      {p.headline && <p className="kat-body-lg mt-2 text-ink-mid">{p.headline}</p>}
      {meta && (
        <span className="kat-mono-sm mt-4 block uppercase tracking-wider text-ink-light">{meta}</span>
      )}

      {p.showSkills && p.skills.length > 0 && (
        <div className="mt-6">
          <SkillPills skills={p.skills} />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {p.description.map((para, i) => (
          <p key={i} className="kat-body-lg text-ink-dark">
            {para}
          </p>
        ))}
      </div>

      {p.images.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {p.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="w-full rounded-card border border-border" />
          ))}
        </div>
      )}

      {p.link && (
        <a
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          className="kat-mono-sm mt-8 inline-flex uppercase tracking-wider text-link hover:text-link-hover"
        >
          View project ↗
        </a>
      )}
    </article>
  );
}

export default function ArchiveGrid({ projects }: { projects: ArchiveProject[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "All"
        ? projects
        : projects.filter((p) => p.categories.includes(filter as ArchiveCategory)),
    [projects, filter],
  );
  const active = projects.find((p) => p.slug === openSlug) ?? null;

  return (
    <>
      {/* Filter chips */}
      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const activeChip = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={activeChip}
              className={`kat-mono-xs rounded-full border px-3 py-1.5 uppercase tracking-wider transition-colors ${
                activeChip
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-border text-ink-mid hover:border-border-dark hover:text-ink"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Tile grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => (
          <Tile key={p.slug} p={p} onOpen={() => setOpenSlug(p.slug)} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="kat-body-md mt-8 text-ink-mid">Nothing in this category yet.</p>
      )}

      <SidePanel open={!!active} onClose={() => setOpenSlug(null)} label={active?.title}>
        {active && <ArchiveDetail p={active} />}
      </SidePanel>
    </>
  );
}
