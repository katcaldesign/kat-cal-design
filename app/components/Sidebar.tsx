"use client";

/*
  Sidebar — the shared left rail on every page (was Header, now vertical).

  WHY "use client"?
  -----------------
  Same reason the old header needed it: this component reads the current URL
  (usePathname) to mark the active page, and the copy-email button holds a tiny
  bit of state (did we just copy?). Both are browser-only powers. Everything
  else on the site stays server-rendered — we keep the directive on this one
  interactive piece.

  LAYOUT SHAPE
  ------------
  We render TWO things from the same NAV data:
    • a fixed left RAIL on desktop (md and up)
    • a compact TOP BAR on mobile (below md)
  One source of truth (the arrays below), two presentations. The full mobile
  treatment (drawer, the archive bottom-sheet) is a later step — this top bar is
  a clean placeholder so small screens are usable today.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CatLogo from "./CatLogo";

// The nav is just data — one array. Reorder/rename here and both the rail and
// the mobile bar update themselves. LABEL is what shows; HREF is the route
// (folder name under app/, so URL and label now match).
const NAV = [
  { href: "/", label: "home" },
  { href: "/info", label: "info" },
  { href: "/work", label: "work" },
  { href: "/archive", label: "archive" },
];

// Connect group at the base of the rail. External links open in a new tab; the
// email is a copy-to-clipboard button (defined below).
const LINKEDIN = "https://www.linkedin.com/in/katie-calvert/";
const GITHUB = "https://github.com/katcaldesign";
const EMAIL = "katiemcalvert@aol.com";

// ── A single nav row (the vertical version of the old NavLink) ──────────────
function NavRow({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`kat-mono-sm flex items-center justify-between rounded-md px-3 py-2 uppercase tracking-wider transition-colors ${
        active ? "bg-surface text-ink" : "text-ink-mid hover:bg-surface/60 hover:text-ink"
      }`}
    >
      <span>{label}</span>
      {/* The chartreuse active-dot — always rendered, fades in only when active
          so rows never shift. Same trick as the old top bar. */}
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full bg-accent transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </Link>
  );
}

// ── An external link row (LinkedIn / GitHub) with a ↗ affordance ────────────
function ExternalRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="kat-mono-sm flex items-center justify-between rounded-md px-3 py-2 uppercase tracking-wider text-ink-mid transition-colors hover:bg-surface/60 hover:text-ink"
    >
      <span>{label}</span>
      <span aria-hidden className="text-ink-light">
        ↗
      </span>
    </a>
  );
}

// ── The copy-email button — click to copy, shows "copied" for a beat ────────
function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      // Reset the label after a moment. (No cleanup needed for this short-lived
      // timer — worst case it fires after unmount and setState is a no-op.)
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure context, denied permission). Fail
      // quietly — the address is still visible on hover via the title attr.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={email}
      className="kat-mono-sm flex w-full items-center justify-between rounded-md px-3 py-2 uppercase tracking-wider text-ink-mid transition-colors hover:bg-surface/60 hover:text-ink"
    >
      <span>email</span>
      <span aria-hidden className="kat-mono-xs text-ink-light">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  // Compute active state once, reuse in both the rail and the mobile bar.
  // "/" must match exactly; the others also match their sub-pages.
  const nav = NAV.map((item) => ({
    ...item,
    active: item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  }));

  return (
    <>
      {/* ── DESKTOP RAIL (md and up) ─────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-bg px-4 py-6 md:flex">
        {/* Identity — cat logo (64px, brand spec) stacked above the wordmark so
            it sits comfortably in the narrow rail. cat-logo-trigger drives the
            glasses animation defined in globals.css. */}
        <Link href="/" className="cat-logo-trigger flex flex-col items-start gap-2 px-3">
          <CatLogo className="h-16 w-16" />
          <span className="kat-body-xl font-medium text-ink">kat calvert</span>
        </Link>

        <nav className="mt-10 flex flex-col gap-1">
          {nav.map((item) => (
            <NavRow key={item.href} {...item} />
          ))}
        </nav>

        {/* Spacer — pushes the Connect group to the base of the rail. */}
        <div className="grow" />

        <div className="flex flex-col gap-1">
          <span className="kat-mono-xs px-3 pb-1 uppercase tracking-wider text-ink-light">
            connect
          </span>
          <ExternalRow href={LINKEDIN} label="linkedin" />
          <ExternalRow href={GITHUB} label="github" />
          <CopyEmail email={EMAIL} />
        </div>

        <span className="kat-mono-xs mt-6 px-3 uppercase tracking-wider text-ink-light">
          © {new Date().getFullYear()} kat calvert
        </span>
      </aside>

      {/* ── MOBILE TOP BAR (below md) ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/80 px-5 py-3 backdrop-blur-md md:hidden">
        <Link href="/" className="cat-logo-trigger flex items-center gap-2">
          <CatLogo className="h-8 w-8" />
          <span className="kat-body-lg font-medium text-ink">kat calvert</span>
        </Link>
        <nav className="flex items-center gap-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`kat-mono-xs uppercase tracking-wider transition-colors ${
                item.active ? "text-ink" : "text-ink-mid hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
