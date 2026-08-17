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
import {
  ARCHIVE_CATEGORIES,
  areaColorForSkill,
  type ArchiveCategory,
  type ArchiveNoteList,
  type ArchiveProject,
  type ArchiveVideo,
} from "../../lib/archive";

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

// ── Video — a single clip below the copy, for the film/animation projects. ──
// Deliberately plain: native controls, nothing autoplaying, square corners.
//
// A self-hosted file uses the browser's own player. `preload="metadata"` means
// it fetches only the header (a few KB) until someone presses play, so a heavy
// clip costs nothing to open, and the poster is the project's own cover, so the
// frame you clicked in the grid is the frame that greets you here.
//
// A YouTube clip is an iframe instead, through youtube-nocookie so no tracking
// cookie is set until play, and `loading="lazy"` so nothing is fetched from
// YouTube until the panel is actually open. YouTube supplies its own thumbnail,
// which is why the cover isn't used there.
//
// Both sit in the same 16:9 box, so panel height doesn't jump while loading.
function Video({ video, poster, title }: { video: ArchiveVideo; poster: string | null; title: string }) {
  if (video.kind === "youtube") {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.src}?rel=0`}
        title={`${title} video`}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="aspect-video w-full border border-border bg-ink"
      />
    );
  }

  return (
    <video
      src={video.src}
      poster={poster ?? undefined}
      controls
      playsInline
      preload="metadata"
      aria-label={title}
      className="aspect-video w-full border border-border bg-ink object-cover"
    />
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

/*
  ── Process — a ruled row of numbered steps. ───────────────────────────────

  For the projects that are really about HOW someone works rather than what
  they shipped. Each step hangs off a top rule, so the four of them read as one
  line running left to right, the way the old Framer page did it.

  Static by design: nothing here hides behind a hover or a click, because the
  steps are the content, not a preview of it. Two across on a phone, four across
  once the drawer is wide enough to give each one a readable column.
*/
function ProcessSteps({ list }: { list: ArchiveNoteList }) {
  return (
    <section>
      <h3 className="kat-mono-sm uppercase tracking-wider text-ink-light">{list.heading}</h3>

      <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
        {list.notes.map((n, i) => (
          <li key={n.title} className="border-t border-border pt-4">
            {/* Zero-padded so the numbers keep a steady width down the column. */}
            <span className="kat-mono-xs block uppercase tracking-wider text-ink-light">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h4 className="kat-body-md mt-3 font-medium text-ink">{n.title}</h4>
            <p className="kat-body-md mt-2 text-ink-dark">{n.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Methods — a static grid of small cards, one per method. ─────────────────
// Same shape as the process row above, laid out as cards because these are a
// list of things rather than a sequence.
function MethodCards({ list }: { list: ArchiveNoteList }) {
  return (
    <section>
      <h3 className="kat-mono-sm uppercase tracking-wider text-ink-light">{list.heading}</h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {list.notes.map((n) => (
          <div key={n.title} className="rounded-card border border-border bg-surface p-5">
            <h4 className="kat-body-md font-medium text-ink">{n.title}</h4>
            <p className="kat-body-md mt-2 text-ink-dark">{n.text}</p>
          </div>
        ))}
      </div>
    </section>
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

      {/* Process and methods sit under the writing: the copy says what the work
          was, these two break down how it was done. Either can be absent. */}
      {p.process && (
        <div className="mt-10">
          <ProcessSteps list={p.process} />
        </div>
      )}

      {p.methods && (
        <div className="mt-10">
          <MethodCards list={p.methods} />
        </div>
      )}

      {/* Video sits under the copy, so you read what the piece is before
          watching it. */}
      {p.video && (
        <div className="mt-8">
          <Video video={p.video} poster={p.cover} title={p.title} />
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

      {/* The roomier drawer is for the two layouts that have something to fill
          it with: a poster beside the copy, or a row of process steps that
          wants four columns. Widening it for a plain project would just stretch
          a single column of text past a readable line length. */}
      <SidePanel
        open={!!active}
        onClose={() => setOpenSlug(null)}
        label={active?.title}
        wide={!!active?.poster || !!active?.process}
      >
        {active && <ArchiveDetail p={active} />}
      </SidePanel>
    </>
  );
}
