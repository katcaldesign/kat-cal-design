"use client";

/*
  ArchiveGrid — the interactive archive: category filter + tile grid + detail.

  The page (a server component) loads projects from markdown at build time and
  hands them here as props. This component owns only UI state: the active filter
  and which project is open in the shared SidePanel (right drawer / bottom
  sheet — the same one WORK uses).
*/

import { useMemo, useRef, useState } from "react";
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
      className="group relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface text-left"
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

// ── Illustration strip: decorative row of project artwork. ──────────────────
// Reads `illustrations`, NOT `images`. The two are different things: `images`
// is a gallery you page through (Carousel below), this is a fixed row of
// artwork that sets the tone above the copy.
//
// Flex accordion: hovering a frame grows it and compresses the others (the
// .illo-* rules live in globals.css, next to the cat logo they borrow their
// spring curve from). Below md it's a 2×2 grid, because there's no hover on
// touch and four across a phone gives ~85px frames.
//
// aria-hidden because this is decoration: the artwork carries no information the
// body copy doesn't already state, and the field is a bare string[] with nowhere
// to put alt text. Better to hide it than to announce four unlabelled images.
function IllustrationStrip({ illustrations }: { illustrations: string[] }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-2 md:flex md:h-40">
      {illustrations.map((src, i) => (
        <div
          key={src}
          style={{ animationDelay: `${i * 70}ms` }}
          className="illo-frame illo-enter aspect-[3/2] overflow-hidden rounded-lg border border-border md:aspect-auto md:h-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// ── Carousel — horizontal scroll-snap strip of landscape images. ────────────
// CSS scroll-snap does the work (smooth, swipeable on mobile); the arrows just
// scroll by one panel-width. Feed it the `images` array from a project.
//
// The smoothness comes from `behavior: "smooth"` in page() below, so there's no
// `scroll-smooth` class here. Setting scroll-behavior in CSS as well, on a
// snap-mandatory container, can leave Chromium cancelling the programmatic
// scroll and re-snapping to where it started.
function Carousel({ images }: { images: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  function page(dir: 1 | -1) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-lg [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className="w-full shrink-0 snap-center rounded-lg border border-border"
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => page(-1)}
            className="kat-body-md absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg/80 text-ink backdrop-blur-sm transition-colors hover:bg-surface"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => page(1)}
            className="kat-body-md absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg/80 text-ink backdrop-blur-sm transition-colors hover:bg-surface"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

// ── Project detail inside the panel. ────────────────────────────────────────
function ArchiveDetail({ p }: { p: ArchiveProject }) {
  const meta = [p.context, p.year].filter(Boolean).join(" · ");
  return (
    <article>
      {/* Cover image is the tile's job — the panel opens on the title. */}
      {/* Title = main heading; one-liner (headline) = subtitle beneath it. */}
      <h2 className="kat-body-2xl font-medium text-balance text-ink">{p.title}</h2>
      {p.headline && <p className="kat-body-md mt-2 text-ink-mid">{p.headline}</p>}
      {meta && (
        <span className="kat-mono-sm mt-4 block uppercase tracking-wider text-ink-light">{meta}</span>
      )}

      {p.showSkills && p.skills.length > 0 && (
        <div className="mt-6">
          <SkillPills skills={p.skills} />
        </div>
      )}

      {/* Artwork sits above the copy, as it did on the old Framer page. */}
      {p.illustrations.length > 0 && (
        <div className="mt-8">
          <IllustrationStrip illustrations={p.illustrations} />
        </div>
      )}

      {/* Poster + writing.

          Some projects (the splitboard boot, for one) lead with a tall poster
          that carries the whole idea. Where one exists, it pairs with the copy
          side by side rather than pushing it down the panel — but only at xl,
          where the drawer widens to 1000px and both halves still get room to
          breathe. Below that, and for every project WITHOUT a poster, this is
          the same single stacked column as before. */}
      {(p.poster || p.description.length > 0 || p.sections.length > 0) && (
        <div
          className={`mt-8 ${
            p.poster ? "grid gap-8 xl:grid-cols-[1.15fr_1fr] xl:items-start xl:gap-10" : ""
          }`}
        >
          {p.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.poster}
              alt={`${p.title} poster`}
              className="w-full rounded-lg border border-border"
            />
          )}

          {/* The copy column: body text first, then the labelled sections. */}
          <div className="flex flex-col gap-8">
            {/* The unlabelled body text, straight from below the front matter. */}
            {p.description.length > 0 && (
              <div className="flex flex-col gap-4">
                {p.description.map((para, i) => (
                  <p key={i} className="kat-body-md text-ink-dark">
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* Labelled sections (Overview, Approach). The loader has already
                dropped any that are empty or switched off, so whatever arrives
                here is meant to be on screen. */}
            {p.sections.map((s) => (
              <section key={s.label}>
                <h3 className="kat-mono-sm uppercase tracking-wider text-ink-light">{s.label}</h3>
                <div className="mt-3 flex flex-col gap-4">
                  {s.paragraphs.map((para, i) => (
                    <p key={i} className="kat-body-md text-ink-dark">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Gallery last, after all the copy, so the writing isn't split in two. */}
      {p.images.length > 0 && (
        <div className="mt-8">
          <Carousel images={p.images} />
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
      {/* Filter chips — top aligned with the sidebar wordmark. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const activeChip = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={activeChip}
              className={`kat-mono-sm rounded-[4px] border px-3 py-1.5 uppercase tracking-wider transition-colors ${
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

      {/* Only poster-led projects get the roomier drawer, because that's the
          only layout with two columns to fill. Widening it for a project
          without one would just stretch a single column of text past a
          readable line length. */}
      <SidePanel
        open={!!active}
        onClose={() => setOpenSlug(null)}
        label={active?.title}
        wide={!!active?.poster}
      >
        {active && <ArchiveDetail p={active} />}
      </SidePanel>
    </>
  );
}
