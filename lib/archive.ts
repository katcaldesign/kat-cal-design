/*
  Archive — shared types + constants (client-safe, NO filesystem access).

  Both the server loader (lib/archive-loader.ts) and the client grid
  (app/components/ArchiveGrid.tsx) import from here. Keeping the fs code separate
  means importing this into the browser bundle doesn't drag `node:fs` along.

  TWO tag systems:
  • CATEGORIES — broad buckets that drive the filter chips. A project can have
    several; a project with NONE only appears under "All".
  • SKILLS — granular things you did. Each skill belongs to an AREA, and the
    area owns the pill colour (see SKILL_AREA + AREA_COLOR below). Register a new
    skill once here and it inherits its area's colour everywhere.
*/

// ── Categories (filter chips) ───────────────────────────────────────────────
export const ARCHIVE_CATEGORIES = [
  "UX",
  "Design Research",
  "Service",
  "Physical",
  "Video",
] as const;
export type ArchiveCategory = (typeof ARCHIVE_CATEGORIES)[number];

// ── Skill areas → colour (the CSS var / Tailwind class per area) ────────────
export type SkillArea = "research" | "ux" | "ui" | "service" | "making" | "other";

// Tailwind bg-* classes generated from the --color-area-* tokens in globals.css.
export const AREA_COLOR: Record<SkillArea, string> = {
  research: "bg-area-research",
  ux: "bg-area-ux",
  ui: "bg-area-ui",
  service: "bg-area-service",
  making: "bg-area-making",
  other: "bg-area-other",
};

// Which area each skill belongs to. Add a skill here and it's colour-coded
// automatically. Anything not listed falls back to "other" (neutral).
export const SKILL_AREA: Record<string, SkillArea> = {
  // Research
  "User Research": "research",
  "Academic Research": "research",
  "Usability Testing": "research",
  "Product Metrics": "research",
  // UX
  "Behavioural Design": "ux",
  "Conceptual Modelling": "ux",
  "Wireframing": "ux",
  "Prototyping": "ux",
  "Storyboarding": "ux",
  "Feature Prioritisation": "ux",
  // UI
  "UI": "ui",
  "Visual Design": "ui",
  "Branding": "ui",
  "Illustration": "ui",
  // Service
  "Co-creation": "service",
  "Service Blueprinting": "service",
  "Service Design": "service",
  // Making / Tech
  "CAD": "making",
  "Fabrication": "making",
  "3D Modelling": "making",
  "Animation": "making",
  "Video Editing": "making",
  "Web Development": "making",
};

export function areaColorForSkill(skill: string): string {
  return AREA_COLOR[SKILL_AREA[skill] ?? "other"];
}

/*
  A labelled block of narrative in the panel (Overview, Approach…).

  The loader does all the deciding: it reads the matching front-matter field,
  honours its `show…` flag, drops anything empty, and hands over only the
  sections that should actually render. So the component below never asks
  "does this project have an approach?" — it just maps over what it's given.
*/
export type ArchiveSection = {
  label: string; // heading shown above the text, e.g. "Overview"
  paragraphs: string[];
};

/*
  A project's optional video, shown under the copy.

  Two kinds, because a portfolio video is either hosted somewhere that handles
  the streaming for you, or it's a file sitting in /public:
  • "youtube" — `src` is the bare video id, embedded through youtube-nocookie.
  • "file"    — `src` is a path in /public, played by the browser's own player.

  The loader works out which from what you write, so the markdown only ever has
  one `video:` line. See lib/archive-loader.ts.
*/
export type ArchiveVideo = {
  kind: "youtube" | "file";
  src: string;
};

/*
  A BLOCK is one strand of the project, shown as a card: a small heading, a
  short piece of writing, and the artwork that proves it.

  Sections (above) answer "what was this project and how did I approach it" in
  prose. Blocks answer "what did I actually make" one strand at a time, so
  Windsor Cycle Hub can show its branding, its website and its service design as
  three separate pieces of work rather than one long column of text.

  Media is either ONE still (`image`) or SEVERAL you page through (`images`,
  rendered by the same carousel the gallery uses). A block can have neither and
  still render, which is what lets you write the copy now and drop the artwork in
  later.

  `wide` spans the card across both columns and stands the copy beside the
  artwork instead of above it. The loader turns it on by itself for any block
  carrying a carousel, since a half-width card is too tight to page through.
*/
export type ArchiveBlock = {
  title: string;
  paragraphs: string[];
  image: string | null;
  images: string[];
  wide: boolean;
};

/*
  A titled note: a few words of heading, a sentence or two under it.

  Two optional lists on a project are built from these, and both are static
  (nothing to hover, nothing to page through):
  • `process` renders as a row of steps across a ruled line, for describing how
    you work rather than what you shipped.
  • `methods` renders as a grid of small cards.

  Each list carries its own heading, so a project can call them whatever fits.

  Notes and blocks are different shapes on purpose: a note is text only, a block
  carries artwork. A project can use either, both, or neither.
*/
export type ArchiveNote = {
  title: string;
  text: string;
};

export type ArchiveNoteList = {
  heading: string;
  notes: ArchiveNote[];
};

export type ArchiveProject = {
  slug: string;
  title: string; // short name, e.g. "design:ends"
  headline: string; // descriptive line, e.g. "Designing an actionable Circular Design Tool"
  categories: ArchiveCategory[]; // multi; empty = only under "All"
  skills: string[];
  showSkills: boolean; // hide the skill pills on weaker/lighter projects
  context: string; // one credibility line, e.g. "MSc project"
  year: string;
  cover: string | null; // e.g. "/archive/brompton.jpg" — null until the image exists
  poster: string | null; // optional tall hero image; when present it sits beside the copy
  video: ArchiveVideo | null; // optional clip under the copy (null when there isn't one)
  images: string[]; // optional gallery, shown as a paged carousel (paths that exist)
  illustrations: string[]; // optional artwork row, shown as the hover accordion
  blocks: ArchiveBlock[]; // optional cards, one per strand of the work (see ArchiveBlock)
  banner: string | null; // optional wide image that closes the panel, edge to edge
  link?: string;
  order: number;
  description: string[]; // narrative (the body text), split into paragraphs
  sections: ArchiveSection[]; // Overview / Approach — empty ones already removed
  process: ArchiveNoteList | null; // optional ruled row of steps (null when unused)
  methods: ArchiveNoteList | null; // optional card grid (null when unused)
};
