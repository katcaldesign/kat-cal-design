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

import { useEffect, useRef } from "react";

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
        className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-bg shadow-2xl outline-none transition-transform duration-300 ease-out md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[640px] md:max-w-[92vw] md:rounded-none md:border-l md:border-t-0 lg:w-[720px] ${
          wide ? "xl:w-[1000px]" : ""
        } ${
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        {/* Header row with the close affordance. Right-aligned on mobile (the
            bottom sheet), left-aligned on desktop (the right drawer, so close is
            nearest the screen edge you reach for). In normal flow, not absolute,
            so it never overlaps the left-aligned content below. */}
        <div className="flex shrink-0 justify-end px-6 pt-5 md:justify-start md:px-10 md:pt-6">
          <button
            type="button"
            onClick={onClose}
            className="kat-mono-xs -mx-2 rounded-md px-2 py-1 uppercase tracking-wider text-ink-mid transition-colors hover:bg-surface hover:text-ink"
          >
            ✕ Close
          </button>
        </div>

        {/* Scrollable content area. Generous padding for the archival feel. */}
        <div className="grow overflow-y-auto px-6 pb-14 pt-4 md:px-10">{children}</div>
      </div>
    </div>
  );
}
