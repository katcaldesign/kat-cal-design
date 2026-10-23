import { Fragment, type ReactNode } from "react";
import type { Case } from "../../../lib/work";
import LoopVideo from "../../components/LoopVideo";

/*
  case-layout: the shape every WORK case detail is poured into.

  The sign-in case was built first and set the format: a header on a 12 column
  grid, one hero panel showing the whole thing, a rule, then a grid of
  close-ups. Every case follows it unless Katie says otherwise, so the format
  lives here rather than being copied into each case file. A case file supplies
  words and clips; this file decides where they sit.

  That's the difference between a house style and a habit. Copied layout
  drifts. One case gets a tweak, the next one doesn't, and six months later
  there are three formats. Shared layout can't: a change here moves every case
  at once.

  ── Why container queries rather than md: / lg: ──────────────────────────────
  These render inside a drawer, not a page, so the space they get has nothing
  to do with the width of the window. A viewport breakpoint would put the two
  column header side by side on any desktop screen, including when the drawer
  is only 640px wide and each column would be 31px. @container asks the DRAWER
  how wide it is instead, which is the only measurement that matters here.
*/

/*
  The grid: 12 columns, 24px gutters.

  Every horizontal position comes from here rather than from each section
  inventing its own split, which is what keeps the header, the meta list and the
  cards on one rhythm instead of three that nearly agree.

  Vertical spacing is deliberately NOT part of it. A single gap-y would force the
  same distance between the header and the hero as between two cards, so sections
  set their own top margin and only the columns are shared.
*/
const GRID = "grid grid-cols-12 gap-x-6";

/*
  The outer element. It carries @container, which is what every @lg / @4xl
  inside is measured against, so a case that forgets it would silently lay
  itself out against the window instead of the drawer.
*/
export function CaseArticle({ children }: { children: ReactNode }) {
  return <article className="@container">{children}</article>;
}

/*
  Header on the 12 column grid.

  Not a two-up split. Read across the 12 columns it is 4, 1, 5, 2: a four
  column title from column 1, a single column of air, five columns of writing,
  and a two column margin held at the right edge.

  The title starts at column 1 so it shares a left edge with the hero panel and
  the detail cards below, which is what reads as one page; indenting it made it
  look like a separate block that had drifted.

  The gap is one column rather than two because the writing needs the width
  more than the two blocks need separating: a single column of air is already
  past the point where the eye reads them as one paragraph, and the column it
  gives back buys the prose a longer measure.

  The title, org and year are read off the case rather than written out in the
  case file. The index in WorkCases.tsx already states all three to build the
  card, and a fact kept in two places is a fact that will eventually disagree
  with itself.

  `tools` is passed in because it describes how ONE case was made. Nothing else
  on the site uses it, and one case wanting a field is not enough to put it in
  the shared schema.
*/
export function CaseHeader({
  c,
  tools,
  children,
}: {
  c: Case;
  tools: string;
  children: ReactNode;
}) {
  const rows: [string, string][] = [
    ["Org", c.org],
    ["Tools", tools],
    ["Year", c.year],
  ];

  return (
    <header className={GRID}>
      <h2 className="kat-body-xl col-span-12 font-medium text-balance text-ink @4xl:col-span-4">
        {c.title}
      </h2>

      <div className="col-span-12 mt-6 @4xl:col-span-5 @4xl:col-start-6 @4xl:mt-0">
        <p className="kat-body-md text-ink-dark">{children}</p>

        {/*
          Definition list rather than a table: these are label/value pairs, not
          tabular data, and a dl reads correctly to a screen reader.

          The label column is a fixed 5rem rather than a share of the grid.
          Subdividing the 12 columns here looked tidy on paper and read badly:
          this block is full width whenever the header stacks, so a label taking
          "two columns" of it became a 300px column with the value stranded a
          third of the way across the drawer. A label and its value are one
          phrase and belong next to each other, so the pair is set for reading
          and only the block containing it sits on the grid.

          Fixed rather than auto so the values stay put if a longer label is
          added later, instead of every row shifting to accommodate it.
        */}
        <dl className="mt-10 grid grid-cols-[5rem_1fr] gap-x-6 gap-y-3">
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="kat-body-md text-ink-light">{label}</dt>
              <dd className="kat-body-md text-ink">{value}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </header>
  );
}

