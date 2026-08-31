/*
  imageSize — the real pixel dimensions of a file in `public/`.

  next/image needs an image's width and height BEFORE the file arrives, so it
  can reserve the right amount of space and stop the page jumping as things load
  in. Normally you get that by importing the file directly, which lets the
  bundler read it at build time — but our image paths come out of markdown front
  matter as plain strings, so there's nothing to import.

  So `scripts/optimize-images.mjs` measures every image at build time and writes
  the results to image-manifest.json, and this reads them back.

  Returns null for anything not in the manifest (an SVG, a typo, a file added
  without rerunning the script), which callers treat as "lay this out the old
  way" rather than crashing.
*/

import manifest from "./image-manifest.json";

type Dimensions = { width: number; height: number };

export function imageSize(src: string | null | undefined): Dimensions | null {
  if (!src) return null;
  const entry = (manifest as Record<string, Dimensions>)[src];
  return entry ?? null;
}
