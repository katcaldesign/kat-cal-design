import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — generates plain HTML/CSS/JS into `out/`, which is what
  // GitHub Pages serves. (Pages can't run a Node server.)
  output: "export",

  /*
    IMAGES — resized at build time rather than on demand.

    next/image's built-in optimizer needs a running server, which Pages doesn't
    give us. A CUSTOM LOADER is the documented way round that: we pre-generate
    every size we need during the build (scripts/optimize-images.mjs) and the
    loader just points next/image at the right file (image-loader.ts).

    We keep everything next/image is actually good at — srcset so phones fetch
    phone-sized files, lazy loading below the fold, reserved space so nothing
    jumps — without needing a server at request time.
  */
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",

    /*
      The ONLY widths next/image may request. These must stay in step with
      WIDTHS in scripts/optimize-images.mjs, since the loader turns each one
      into a filename and an unlisted width would 404.

      `imageSizes` is for images that declare a `sizes` narrower than the
      viewport (tiles, logos); `deviceSizes` is for full-width ones. Next
      requires every imageSize to be smaller than the smallest deviceSize.

      One non-obvious thing, because it bit us while tuning this ladder: the
      SMALLEST deviceSize is not just a size, it's a floor. For any image whose
      `sizes` mentions a vw unit, Next offers only the widths at or above
      `deviceSizes[0] x (smallest vw in the sizes prop)`. So dropping the lowest
      deviceSize doesn't just remove that option, it raises the floor for every
      viewport-relative image on the site and can silently push phones onto much
      larger files. Check what the srcsets actually contain before cutting one.
    */
    imageSizes: [96, 320, 512],
    deviceSizes: [900, 1280, 1600],
  },
};

export default nextConfig;
