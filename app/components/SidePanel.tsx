"use client";

/*
  SidePanel — the shared detail surface for the whole site.

  Used by WORK (case studies) and, later, ARCHIVE (project snippets). Rather
  than navigating to a new page, clicking an item slides its detail in over the
  current view:
    • desktop (md+) → a drawer from the RIGHT
    • mobile         → a BOTTOM SHEET sliding up

  Both come from the same element — only the transform axis changes per
  breakpoint (translate-x on desktop, translate-y on mobile).

  It's a "controlled" component: the PARENT owns whether it's open (a piece of
  state) and passes `open` + `onClose`. This component just renders the chrome
  (backdrop, panel, close button, scroll area) around whatever `children` it's
  given — so it knows nothing about cases or archive items, which is what makes
  it reusable.
*/

import { useEffect, useRef, useState } from "react";

export default function SidePanel({
  open,
  onClose,
  label,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  /*
    Opt a single opening into a roomier drawer. Some archive projects lead with
    a tall poster that wants to sit BESIDE the writing, and two columns inside
    the default 720px leaves ~300px each: too narrow to read the poster's
    annotations, too narrow for a comfortable line of text. Only kicks in at xl,
    where 1000px is still a drawer rather than the whole screen. Everything
    else — WORK, and archive projects without a poster — keeps the default,
    because widening a single column just stretches the text past a readable
    line length.
  */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /*
    Whether the content has been scrolled at all. The close control floats over
    the content rather than sitting in a header bar, so it needs to know when
    something has passed beneath it: at the top it's just a label on the panel's
    own background, and the moment content slides under it, it earns a glassy
    tag so it stays readable against whatever is there.
  */
  const [scrolled, setScrolled] = useState(false);

  // Side effects that only matter while the panel is OPEN: close on Escape,
  // lock background scroll, and move focus into the panel for keyboard/screen-
  // reader users. All undone on close (or unmount) via the cleanup return.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Freeze the page behind the panel so scrolling the sheet doesn't scroll
    // the page too. Remember the previous value to restore it exactly.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Send focus into the panel once it's open.
    panelRef.current?.focus();

    // Every opening starts at the top. Rewinding the scroll area also fires its
    // scroll handler, which is what puts the tag back to bare.
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    // The whole overlay stays mounted so it can animate both in AND out. When
    // closed it's pushed off-screen and made inert (pointer-events-none), so it
    // never intercepts clicks.
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop — dims + blurs the page. Click anywhere on it to close. */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/20 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel — bottom sheet on mobile, right drawer on desktop. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        /* rounded-t-card, not a raw Tailwind step: the sheet's top edge is the
           same corner as the cards it opens from, so it follows the same token
           and can't drift away from them. Desktop stays square, since that edge
           is flush against the side of the screen. */
        className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-card border-t border-border bg-bg shadow-2xl outline-none transition-transform duration-300 ease-out md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[640px] md:max-w-[92vw] md:rounded-none md:border-l md:border-t-0 lg:w-[720px] ${
          wide ? "xl:w-[1000px]" : ""
        } ${
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        {/*
          Close affordance. It FLOATS over the content (absolute) instead of
          living in a header row, because a row in normal flow needs its own
          opaque background, and that reads as a bar cutting across the top of
          the panel while you scroll. Floating it means the content runs
          uninterrupted to the panel's top edge, and the button carries its own
          backdrop only when it needs one. Right-aligned at every size: on the
          mobile sheet that's the top-right corner, on the desktop drawer it's
          the panel's outer edge, away from the left-aligned content.
        */}
        <button
          type="button"
          onClick={onClose}
          className={`kat-mono-xs absolute right-4 top-4 z-10 rounded-[6px] p-2 uppercase tracking-wider text-ink-mid transition-[background-color,border-color,color,backdrop-filter] duration-200 hover:text-ink md:right-8 md:top-5 ${
            scrolled
              ? "border border-border/40 bg-bg/60 backdrop-blur-md hover:bg-bg/80"
              : "border border-transparent hover:bg-surface"
          }`}
        >
          ✕ Close
        </button>

        {/* Scrollable content area. Generous padding for the archival feel. The
            top padding clears the floating close tag, so content starts below it
            at rest and only passes under it once you scroll. */}
        <div
          ref={scrollRef}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          className="grow overflow-y-auto px-6 pb-14 pt-14 md:px-10 md:pt-16"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
