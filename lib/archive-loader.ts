/*
  Archive content loader — "CMS without a CMS" (server / build-time only).

  Reads /content/archive/*.md at BUILD time (next build, output: "export") and
  returns a typed array. Imported ONLY by the server page — never a client
  component — because it uses node:fs.

  To add a project: copy content/archive/_template.md, fill it in, drop images
  in /public/archive/, commit.
*/

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  ARCHIVE_CATEGORIES,
  type ArchiveCategory,
  type ArchiveProject,
  type ArchiveSection,
  type ArchiveVideo,
} from "./archive";

const CONTENT_DIR = path.join(process.cwd(), "content", "archive");
const PUBLIC_DIR = path.join(process.cwd(), "public");

// True only if the path points at a file (image, video, poster) that actually
// exists in /public. Lets the markdown name an asset before you've added it
// without the build breaking or a dead frame showing up on the page.
function assetExists(p: unknown): p is string {
  return typeof p === "string" && !!p.trim() && fs.existsSync(path.join(PUBLIC_DIR, p.trim().replace(/^\//, "")));
}

// Accept a YAML value that may be a single string or a list; return a clean array.
function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// Split a block of writing into paragraphs on blank lines, collapsing the
// single line breaks you get from wrapping text in the editor.
function toParagraphs(v: unknown): string[] {
  if (typeof v !== "string") return [];
  return v
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/*
  Work out what `video:` in the front matter is pointing at.

  You write ONE line and the loader decides:
  • starts with "/"  → a file in /public (only used if it's really there)
  • anything else     → YouTube, whether you paste a full watch/share/embed URL
                        or just the bare 11-character id

  Returns null when there's no video, which is every project but one right now.
*/
function toVideo(data: Record<string, unknown>): ArchiveVideo | null {
  const raw = typeof data.video === "string" ? data.video.trim() : "";
  if (!raw) return null;

  const caption = typeof data.videoCaption === "string" && data.videoCaption.trim()
    ? data.videoCaption.trim()
    : undefined;

  if (raw.startsWith("/")) {
    if (!assetExists(raw)) return null; // file not added yet: show nothing
    return {
      kind: "file",
      src: raw,
      poster: assetExists(data.videoPoster) ? String(data.videoPoster).trim() : undefined,
      caption,
    };
  }

  // Pull the id out of whatever YouTube URL shape got pasted in, or accept an
  // id on its own. YouTube ids are 11 characters of [A-Za-z0-9_-].
  const id = raw.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1]
    ?? raw.match(/^[A-Za-z0-9_-]{11}$/)?.[0];
  return id ? { kind: "youtube", src: id, caption } : null;
}

/*
  The labelled sections a project can have, in the order they appear in the
  panel. Each one is optional twice over: leave the field out (or blank) and it
  vanishes, or keep the text but set its `show…` flag to false to hide it
  without deleting anything.

  To add a third section later, add a line here and nothing else changes.
*/
const SECTIONS = [
  { field: "overview", flag: "showOverview", label: "Overview" },
  { field: "approach", flag: "showApproach", label: "Approach" },
] as const;

function toSections(data: Record<string, unknown>): ArchiveSection[] {
  return SECTIONS.flatMap(({ field, flag, label }) => {
    // Default is to show, so a project only needs the flag when hiding.
    if (data[flag] === false) return [];
    const paragraphs = toParagraphs(data[field]);
    return paragraphs.length ? [{ label, paragraphs }] : [];
  });
}

export function getArchiveProjects(): ArchiveProject[] {
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  const projects = files.map((file): ArchiveProject => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const slug = file.replace(/\.md$/, "");

    const categories = toList(data.categories).filter((c): c is ArchiveCategory =>
      (ARCHIVE_CATEGORIES as readonly string[]).includes(c),
    );

    return {
      slug,
      title: String(data.title ?? slug),
      headline: String(data.headline ?? ""),
      categories,
      skills: toList(data.skills),
      // Default: show skills. Set `showSkills: false` to hide them on a project.
      showSkills: data.showSkills !== false,
      context: String(data.context ?? ""),
      year: data.year != null ? String(data.year) : "",
      cover: assetExists(data.cover) ? String(data.cover).trim() : null,
      images: toList(data.images).filter(assetExists),
      illustrations: toList(data.illustrations).filter(assetExists),
      video: toVideo(data),
      link: data.link ? String(data.link) : undefined,
      order: typeof data.order === "number" ? data.order : 999,
      description: toParagraphs(content),
      sections: toSections(data),
    };
  });

  return projects.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
