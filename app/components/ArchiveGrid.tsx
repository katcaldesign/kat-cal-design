"use client";

/*
  ArchiveGrid — the interactive archive: category filter + tile grid + detail.

  The page (a server component) loads projects from markdown at build time and
  hands them here as props. This component owns only UI state: the active filter
  and which project is open in the shared SidePanel (right drawer / bottom
  sheet — the same one WORK uses).
*/

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import imageUrl from "../../image-loader";
import SidePanel from "./SidePanel";
import { imageSize } from "../../lib/image-size";
import {
  ARCHIVE_CATEGORIES,
  areaColorForSkill,
  type ArchiveBlock,
  type ArchiveCategory,
  type ArchiveNoteList,
  type ArchiveProject,
  type ArchiveVideo,
} from "../../lib/archive";

const FILTERS = ["All", ...ARCHIVE_CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

// ── One tile. Cover image (or placeholder); the title washes in on hover. ───
//
// `priority` on the first few: they're on screen the moment the page opens, so
// there's nothing to gain by deferring them and a visible gap if we do. The
// rest lazy-load as you scroll, which is next/image's default.
function Tile({ p, onOpen, priority }: { p: ArchiveProject; onOpen: () => void; priority: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface text-left"
    >
      {p.cover ? (
        /*
          `fill` = stretch to the parent box, which the aspect-square button
          already shapes. That's what lets a portrait and a landscape cover
          both sit in a square tile without us knowing their proportions.

          `sizes` tells the browser how wide the tile will be BEFORE any CSS has
          been applied, so it can pick a file. The browser takes it literally,
          which is why these are calc() expressions rather than round numbers: a
          flat "288px" for everything under 640 would describe a 639px-wide
          phone and hand a 375px one a file four times the pixels it can show.

          Each line is the arithmetic the grid actually does — viewport, less
          the sidebar and page padding, less the gaps, divided by the column
          count. Top line is the max-w-6xl cap, where it stops growing.
        */
        <Image
          src={p.cover}
          alt={p.title}
          fill
          priority={priority}
          sizes={[
            "(min-width: 1392px) 256px", // capped: (1152 - 80 - 48) / 4
            "(min-width: 1024px) calc(25vw - 92px)", // 4 across, sidebar + padding
            "(min-width: 768px) calc(33.3vw - 118px)", // 3 across, sidebar appears
            "(min-width: 640px) calc(33.3vw - 27px)", // 3 across, no sidebar yet
            "calc(50vw - 32px)", // 2 across on a phone
          ].join(", ")}
          className="object-cover"
        />
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

/*
  ── How wide is the panel's content column? ────────────────────────────────

  Every `sizes` string below is derived from this, and it matters more than it
  looks. `sizes` is a promise to the browser about how wide an image will be
  displayed, and the browser trusts it completely when choosing which file to
  download. Overstate it and every image in the panel arrives a step or two
  larger than it needed to be.

  The catch is that the panel's width isn't a function of the viewport, so a
  plain media query can't describe it: SidePanel is 640px at md, 720px at lg,
  and 1000px at xl only when `wide` is set. Minus its 40px of padding each
  side, that leaves these content widths — which is why `wide` has to be
  threaded down here from ArchiveGrid rather than guessed at.
*/
type Column = { md: number; lg: number; xl: number };

function column(wide: boolean): Column {
  return { md: 560, lg: 640, xl: wide ? 920 : 640 };
}

/*
  A `sizes` string for something taking `fraction` of that column — half for a
  block card in the two-up grid, a bit over half for the poster beside its copy,
  all of it for the gallery.

  `mobileFraction` is separate because most of these multi-column layouts
  collapse to ONE column on a phone, so the thing that took half the column now
  takes all of it. Reusing the desktop fraction there would understate the
  width, and understating is the worse mistake: the browser believes it and
  fetches a file too small, which just looks blurry.
*/
function sizes(col: Column, fraction = 1, mobileFraction = fraction) {
  const px = (n: number) => `${Math.round(n * fraction)}px`;
  return [
    `(min-width: 1280px) ${px(col.xl)}`,
    `(min-width: 1024px) ${px(col.lg)}`,
    `(min-width: 768px) ${px(col.md)}`,
    `${Math.round(mobileFraction * 100)}vw`,
  ].join(", ");
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
function IllustrationStrip({ illustrations, col }: { illustrations: string[]; col: Column }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-2 md:flex md:h-40">
      {illustrations.map((src, i) => (
        <div
          key={src}
          style={{ animationDelay: `${i * 70}ms` }}
          // `relative` is what makes the fill image below work: it needs a
          // positioned parent to stretch to.
          className="illo-frame illo-enter relative aspect-[3/2] overflow-hidden rounded-lg border border-border md:aspect-auto md:h-full"
        >
          {/* Four frames across, but the accordion lets the hovered one grow to
              roughly half the row, so that's the width to promise. */}
          <Image src={src} alt="" fill sizes={sizes(col, 0.5)} className="object-cover" />
        </div>
      ))}
    </div>
  );
}

/*
  ── Frame — a full-width image that keeps its own shape. ───────────────────

  Used for everything in the panel that fills the column it's in: the gallery
  frames, a block's artwork, the poster, the closing banner.

  Why this exists rather than a plain <img>: an image with no stated dimensions
  has NO HEIGHT until its file arrives, so the frame sits 2px tall and then
  snaps open, shoving everything below it down the panel. next/image fixes that
  if you give it the real pixel dimensions — which we don't have here, because
  these paths come out of markdown as strings. So imageSize() reads them from
  the manifest the build script wrote.

  `width: 100%, height: auto` then lets it scale to the column while keeping the
  proportions those numbers describe. If a file somehow isn't in the manifest we
  fall back to a plain <img>, which loads fine and merely jumps as it used to.
*/
function Frame({
  src,
  alt,
  className = "",
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
}) {
  const size = imageSize(src);

  if (!size) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`w-full ${className}`} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size.width}
      height={size.height}
      sizes={sizes}
      className={`w-full ${className}`}
      style={{ height: "auto" }}
    />
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
      /*
        A <video> poster is a single URL — there's no srcset for it — so we can't
        let next/image choose. Calling the loader by hand gets the optimized copy
        at a sensible width instead of the full-size original, which is the one
        place on the site that would otherwise still serve a master file.
      */
      poster={poster ? imageUrl({ src: poster, width: 1280 }) : undefined}
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
function Carousel({
  images,
  frameSizes,
  inCard = false,
}: {
  images: string[];
  frameSizes: string;
  inCard?: boolean;
}) {
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
          <Frame key={src} src={src} alt="" className={`shrink-0 ${frame}`} sizes={frameSizes} />
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
// and why the carousel is passed `inCard` (the card already draws the border and
// the rounding, so the strip shouldn't draw its own).
function BlockCard({ block, col }: { block: ArchiveBlock; col: Column }) {
  const media =
    block.images.length > 0 ? (
      // Half the column for the card, and the frame peeks at 78% of that —
      // but one card per row on a phone, so 78% of the whole width there.
      <Carousel images={block.images} frameSizes={sizes(col, 0.5 * 0.78, 0.78)} inCard />
    ) : block.image ? (
      <Frame
        src={block.image}
        alt={block.title ? `${block.title} artwork` : ""}
        sizes={sizes(col, 0.5, 1)}
      />
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

  const card = "overflow-hidden rounded-card border border-border bg-surface";

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
function ArchiveDetail({ p, wide }: { p: ArchiveProject; wide: boolean }) {
  const meta = [p.context, p.year].filter(Boolean).join(" · ");
  const col = column(wide);

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
          <IllustrationStrip illustrations={p.illustrations} col={col} />
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
            <Frame
              src={p.poster}
              alt={`${p.title} poster`}
              className="rounded-lg border border-border"
              // 1.15fr of a [1.15fr_1fr] pair below xl; stacked full-width above.
              sizes={sizes(col, 1.15 / 2.15, 1)}
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

      {/* Video first among the content below the writing: the copy says what
          the project was, then you watch it, then you go through the detail. */}
      {p.video && (
        <div className="mt-14">
          <Video video={p.video} poster={p.cover} title={p.title} />
        </div>
      )}

      {/* Process and methods break down how the work was done. Either can be
          absent, and no project uses them alongside blocks today. */}
      {p.process && (
        <div className="mt-14">
          <ProcessSteps list={p.process} />
        </div>
      )}

      {p.methods && (
        <div className="mt-14">
          <MethodCards list={p.methods} />
        </div>
      )}

      {/* The strands of the work, after the writing that frames them.
          items-start so a short card doesn't stretch to match a tall neighbour. */}
      {p.blocks.length > 0 && (
        <div className="mt-14 grid gap-5 md:grid-cols-2 md:items-start">
          {p.blocks.map((b, i) => (
            <BlockCard key={i} block={b} col={col} />
          ))}
        </div>
      )}

      {/* Gallery last, after all the copy, so the writing isn't split in two. */}
      {p.images.length > 0 && (
        <div className="mt-14">
          <Carousel images={p.images} frameSizes={sizes(col)} />
        </div>
      )}

      {/* A wide graphic to close on, if the project has one. */}
      {p.banner && (
        <Frame
          src={p.banner}
          alt={`${p.title} banner`}
          className="mt-14 rounded-lg border border-border"
          sizes={sizes(col)}
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

  /*
    Does this opening get the roomier drawer? Computed once here because it's
    needed in two places: SidePanel uses it to set its width, and ArchiveDetail
    needs it to work out how wide its images will actually be displayed (see
    `column` above). Deriving it twice would let the two drift apart, and the
    images would quietly start fetching the wrong sizes.
  */
  const wide = !!active?.poster || !!active?.process || (active?.blocks.length ?? 0) > 0;

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
        {visible.map((p, i) => (
          <Tile key={p.slug} p={p} onOpen={() => setOpenSlug(p.slug)} priority={i < 4} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="kat-body-md mt-8 text-ink-mid">Nothing in this category yet.</p>
      )}

      {/* The roomier drawer is for the three layouts that have something to
          fill it with: a poster beside the copy, a row of process steps that
          wants four columns, or blocks laid out two-up. Widening it for a plain
          project would just stretch a single column of text past a readable
          line length. */}
      <SidePanel
        open={!!active}
        onClose={() => setOpenSlug(null)}
        label={active?.title}
        wide={wide}
      >
        {active && <ArchiveDetail p={active} wide={wide} />}
      </SidePanel>
    </>
  );
}
