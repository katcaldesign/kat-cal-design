/*
  Every setting behind the Rhizome cover, in one place. Change a number here
  and the cover on the WORK page follows.
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
