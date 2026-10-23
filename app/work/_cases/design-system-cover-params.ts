import { useSyncExternalStore } from "react";

/*
  Every setting behind the Rhizome cover, in one place.

  On the live site these are fixed: COVER is what ships. Run the site locally
  (npm run dev) and a DialKit panel appears in the corner with a slider for
  each one, so the effect can be tuned by eye. When a combination looks
  right, copy the numbers from the panel back into COVER.

  This file deliberately does NOT import DialKit. An earlier version did,
  behind a development-only switch, and the production build shipped all
  287KB of it to the WORK page anyway. Now the panel (app/components/
  DevDialsPanel.tsx, loaded only in development) is the only thing that
  imports DialKit, and it pushes its values in through the small store
  below. On the live site nothing ever writes to the store, so the cover
  just reads COVER.
*/
export const COVER = {
  pixel: {
    // Smallest and largest block, in CSS px. 3 is the floor: at 2 each cell
    // grows a 3px block, so neighbours overlap and the type smudges rather
    // than pixelates, which is what made the first step look out of place.
    minBlock: 3,
    maxBlock: 5,
    // How many sizes the hover steps through on the way to maxBlock.
    steps: 4,
    // How long each step is held, in ms, before the next.
    stepMs: 160,
    // How much of a block the type must cover for the block to fill. Lower
    // keeps thin strokes but reads heavier; higher reads lighter but starts
    // to drop hairlines.
    coverage: 0.25,
    // Hold the pixelated state without hovering, for tuning.
    hold: false,
  },
  lockup: {
    wordmarkWidth: 22, // cqw: share of the card's width
    nameSize: 17, // cqw
    gap: 3, // cqw, between wordmark and name
  },
  tint: 0.2, // ink wash over the footage, 0 to 1
};

export type CoverParams = typeof COVER;

// A store small enough to read at a glance: the current values, and who to
// tell when they change.
let current: CoverParams = COVER;
const listeners = new Set<() => void>();

export function setCoverParams(next: CoverParams) {
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useCoverParams() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => COVER,
  );
}
