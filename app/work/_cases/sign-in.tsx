import { Fragment, type ReactNode } from "react";
import type { Case } from "../../../lib/work";
import LoopVideo from "../../components/LoopVideo";

/*
  Ffern sign-in — the case detail, rendered inside the WORK drawer.

  The case is carried by screen captures of the real component rather than a
  rebuild of it. That's deliberate: the details worth showing (the country
  picker, the validation, the way the submit control gains weight) are exactly
  the parts a simplified port would drop, and Ffern's own typefaces can't be
  served from this site. A clip of the real thing has neither problem.

  Clips are cut from a single screen recording by a script and cropped to one
  shared width, so the component sits at the same scale in every card. See
  public/work/.

  ── Why container queries rather than md: / lg: ──────────────────────────────
  This renders inside a drawer, not a page, so the space it gets has nothing to
  do with the width of the window. A viewport breakpoint would put the two
  column header side by side on any desktop screen, including when the drawer
  is only 640px wide and each column would be 31px. @container asks the DRAWER
  how wide it is instead, which is the only measurement that matters here.
*/

/*
  The label/value rows in the header.

  Org and Year are read off the case rather than written out here. The index in
  WorkCases.tsx already states both to build the card, and a fact kept in two
  places is a fact that will eventually disagree with itself.

  Tools stays local. It describes how THIS case was made, nothing else on the
  page uses it, and one case wanting a field is not enough to put it in the
  shared schema.
*/
const TOOLS = "Figma, React";

function metaRows(c: Case): [string, string][] {
  return [
    ["Org", c.org],
    ["Tools", TOOLS],
    ["Year", c.year],
  ];
}

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
  A single interaction: the clip, then what it shows.

  Two up from @lg (a 512px container) and never wider.

  That threshold is chosen against the drawer, not the window: the narrowest
  side drawer gives this 560px of content, and a phone's bottom sheet gives
  about 330px. So @lg falls cleanly between them, and the cards pair up in every
  drawer while still stacking to full width on a phone, where two 150px clips
  would be unreadable.

  Every clip is cropped to the same 880px width, so the component renders at an
  identical scale in each card no matter how tall the crop is. That's what stops
  four captures of the same product looking like four different products.
*/
function Interaction({
  src,
  width,
  height,
  title,
  note,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
  /* ReactNode, not string, so a note can set a term in <code>. A plain string
     would force the markup up into the caller as a second prop, or back down
     into a parser here — both to say one word is code. */
  note: ReactNode;
}) {
  return (
    <figure className="col-span-12 flex flex-col @lg:col-span-6">
      <div className="overflow-hidden rounded-card border border-border">
        <LoopVideo src={src} width={width} height={height} label={title} />
      </div>
      <figcaption className="mt-4">
        <h4 className="kat-mono-sm uppercase tracking-wider text-ink">{title}</h4>
        <p className="kat-body-md mt-2 text-ink-mid">{note}</p>
      </figcaption>
    </figure>
  );
}

