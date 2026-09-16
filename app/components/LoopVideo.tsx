"use client";

/*
  LoopVideo — a short, silent screen capture that plays itself.

  Used by the WORK case studies to show an interaction rather than describe it.
  Reads like a GIF and costs a twentieth of the bytes: GIF is capped at 256
  colours, which bands visibly across Ffern's sand background, and a five second
  clip that runs to several megabytes as a GIF is a couple of hundred kilobytes
  as H.264.

  Two behaviours worth knowing about, both of which need JS and are why this is
  a client component rather than a bare <video> tag:

  • PLAY ONLY WHEN VISIBLE. A case study holds several of these. Leaving them
    all running means the page is decoding four videos at once, most of them
    off screen, for the whole visit. An IntersectionObserver starts each clip
    when it scrolls in and pauses it when it leaves.

  • RESPECT REDUCED MOTION. Someone who has asked their system for less motion
    should not be handed a page of looping video. CSS can't stop playback, so
    the check has to happen here: when the preference is set nothing autoplays
    and the native controls appear instead, so the clip is still reachable, just
    on purpose rather than by default.
*/

import { useEffect, useRef, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/*
  Read the reduced-motion preference as what it actually is: a value living
  outside React that can change under us. useSyncExternalStore is the hook built
  for exactly that, and it keeps the read out of an effect, so there's no render
  pass where we've assumed the wrong answer.

  The server snapshot is `false` because there's no media query to ask during a
  static export. The client corrects it on hydration, before anything has had a
  chance to play.
*/
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export default function LoopVideo({
  src,
  width,
  height,
  label,
  className = "",
}: {
  src: string;
  /*
    The clip's real pixel dimensions. Passed through to the <video> element so
    the browser knows the aspect ratio before a single byte arrives and can
    reserve the right box, rather than collapsing to nothing and shoving the
    page down when the video loads.
  */
  width: number;
  height: number;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() rejects if the browser blocks autoplay. Nothing to recover
          // from and nothing worth logging, so swallow it: the clip simply
          // sits on its first frame.
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.2 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <video
      ref={ref}
      src={src}
      width={width}
      height={height}
      loop
      muted
      playsInline
      preload="metadata"
      controls={reducedMotion}
      aria-label={label}
      className={`block h-auto w-full bg-sand-50 ${className}`}
    />
  );
}
