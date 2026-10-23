"use client";

import { Spectral } from "next/font/google";
import type { CSSProperties } from "react";
import { COVER, type CoverParams } from "./design-system-cover-params";

/*
  Cover for the design system case: Ffern's summer 26 citrus loop, with the
  Ffern wordmark and the system's name, Rhizome, laid over it.

  The lockup is live type and SVG rather than baked into the animation, so it
  stays sharp at any card size while the footage underneath is only 380px
  wide, and the words can be changed without re-exporting anything.

  Spectral is Ffern's display serif and is on Google Fonts, so next/font
  self-hosts it like the site's own faces. It is loaded HERE rather than in
  the root layout because this card is the only thing that uses it, and a
  font loaded in the layout is preloaded on every page. Weight 300 only, which
  is the weight Ffern sets display type in.
*/
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300"],
  display: "swap",
});

/*
  The Ffern wordmark, inline so it takes `currentColor` from the lockup.
  Traced from ffern.co; aspect 370.51 x 119.39, never stretched.
*/
function FfernWordmark({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 370.51 119.39"
      fill="currentColor"
      aria-hidden
      style={style}
    >
      <path d="M48.52,117.83q-19.22-1-24.69-1.1-3.36,0-23.83,1.1v-7q10,0,11.92-4.37t1.91-14V27q0-7.19-2.38-10.15t-10.36-3v-7Q26.1,8,44.69,8q19,0,40.55-1.09.78,12,5.24,20.47l-6.33,3.2q-3.36-7.5-9.73-10.31T52.9,17.42q-6.49,0-18.76.47V56.8h12c6.15,0,10.36-.74,12.66-2.22s3.54-4.08,3.75-7.78l6.33.32Q67.67,58.76,67.66,65.4l.55,13.75-6.33.31V78.13q0-7.34-3.87-9.22T46.26,67H34.14V93.29q0,10.71,2,14.07t12.34,3.43Z" />
      <path d="M127.57,117.83q-14.22-.94-21.41-.94-5.94,0-20.32.94v-7q8.52,0,10.2-3.36t1.68-11.17V53.6l-12.81.47,5-11.88h7.81V31.88q0-14.07,10.24-23T130.22,0q7.51,0,12.43,3.28A10.07,10.07,0,0,1,147.57,12q-.78,8-10,12Q136.16,10,126.63,10,116,10.78,116,24.85V42.19l18.29-.94-3.6,13L116,53.6V96.11q.16,8.28,1.8,11.48t9.77,3.2Z" />
      <path d="M174,119.39q-16.49,0-26.92-10.47T136.65,81.57q0-17.34,10.94-29.14t29.62-11.8q25.86,0,32.81,32.11L157.2,84.93q0,7,6.45,15.28t18.79,8.24q13.29,0,22.74-12.74l5.39,4.22Q197.84,119.39,174,119.39ZM156.42,77.82l23.29-5.23Q190.8,70,190.8,62.66q0-14-15.16-14Q156.43,48.68,156.42,77.82Z" />
      <path d="M248.43,117.83q-6.87-.63-17.11-.63t-17,.63v-7q8.6,0,8.59-6.09V61.57q0-10.08-7.58-10.08V45.24a68.88,68.88,0,0,0,24.77-10.55L240,61q10.63-22.74,24.23-22.73,15.86,0,16.56,11.64,0,10.31-4.69,13.59-3.51-9.14-12.5-9.14-12.49.16-23.6,18V104.7q0,6.09,8.44,6.09Z" />
      <path d="M370.51,117.83q-7.42-.7-18.36-.71-12.66,0-20,.71v-7q9.3,0,9.54-6.48V68.84q-.09-16.19-13-16.18-7.2,0-15.79,4.61v47q0,6.48,9.14,6.48v7q-7.43-.7-18.36-.71-12.66,0-20,.71v-7q9.23,0,9.61-6.48V64.85Q292.92,54,284.79,54V47.74Q301.2,44.62,313,36.41l-.08,15.32q18.75-11.1,28.83-11.1a19.17,19.17,0,0,1,13.91,5.66q5.79,5.67,5.78,22.62v35.4q0,6.48,9.07,6.48Z" />
    </svg>
  );
}

/*
  The pixelation on hover, as SVG filters the lockup points at from CSS (see
  hoverCss below). A filter rather than swapping in a pre-pixelated image, so
  it works on the live type at whatever size the card is, and needs no extra
  files.

  How one filter works, for a block size n:
    1. feGaussianBlur spreads the type very slightly, so a thin stroke that
       passes near a sample point still registers there. Point sampling on
       its own dropped most of Spectral's hairlines and the word fell apart.
    2. feComponentTransfer snaps that soft edge back to hard: a point at
       least `coverage` covered becomes fully opaque, anything less becomes
       nothing. Without this the blocks came out part-transparent, which
       read as blur rather than as pixels.
    3. feFlood + feComposite + feTile lay a grid of single-pixel dots, one in
       the middle of every n x n block.
    4. feComposite "in" keeps the lockup only where it meets a dot.
    5. feMorphology "dilate" grows every dot back out to fill its block.
  What's left is the lockup on an n pixel grid, every block solid or empty.

  All the numbers come from COVER in design-system-cover-params.ts.
*/

