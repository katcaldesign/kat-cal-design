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
  images: string[]; // optional gallery, shown as a paged carousel (paths that exist)
  illustrations: string[]; // optional artwork row, shown as the hover accordion
  link?: string;
  order: number;
  description: string[]; // narrative (the body text), split into paragraphs
  sections: ArchiveSection[]; // Overview / Approach — empty ones already removed
};