/*
  The hero: the whole thing, working, before any close-ups.

  The clip is held to its TRUE size rather than stretched to the column, and
  the panel around it carries the weight instead.

  The reason is fixed by the recording and can't be designed around: sign-in
  was captured at 699 pixels across, so on a 2x screen it is pixel-exact at
  about 350 CSS px and blurrier at every size above that. Filling the column
  would upscale it by half again, which reads as a low quality video when the
  file is actually clean.

  The panel is sand because the captures' own background IS sand, within a
  point per channel. The two surfaces meet invisibly, so the component appears
  to sit on the page rather than inside a video box, which is also what it
  looks like in the real product.
*/
export function CaseHero({
  src,
  width,
  height,
  label,
}: {
  /* Optional so a case can be published while its recording is still to come:
     the panel holds the exact space the clip will take, rather than the case
     having to wait for footage or fake it with a screenshot. */
  src?: string;
  width: number;
  height: number;
  label: string;
}) {
  return (
    <div className="mt-14 rounded-card border border-border bg-sand-50 px-6 py-12">
      <div className="mx-auto max-w-md">
        {src ? (
          <LoopVideo src={src} width={width} height={height} label={label} />
        ) : (
          <PendingClip width={width} height={height} label={label} />
        )}
      </div>
    </div>
  );
}

/*
  The close-ups: a rule, then the cards.

  A rule rather than a "Detail" heading. The cards below announce themselves,
  so the label was naming a section nobody needed named. The line still does
  the one useful job the heading did, which is separating the hero above from
  the close-ups below.
*/
export function CaseDetails({ children }: { children: ReactNode }) {
  return (
    <section className="mt-16">
      <hr className="border-0 border-t border-border" />
      <div className={`mt-12 items-start gap-y-14 ${GRID}`}>{children}</div>
    </section>
  );
}

/*
  A single interaction: the clip, then what it shows.

  Two up from @lg (a 512px container) and never wider.

  That threshold is chosen against the drawer, not the window: the narrowest
  side drawer gives this 560px of content, and a phone's bottom sheet gives
  about 330px. So @lg falls cleanly between them, and the cards pair up in every
  drawer while still stacking to full width on a phone, where two 150px clips
  would be unreadable.

  Crop every clip in a set to the same width, so the component renders at an
  identical scale in each card no matter how tall the crop is. That's what stops
  four captures of the same product looking like four different products.
*/
export function Interaction({
  src,
  width,
  height,
  title,
  note,
}: {
  src?: string; // see CaseHero: a case can be published ahead of its footage
  width: number;
  height: number;
  title: string;
  /* ReactNode, not string, so a note can set a term in <code>. A plain string
     would force the markup up into the caller as a second prop, or back down
     into a parser here, both to say one word is code. */
  note: ReactNode;
}) {
  return (
    <figure className="col-span-12 flex flex-col @lg:col-span-6">
      <div className="overflow-hidden rounded-card border border-border">
        {src ? (
          <LoopVideo src={src} width={width} height={height} label={title} />
        ) : (
          <PendingClip width={width} height={height} label={title} />
        )}
      </div>
      <figcaption className="mt-4">
        <h4 className="kat-mono-sm uppercase tracking-wider text-ink">{title}</h4>
        <p className="kat-body-md mt-2 text-ink-mid">{note}</p>
      </figcaption>
    </figure>
  );
}

/*
  The space a clip will occupy, before there is a clip.

  Sized by the SAME width/height the real recording will use, via aspect-ratio,
  so the layout the case is being designed against is the layout it ends up
  with. Dropping the file in changes what's in the box, not where the box is.

  Dashed and labelled rather than a grey block: it should read as deliberately
  unfinished to anyone who lands on the page mid-build, including Katie six
  weeks from now wondering which clips she still owes.
*/
function PendingClip({
  width,
  height,
  label,
}: {
  width: number;
  height: number;
  label: string;
}) {
  return (
    <div
      style={{ aspectRatio: `${width} / ${height}` }}
      className="flex w-full items-center justify-center rounded-card border border-dashed border-border-dark bg-surface px-6 text-center"
    >
      <span className="kat-mono-xs uppercase tracking-wider text-ink-light">{label}</span>
    </div>
  );
}
