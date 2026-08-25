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
  type ArchiveBlock,
  type ArchiveCategory,
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

// ── Carousel — horizontal scroll-snap strip of images. ──────────────────────
// CSS scroll-snap does the work (smooth, swipeable on mobile); the arrows just
// scroll by one panel-width. Feed it the `images` array from a project, or from
// one of its blocks. Frame shape is whatever the files are: landscape for a
// gallery, square for the Instagram sets.
//
// The smoothness comes from `behavior: "smooth"` in page() below, so there's no
// `scroll-smooth` class here. Setting scroll-behavior in CSS as well, on a
// snap-mandatory container, can leave Chromium cancelling the programmatic
// scroll and re-snapping to where it started.
//
// `inCard` is the treatment for a strip living inside a block card (see
// BlockCard). Two differences from the standalone gallery:
//
// • No rounding or border of its own, because the card already draws those. Left
//   in, you'd get corners rounded twice over and a doubled-up border.
// • Frames are narrower than the strip and snap to its START, so the next one
//   sits half in view at the edge. That both signals there's more to page
//   through and brings the square Instagram artwork down to a sensible size,
//   rather than one frame filling the column edge to edge.
//
// No position dots on purpose. The artwork that goes through here is often an
// Instagram carousel that already draws its own, and a second set sitting on top
// of them reads as a bug.
function Carousel({ images, inCard = false }: { images: string[]; inCard?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);

  // Step by one FRAME, not one strip-width: with the peek above they're no
  // longer the same thing. The distance between two frames' left edges already
  // includes the gap, so it's the honest step whatever the widths are.
  function page(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const [a, b] = [el.children[0], el.children[1]] as HTMLElement[];
    const step = a && b ? b.offsetLeft - a.offsetLeft : el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  const frame = inCard
    ? "w-[78%] snap-start"
    : "w-full snap-center rounded-lg border border-border";

  return (
    <div className="relative">
      <div
        ref={scroller}
        className={`flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          inCard ? "gap-2" : "gap-3 rounded-lg"
        }`}
      >
        {images.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            className={`shrink-0 ${frame}`}
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

// ── Blocks: one card per strand of the work. ────────────────────────────────
// Sections (Overview, Approach) explain the project in prose. Blocks show what
// was actually made, a piece at a time: the branding, the website, the service.
//
// Two shapes, one card. A normal block stacks its artwork above the writing and
// takes half the row; a `wide` block spans the row and stands the writing beside
// the artwork instead. Everything inside is optional, so a block whose image
// hasn't been shot yet still reads as a finished card of writing.
//
// The artwork bleeds to the card's edges rather than sitting inset, which is why
// the card carries `overflow-hidden` (it clips the image to the rounded corners)
// and why the carousel is passed `flush` (the card already draws the border and
// the rounding, so the strip shouldn't draw its own).
function BlockCard({ block }: { block: ArchiveBlock }) {
  const media =
    block.images.length > 0 ? (
      <Carousel images={block.images} inCard />
    ) : block.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={block.image} alt={block.title ? `${block.title} artwork` : ""} className="w-full" />
    ) : null;

  const copy = (
    <div className="flex flex-col gap-4 p-6 md:p-8">
      {/* Mono for the card headings, which means caps (the style enforces it).
          It separates them from the sans body copy below and keeps them in the
          same voice as the mono labels elsewhere in the panel. */}
      {block.title && (
        <h4 className="kat-mono-md tracking-wider text-ink">{block.title}</h4>
      )}
      {block.paragraphs.map((para, i) => (
        <p key={i} className="kat-body-md text-ink-dark">
          {para}
        </p>
      ))}
    </div>
  );

  const card = "overflow-hidden rounded-lg border border-border bg-surface";

  // Writing FIRST in the markup either way, so the wide card reads copy-then-
  // artwork when the columns collapse on a phone, and so a screen reader always
  // meets the words before the picture.
  if (block.wide) {
    return (
      <div className={`${card} md:col-span-2 md:grid md:grid-cols-2 md:items-center`}>
        {copy}
        {media}
      </div>
    );
  }

  return (
    <div className={card}>
      {media}
      {copy}
    </div>
  );
}

// ── Project detail inside the panel. ────────────────────────────────────────
function ArchiveDetail({ p }: { p: ArchiveProject }) {
  const meta = [p.context, p.year].filter(Boolean).join(" · ");

  /*
    Stand Overview and Approach side by side instead of stacked.

    Only worth doing when the panel is already in its roomier form AND the poster
    isn't using the second column. A project carrying blocks gets the wide drawer
    (see the SidePanel call at the bottom of this file), and at that width two
    short sections stacked leave a lot of empty space to scroll past before the
    cards begin. Below xl the drawer is narrower, so this drops back to one
    column on its own.
  */
  const pairSections = !p.poster && p.blocks.length > 0 && p.sections.length > 1;
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
        <div className="mt-14">
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
          className={`mt-14 ${
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
          <div className="flex flex-col gap-10">
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
            {p.sections.length > 0 && (
              <div
                className={
                  pairSections
                    ? "grid gap-10 xl:grid-cols-2 xl:items-start xl:gap-12"
                    : "flex flex-col gap-10"
                }
              >
                {p.sections.map((s) => (
                  <section key={s.label}>
                    <h3 className="kat-mono-sm uppercase tracking-wider text-ink-light">
                      {s.label}
                    </h3>
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
            )}
          </div>
        </div>
      )}

      {/* Video sits between the writing and the cards: you read what the project
          was, watch it, then go through the strands of work in detail. */}
      {p.video && (
        <div className="mt-14">
          <Video video={p.video} poster={p.cover} title={p.title} />
        </div>
      )}

      {/* The strands of the work, after the writing that frames them.
          items-start so a short card doesn't stretch to match a tall neighbour. */}
      {p.blocks.length > 0 && (
        <div className="mt-14 grid gap-5 md:grid-cols-2 md:items-start">
          {p.blocks.map((b, i) => (
            <BlockCard key={i} block={b} />
          ))}
        </div>
      )}

      {/* Gallery last, after all the copy, so the writing isn't split in two. */}
      {p.images.length > 0 && (
        <div className="mt-14">
          <Carousel images={p.images} />
        </div>
      )}

      {/* A wide graphic to close on, if the project has one. */}
      {p.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.banner}
          alt={`${p.title} banner`}
          className="mt-14 w-full rounded-lg border border-border"
        />
      )}

      {p.link && (
        <a
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          className="kat-mono-sm mt-14 inline-flex uppercase tracking-wider text-link hover:text-link-hover"
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

      {/* Only projects with two columns to fill get the roomier drawer: a poster
          standing beside the copy, or a set of blocks laid out two-up. Widening
          it for anything else would just stretch a single column of text past a
          readable line length. */}
      <SidePanel
        open={!!active}
        onClose={() => setOpenSlug(null)}
        label={active?.title}
        wide={!!active?.poster || (active?.blocks.length ?? 0) > 0}
      >
        {active && <ArchiveDetail p={active} />}
      </SidePanel>
    </>
  );
}
