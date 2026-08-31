/*
  image-loader — tells next/image where to find our pre-resized files.

  next/image's job is to pick a width for the current screen and then ask for
  the image at that width. Normally it asks a server to resize on demand. Here
  there is no server (GitHub Pages just serves files), so instead it asks THIS
  function, which points at a file `scripts/optimize-images.mjs` already wrote
  at build time.

      /archive/design-ends.jpg  @ 452px  ->  /_img/archive/design-ends-452.webp

  Deliberately arithmetic, with no lookups: this function is bundled into the
  browser, so it stays a string swap rather than shipping a table of filenames.
  The widths it can be handed are pinned by `imageSizes` + `deviceSizes` in
  next.config.ts, and the script generates exactly that set.
*/

export default function localImageLoader({ src, width }: { src: string; width: number }) {
  // SVGs are resolution-independent and never get optimized copies, so hand
  // them straight back untouched.
  if (!/\.(png|jpe?g)$/i.test(src)) return src;

  const stem = src.replace(/\.(png|jpe?g)$/i, "");
  return `/_img${stem}-${width}.webp`;
}
