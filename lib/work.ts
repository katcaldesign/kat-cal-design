/*
  Work — shared types (client-safe, NO filesystem access).

  Same job lib/archive.ts does for the archive: one place that says what a case
  IS, imported by both the index that lists them (app/components/WorkCases.tsx)
  and the bespoke detail files that render one (app/work/_cases/*).

  It exists so those two don't have to import each other. The index needs the
  detail components, and the details need the case's own facts, so without a
  neutral third file the two would point at each other in a circle.

  Only the TYPE lives here for now. The cases themselves are still an array in
  WorkCases.tsx rather than files in content/work/, because with one case
  published there isn't enough evidence yet to say which fields every case will
  want. When there are three, this is where the schema moves to and a loader
  alongside lib/archive-loader.ts reads them off disk.
*/

import type { ReactNode } from "react";

export type Case = {
  id: string;
  kicker: string; // "Strategy" / "Craft" — small overlay label on the card
  title: string;
  tags: string[]; // skill tags on the card (Katie will tune these)
  image?: string; // card art — placeholder until supplied
  // ── panel detail ──
  thesis: string; // one line
  role: string;
  org: string;
  year: string;
  artifactLabel: string; // placeholder until the real artifact is built
  moves: string[]; // 2–3 tight highlights
  /*
    A case that has been properly built out supplies its own body, rendered in
    the panel in place of the generic thesis/artifact/moves layout. Cases still
    being written leave it off and get the fallback, so the index never waits on
    every case being finished.

    It receives the whole case, so facts that belong to the case rather than to
    the layout (org, year) are read from here instead of being typed a second
    time inside the detail file.

    `wide` opens that case in the roomier drawer: a built-out case carries a
    grid and a row of clips, which the default 720px cannot lay out.
  */
  Detail?: (props: { c: Case }) => ReactNode;
  wide?: boolean;
  /*
    Kept out of the index while the case is still being written.

    A flag rather than deleting or commenting out the case: the copy is the
    thinking so far, and it should survive being hidden. Drop the line to put a
    case back on the page.
  */
  draft?: boolean;
};
