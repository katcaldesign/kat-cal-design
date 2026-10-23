"use client";

import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  COVER,
  setCoverParams,
  type CoverParams,
} from "../work/_cases/design-system-cover-params";

/*
  The DialKit panel and every dial on the site. Loaded only in development
  (see DevDials), so DialKit never reaches the live site.

  Each dial starts from the shipped value, so the panel opens on what
  visitors see. Ranges are [default, min, max, step].
*/
function RhizomeCoverDials() {
  const values = useDialKit("Rhizome cover", {
    pixel: {
      minBlock: [COVER.pixel.minBlock, 3, 12, 1],
      maxBlock: [COVER.pixel.maxBlock, 3, 16, 1],
      steps: [COVER.pixel.steps, 1, 6, 1],
      stepMs: [COVER.pixel.stepMs, 20, 300, 10],
      coverage: [COVER.pixel.coverage, 0.05, 0.9, 0.05],
      hold: COVER.pixel.hold,
    },
    lockup: {
      wordmarkWidth: [COVER.lockup.wordmarkWidth, 10, 50, 1],
      nameSize: [COVER.lockup.nameSize, 8, 30, 0.5],
      gap: [COVER.lockup.gap, 0, 10, 0.5],
    },
    tint: [COVER.tint, 0, 0.6, 0.05],
  }) as CoverParams;

  // JSON as the dependency so the cover only re-renders when a value moves,
  // not every time DialKit hands back a fresh object with the same numbers.
  const key = JSON.stringify(values);
  useEffect(() => {
    setCoverParams(JSON.parse(key));
  }, [key]);

  return null;
}

/*
  The panel's frame, with a drag handle.

  DialKit's own floating panel is pinned to a corner and its built-in drag
  didn't take in this layout, so it sat over the cards it was meant to be
  tuning. Instead DialKit renders inline, inside a frame this file owns:
  starts bottom-left over the sidebar, where it covers nav rather than work,
  and the grip bar on top drags it anywhere.

  Pointer capture keeps the drag going if the pointer outruns the bar.
  Position is kept to the viewport so the grip can't be lost off-screen.
*/
export default function DevDialsPanel() {
  const [pos, setPos] = useState({ x: 16, y: 16 }); // from bottom-left
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const r = frame.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: r.bottom - e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const r = frame.current!.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - drag.current.dx, 0), innerWidth - r.width);
    const y = Math.min(Math.max(innerHeight - e.clientY - drag.current.dy, 0), innerHeight - 28);
    setPos({ x, y });
  }

  function onUp() {
    drag.current = null;
  }

  return (
    <>
      <RhizomeCoverDials />
      <div
        ref={frame}
        className="fixed z-[100] w-[280px] overflow-hidden rounded-[10px] shadow-xl"
        style={{ left: pos.x, bottom: pos.y }}
      >
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="flex h-6 cursor-grab touch-none items-center justify-center bg-grey-700 active:cursor-grabbing"
          aria-label="Drag the dial panel"
        >
          <span className="h-1 w-8 rounded-full bg-grey-300" />
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <DialRoot mode="inline" />
        </div>
      </div>
    </>
  );
}
