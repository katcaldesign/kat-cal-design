/*
  optimize-images — turns the originals in `public/` into web-sized WebP copies.

  WHY THIS EXISTS
  ---------------
  next/image normally resizes images on the fly, but that needs a running
  server, and GitHub Pages only serves files. So we do the resizing HERE, on the
  build machine, before anything is published. Pages then only ever sees
  finished .webp files — same as it sees the HTML.

  Runs automatically via the `predev` and `prebuild` hooks in package.json.

  WHAT IT READS AND WRITES
  ------------------------
    assets/archive/design-ends.jpg             the master, full size, committed
      -> public/_img/archive/design-ends-900.webp   (and -96, -320, -512, ... )
      -> lib/image-manifest.json                    (the master's real dimensions)

  WHY THE MASTERS LIVE OUTSIDE `public/`. Next copies everything in `public/`
  into the build output verbatim. Leave the masters there and every deploy ships
  both the 1920px original AND the resized copies — 22MB of files no page ever
  requests, since every <Image> goes through the loader to `/_img/` instead.

  Keeping them in `assets/` means Next never sees them, so they can't be
  published by accident. It also keeps dev and production honest: a path that
  doesn't resolve is broken in BOTH, rather than working locally off the
  originals and 404ing once it's live.

  `public/_img/` is gitignored — derived data, regenerated on every build, and
  committing six copies of every photo would bloat the repo for nothing. The
  manifest IS committed: it's a few kB, and components need the master's
  dimensions to reserve the right space on the page before a file arrives.

  Masters are only ever READ. Nothing here writes to `assets/`.

  Non-raster files (the SVGs, the mp4) stay in `public/` and are served
  directly: SVGs are resolution-independent, and video isn't ours to resize.
*/

import sharp from "sharp";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
// Masters in, optimized copies out. Two different trees on purpose (see above).
const SRC_DIR = path.join(ROOT, "assets");
const OUT_DIR = path.join(ROOT, "public", "_img");
const MANIFEST = path.join(ROOT, "lib", "image-manifest.json");

/*
  The widths we generate. These MUST match `imageSizes` + `deviceSizes` in
  next.config.ts, because those are the only widths next/image will ever ask
  for — and image-loader.ts turns each request into one of these filenames. Ask
  for a width we didn't generate and you get a 404.

  These aren't round numbers for the sake of it. The browser picks the smallest
  file that's at least as wide as it needs, so a step sitting just BELOW a real
  requirement is wasted — everything rounds up past it to the next one. So each
  step here is a size the site genuinely asks for, doubled for retina screens:

    96     logo squares                    (40px  x2 = 80)
    320    a tile on a 375px phone         (156px x2 = 312)
    512    a tile on desktop               (256px x2)
    900    a full-width frame on a phone   (375px x2 = 750), and the work cards
    1280   a gallery frame in the default 720px drawer (640px x2)
    1600   a gallery frame in the wide 1000px drawer

  Change a layout width and check this ladder still has a step just above it.

  WHY NOT MORE STEPS. A finer ladder sounds strictly better and isn't: every
  extra width is another copy of all 51 images in the build output. We ran the
  numbers on the two obvious candidates and dropped both.

    640   The step for block card artwork (320px x2). Dropping it costs nothing:
          the smallest deviceSize doubles as a FLOOR for the srcset of any image
          whose `sizes` is viewport-relative (see next.config.ts), and at 640
          that floor was already below every width those images actually pick.
    1024  The poster beside its copy in the wide drawer needs 984px. Without
          this step it rounds up to 1280 — about 30kB more, on one image, at one
          breakpoint. The only regression in the whole trim.

  Trimming those two took the build output from 12.4MB to 8.7MB with no change
  to what any other image fetches at any screen size.

  Careful before cutting further: the tempting next step is 900, and it's the
  one holding the mobile case up. Take it out and phones jump from 900 to 1280
  for every full-width frame — the exact saving this pipeline exists for.
*/
const WIDTHS = [96, 320, 512, 900, 1280, 1600];

// Only raster photos. SVGs are already tiny and resolution-independent, and
// videos are the browser's problem, not ours.
const RASTER = /\.(png|jpe?g)$/i;

/*
  Every image under assets/, as a path relative to it ("/archive/x.png").

  Note what these paths are NOT: they're not URLs. Nothing is served from
  assets/. They're the same strings the markdown front matter uses, which makes
  them the keys the manifest and the loader both work in.
*/
async function collect(dir, base = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = `${base}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await collect(path.join(dir, entry.name), rel)));
    else if (RASTER.test(entry.name)) found.push(rel);
  }
  return found;
}

/*
  Skip files we've already done. Cheap mtime check: if every output is newer
  than its source, there's nothing to redo. Saves ~25s on every local rebuild.
  CI gets a fresh machine each time, so CI always does the full pass.
*/
async function isFresh(srcPath, outPaths) {
  try {
    const src = await stat(srcPath);
    for (const out of outPaths) {
      if ((await stat(out)).mtimeMs < src.mtimeMs) return false;
    }
    return true;
  } catch {
    return false; // an output is missing
  }
}

/*
  If the width ladder above has changed since the last run, every existing
  output is for the wrong set of widths. The old files wouldn't be overwritten
  (their names no longer come up) so they'd sit there being published forever.
  Simplest correct thing: throw the whole folder away and start again.
*/
const STAMP = path.join(OUT_DIR, ".widths");
const stamp = JSON.stringify(WIDTHS);
try {
  if ((await readFile(STAMP, "utf8")) !== stamp) throw new Error("ladder changed");
} catch {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(STAMP, stamp);
}

const sources = await collect(SRC_DIR);
const manifest = {};
let generated = 0;
let skipped = 0;

for (const rel of sources) {
  const srcPath = path.join(SRC_DIR, rel);
  const stem = rel.replace(RASTER, ""); // "/archive/design-ends"
  const outPaths = WIDTHS.map((w) => path.join(OUT_DIR, `${stem}-${w}.webp`));

  // The manifest needs the ORIGINAL dimensions, so read metadata either way.
  const { width, height } = await sharp(srcPath).metadata();
  manifest[rel] = { width, height };

  if (await isFresh(srcPath, outPaths)) {
    skipped += 1;
    continue;
  }

  await mkdir(path.dirname(outPaths[0]), { recursive: true });

  for (const [i, w] of WIDTHS.entries()) {
    /*
      `withoutEnlargement` caps at the original size, so a 1000px master asked
      for 1600px just stays 1000px. We still WRITE the 1600 filename, because
      the loader picks names arithmetically and can't know how big each master
      is. A few duplicate bytes in the build output is a fair price for never
      serving a 404.

      quality 78 is the sweet spot for this artwork: visually indistinguishable
      from the original at these sizes, roughly a tenth of the bytes.
    */
    await sharp(srcPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(outPaths[i]);
  }
  generated += 1;
}

await mkdir(path.dirname(MANIFEST), { recursive: true });
const json = `${JSON.stringify(manifest, null, 2)}\n`;

// Only rewrite the manifest when it actually changed, so a no-op build doesn't
// show up as a dirty file in git.
let previous = "";
try {
  previous = await readFile(MANIFEST, "utf8");
} catch {}
if (previous !== json) await writeFile(MANIFEST, json);

console.log(
  `optimize-images: ${generated} optimized, ${skipped} already current ` +
    `(${sources.length} images x ${WIDTHS.length} widths)`,
);