export default function SignInCase({ c }: { c: Case }) {
  return (
    <article className="@container">
      {/*
        Header on the 12 column grid.

        Not a two-up split. The title is indented to column 3 and the writing
        runs from column 7 to column 10, so the row carries a two column margin
        on BOTH sides and the content sits symmetrically inside the grid rather
        than running out to the edges.
      */}
      <header className={GRID}>
        <h2 className="kat-body-xl col-span-12 font-medium text-balance text-ink @4xl:col-span-4 @4xl:col-start-3">
          Ffern sign-in component
        </h2>

        <div className="col-span-12 mt-6 @4xl:col-span-4 @4xl:col-start-7 @4xl:mt-0">
          <p className="kat-body-md text-ink-dark">
            {/*
              The underline does the work on its own, with no colour: the link
              sits in the body colour and darkens to full ink on hover. Same
              treatment as the inline links on the work index, so the site has
              one way of marking a link rather than two.
            */}
            <a
              href="https://ffern.co/login"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-ink"
            >
              Sign-in
            </a>{" "}
            for Ffern&rsquo;s member portal. A mobile number or email address, verified with a
            one-time passcode, into the member&rsquo;s Ledger account.
          </p>

          {/*
            Definition list rather than a table: these are label/value pairs, not
            tabular data, and a dl reads correctly to a screen reader.

            The label column is a fixed 5rem rather than a share of the grid.
            Subdividing the 12 columns here looked tidy on paper and read badly:
            this block is full width whenever the header stacks, so a label
            taking "two columns" of it became a 300px column with the value
            stranded a third of the way across the drawer. A label and its value
            are one phrase and belong next to each other, so the pair is set for
            reading and only the block containing it sits on the grid.

            Fixed rather than auto so the values stay put if a longer label is
            added later, instead of every row shifting to accommodate it.
          */}
          <dl className="mt-10 grid grid-cols-[5rem_1fr] gap-x-6 gap-y-3">
            {metaRows(c).map(([label, value]) => (
              <Fragment key={label}>
                <dt className="kat-body-md text-ink-light">{label}</dt>
                <dd className="kat-body-md text-ink">{value}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </header>

      {/*
        The whole flow.

        The video is held to its TRUE size rather than stretched to the column,
        and the panel around it carries the weight instead.

        The reason is the file's resolution: the clip carries the component at
        about 700 pixels across, so on a 2x screen it is pixel-exact at roughly
        350 CSS px and blurrier at every size above that. Filling the column
        would upscale it by half again, which reads as a low quality video when
        the file is actually clean.

        The source recording holds more than the published file does: the
        component is 1078 pixels across in it. Republishing at a higher
        resolution would let the panel go to max-w-xl and stay pixel-exact.
        Sharpness is the same either way; it only buys a larger, more readable
        frame, which is not what this panel is for.

        The panel is sand because the capture's own background IS sand, within a
        point per channel. The two surfaces meet invisibly, so the component
        appears to sit on the page rather than inside a video box, which is also
        what it looks like in the real product.
      */}
      <div className="mt-14 rounded-card border border-border bg-sand-50 px-6 py-12">
        <div className="mx-auto max-w-md">
          <LoopVideo
            src="/work/flow.mp4"
            width={880}
            height={720}
            label="The full sign-in flow, from mobile number to verified"
          />
        </div>
      </div>

      <section className="mt-16">
        <h3 className="kat-mono-sm uppercase tracking-wider text-ink-light">Detail</h3>

        <div className={`mt-8 items-start gap-y-14 ${GRID}`}>
          <Interaction
            src="/work/toggle.mp4"
            width={880}
            height={450}
            title="Mobile or email"
            note={
              <>
                Mobile and Email are both rendered (inactive one{" "}
                <code className="kat-code">display:none</code>), so switching modes preserves each
                flow&rsquo;s typed digits, errors and OTP state with no re-animation.
              </>
            }
          />
          <Interaction
            src="/work/number.mp4"
            width={880}
            height={450}
            title="Number validation"
            note="Country flag becomes visible only when user starts entering their mobile, to maintain an intial neutral aesthetic. On number validation submit button becomes active"
          />
          <Interaction
            src="/work/passcode.mp4"
            width={880}
            height={720}
            title="Passcode"
            note="Six native inputs with auto-advance, backspace-steps-back, arrow nav, and paste/iOS-autofill distribution."
          />

          {/* Taller crop than the other detail clips: the open menu is drawn by
              the OS, runs past the bottom of the recording, and can't be cut
              shorter without losing the thing the card is about. */}
          <Interaction
            src="/work/country.mp4"
            width={880}
            height={720}
            title="Country picker"
            note={
              <>
                A native <code className="kat-code">select</code> rather than a custom list, so it
                arrives with type-to-jump, keyboard nav and the platform&rsquo;s own menu. Dial code
                and number formatting follow the selected country.
              </>
            }
          />
        </div>
      </section>
    </article>
  );
}