// The block sizes the hover steps through, evenly spaced from minBlock to
// maxBlock and rounded to whole pixels, since a filter grid can't be fractional.
function blockSizes({ minBlock, maxBlock, steps }: CoverParams["pixel"]) {
  const lo = Math.min(minBlock, maxBlock);
  const hi = Math.max(minBlock, maxBlock);
  if (steps <= 1) return [hi];
  const sizes = Array.from({ length: steps }, (_, i) =>
    Math.round(lo + ((hi - lo) * i) / (steps - 1)),
  );
  return [...new Set(sizes)];
}

/*
  The alpha threshold as a lookup table. feFuncA "discrete" splits 0 to 1 into
  as many equal bands as the table has entries and gives each band its entry,
  so twenty entries lets `coverage` land within five percent of the value set.
*/
function thresholdTable(coverage: number) {
  const bands = 20;
  return Array.from({ length: bands }, (_, i) => (i / bands < coverage ? 0 : 1)).join(" ");
}

/*
  The hover, written out from the same sizes as the filters and kept in this
  file rather than globals.css. It used to live there, and when the sizes
  changed here the stylesheet went on pointing at a filter that no longer
  existed: the type pixelated for a moment, then landed on a missing filter
  and snapped back to sharp. Generated from one list, the two can't disagree.

  Each size is held for the same stepMs, so the build-up keeps an even
  rhythm, then the last size holds for as long as the pointer stays. Leaving
  the card snaps straight back to sharp type: reversing it would need an
  animation on the resting state, which would also play once on page load.

  Keyboard focus gets it too. Reduced motion skips the stepping and shows the
  end state, so the effect is still there, it just doesn't animate.
*/
function hoverCss(sizes: number[], { stepMs, hold }: CoverParams["pixel"]) {
  const last = sizes[sizes.length - 1];
  const on = hold
    ? ".rhizome-lockup"
    : ".group:is(:hover, :focus-visible) .rhizome-lockup";
  const frames = sizes
    .map((n, i) => `${((i / sizes.length) * 100).toFixed(2)}% { filter: url(#rhizome-px-${n}); }`)
    .join(" ");
  return `${on} { filter: url(#rhizome-px-${last}); }
@media (prefers-reduced-motion: no-preference) {
  ${on} { animation: rhizome-pixelate ${sizes.length * stepMs}ms steps(1, end) forwards; }
}
@keyframes rhizome-pixelate { ${frames} 100% { filter: url(#rhizome-px-${last}); } }`;
}

function PixelFilters({ pixel }: { pixel: CoverParams["pixel"] }) {
  const sizes = blockSizes(pixel);
  const table = thresholdTable(pixel.coverage);
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <style>{hoverCss(sizes, pixel)}</style>
      {sizes.map((n) => (
        <filter
          key={n}
          id={`rhizome-px-${n}`}
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation={n / 4} />
          <feComponentTransfer result="hard">
            <feFuncA type="discrete" tableValues={table} />
          </feComponentTransfer>
          <feFlood x={Math.floor(n / 2)} y={Math.floor(n / 2)} width="1" height="1" />
          <feComposite width={n} height={n} />
          <feTile result="grid" />
          <feComposite in="hard" in2="grid" operator="in" />
          <feMorphology operator="dilate" radius={Math.floor(n / 2)} />
        </filter>
      ))}
    </svg>
  );
}

export default function DesignSystemCover() {
  const p = COVER;

  return (
    /*
      No hover zoom on the frame, unlike the other covers. The footage stays
      still and only the lockup reacts (it pixelates, see PixelFilters), so
      the effect reads as something happening to the type rather than the
      whole card lurching.
    */
    <div className="absolute inset-0">
      <PixelFilters pixel={p.pixel} />
      {/*
        Animated WebP rather than the GIF it came from: same 104 frames at
        half the weight (1.9MB against 3.9MB), and full colour instead of
        GIF's 256. A plain <img>, not next/image, because the build's resizer
        would keep only the first frame.

        Anyone who has asked their system for reduced motion gets the first
        frame as a still, through <picture>, with no script involved.
      */}
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet="/work/design-system-cover-poster.jpg" />
        <img
          src="/work/design-system-cover.webp"
          alt=""
          width={380}
          height={506}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      {/*
        A warm ink wash, so pale type holds against both the cream ground and
        the bright fruit. Ink rather than black, at about a fifth, which calms
        the footage without turning it grey.
      */}
      <div aria-hidden className="absolute inset-0 bg-ink" style={{ opacity: p.tint }} />

      {/*
        The lockup, centred: wordmark above, the system's name below in
        Spectral. Sized in cqw (the card's own width, since the card is an
        @container) so the pair keeps its proportions from a phone to the
        desktop two-up.
      */}
      <div
        className="rhizome-lockup absolute inset-0 flex flex-col items-center justify-center text-sand-50"
        style={{ gap: `${p.lockup.gap}cqw` }}
      >
        <FfernWordmark style={{ width: `${p.lockup.wordmarkWidth}cqw` }} />
        <span
          className={`${spectral.className} leading-none tracking-[-0.02em]`}
          style={{ fontSize: `${p.lockup.nameSize}cqw` }}
        >
          rhizome
        </span>
      </div>
    </div>
  );
}
